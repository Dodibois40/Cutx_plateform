'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback } from 'react';

/**
 * User preferences stored in Clerk metadata
 */
export interface UserPreferences {
  locale: 'fr' | 'en';
  unit: 'mm' | 'in';
}

/**
 * Hook for synchronizing user preferences with Clerk metadata
 *
 * For logged-in users, preferences are stored in Clerk's unsafeMetadata
 * allowing cross-device synchronization.
 *
 * @returns Functions to save and load preferences from Clerk
 */
export function useSyncPreferences() {
  const { user, isLoaded, isSignedIn } = useUser();

  /**
   * Save preferences to Clerk metadata
   * Merges with existing preferences to allow partial updates
   */
  const saveToClerk = useCallback(
    async (prefs: Partial<UserPreferences>) => {
      if (!user || !isSignedIn) return;

      try {
        const currentPrefs =
          (user.unsafeMetadata?.preferences as UserPreferences) || {};

        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            preferences: {
              ...currentPrefs,
              ...prefs,
            },
          },
        });
      } catch (error) {
        console.error('[clerk-preferences] Failed to save preferences:', error);
      }
    },
    [user, isSignedIn]
  );

  /**
   * Load preferences from Clerk metadata
   * Returns null if user is not logged in or preferences don't exist
   */
  const loadFromClerk = useCallback((): UserPreferences | null => {
    if (!user || !isSignedIn) return null;

    const prefs = user.unsafeMetadata?.preferences as
      | UserPreferences
      | undefined;

    if (!prefs) return null;

    // Validate the preferences structure
    const validLocales = ['fr', 'en'];
    const validUnits = ['mm', 'in'];

    if (prefs.locale && !validLocales.includes(prefs.locale)) {
      return null;
    }

    if (prefs.unit && !validUnits.includes(prefs.unit)) {
      return null;
    }

    return prefs;
  }, [user, isSignedIn]);

  return {
    saveToClerk,
    loadFromClerk,
    isLoaded,
    isSignedIn: isSignedIn ?? false,
  };
}
