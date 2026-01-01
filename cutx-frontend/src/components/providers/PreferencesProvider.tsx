'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useUnits, type UnitSystem } from '@/hooks/useUnits';
import {
  useSyncPreferences,
  type UserPreferences,
} from '@/lib/clerk-preferences';

interface PreferencesProviderProps {
  children: React.ReactNode;
}

/**
 * PreferencesProvider - Synchronizes user preferences with Clerk
 *
 * Behavior:
 * - Anonymous users: Uses only cookie/localStorage (handled by next-intl and useUnits)
 * - Logged-in users: Loads preferences from Clerk on login, syncs changes back
 *
 * On login:
 * - If Clerk has saved preferences, they override local preferences
 * - If saved locale differs from current, user is redirected
 *
 * On preference change:
 * - Changes are saved to Clerk in background (debounced)
 */
export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const currentLocale = useLocale() as 'fr' | 'en';
  const router = useRouter();
  const pathname = usePathname();
  const { unit, setUnit } = useUnits();
  const { saveToClerk, loadFromClerk, isLoaded, isSignedIn } =
    useSyncPreferences();

  // Track if we've already synced preferences on login
  const hasSyncedRef = useRef(false);
  // Track previous sign-in state to detect login events
  const wasSignedInRef = useRef<boolean | null>(null);

  /**
   * Load preferences from Clerk when user logs in
   */
  useEffect(() => {
    if (!isLoaded) return;

    // Detect login event (transition from not signed in to signed in)
    const justLoggedIn =
      wasSignedInRef.current === false && isSignedIn === true;
    wasSignedInRef.current = isSignedIn;

    // Only sync once per session or on fresh login
    if (isSignedIn && (justLoggedIn || !hasSyncedRef.current)) {
      const clerkPrefs = loadFromClerk();

      if (clerkPrefs) {
        hasSyncedRef.current = true;

        // Sync unit preference
        if (clerkPrefs.unit && clerkPrefs.unit !== unit) {
          setUnit(clerkPrefs.unit);
        }

        // Redirect to saved locale if different from current
        if (clerkPrefs.locale && clerkPrefs.locale !== currentLocale) {
          router.replace(pathname, { locale: clerkPrefs.locale });
        }
      } else {
        // User is logged in but has no saved preferences
        // Save current preferences to Clerk for future syncs
        saveToClerk({ locale: currentLocale, unit });
        hasSyncedRef.current = true;
      }
    }

    // Reset sync flag on logout
    if (!isSignedIn) {
      hasSyncedRef.current = false;
    }
  }, [
    isLoaded,
    isSignedIn,
    loadFromClerk,
    saveToClerk,
    currentLocale,
    unit,
    setUnit,
    router,
    pathname,
  ]);

  return <>{children}</>;
}

/**
 * Hook to save preferences to Clerk when they change
 * Used by LocaleSwitcher and other preference-changing components
 */
export function usePreferenceSync() {
  const { saveToClerk, isSignedIn } = useSyncPreferences();
  const currentLocale = useLocale() as 'fr' | 'en';
  const { unit } = useUnits();

  /**
   * Save locale preference to Clerk
   */
  const syncLocale = useCallback(
    (locale: 'fr' | 'en') => {
      if (isSignedIn) {
        saveToClerk({ locale });
      }
    },
    [isSignedIn, saveToClerk]
  );

  /**
   * Save unit preference to Clerk
   */
  const syncUnit = useCallback(
    (newUnit: UnitSystem) => {
      if (isSignedIn) {
        saveToClerk({ unit: newUnit });
      }
    },
    [isSignedIn, saveToClerk]
  );

  /**
   * Save all current preferences to Clerk
   */
  const syncAll = useCallback(() => {
    if (isSignedIn) {
      saveToClerk({ locale: currentLocale, unit });
    }
  }, [isSignedIn, saveToClerk, currentLocale, unit]);

  return {
    syncLocale,
    syncUnit,
    syncAll,
    isSignedIn,
  };
}

export default PreferencesProvider;
