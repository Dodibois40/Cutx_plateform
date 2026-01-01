'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useUnits, type UnitSystem } from '@/hooks/useUnits';
import { usePreferenceSync } from '@/components/providers/PreferencesProvider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Ruler } from 'lucide-react';

/**
 * LocaleSwitcher - Language and unit system selector
 *
 * Provides two dropdown selects:
 * 1. Language selector (FR/EN) - updates URL locale
 * 2. Unit selector (mm/inch) - persisted to localStorage
 *
 * For logged-in users, preferences are also synced to Clerk metadata
 * for cross-device synchronization.
 *
 * Designed for integration in the header area.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { unit, setUnit } = useUnits();
  const { syncLocale, syncUnit } = usePreferenceSync();

  /**
   * Switch locale by navigating to the same path with new locale
   * Also saves to Clerk for logged-in users
   */
  const switchLocale = (newLocale: string) => {
    const typedLocale = newLocale as 'fr' | 'en';
    // Save to Clerk in background (async, non-blocking)
    syncLocale(typedLocale);
    // useRouter and usePathname from @/i18n/routing handle locale automatically
    router.replace(pathname, { locale: typedLocale });
  };

  /**
   * Switch unit system
   * Also saves to Clerk for logged-in users
   */
  const switchUnit = (newUnit: string) => {
    const typedUnit = newUnit as UnitSystem;
    // Save to Clerk in background (async, non-blocking)
    syncUnit(typedUnit);
    // Update local state
    setUnit(typedUnit);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Language Selector */}
      <Select value={locale} onValueChange={switchLocale}>
        <SelectTrigger className="w-[90px] h-8 bg-transparent border-[var(--cx-border-subtle)] hover:border-[var(--cx-border-default)]">
          <Globe className="h-4 w-4 mr-1 text-[var(--cx-text-muted)]" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fr">FR</SelectItem>
          <SelectItem value="en">EN</SelectItem>
        </SelectContent>
      </Select>

      {/* Unit Selector */}
      <Select value={unit} onValueChange={switchUnit}>
        <SelectTrigger className="w-[80px] h-8 bg-transparent border-[var(--cx-border-subtle)] hover:border-[var(--cx-border-default)]">
          <Ruler className="h-4 w-4 mr-1 text-[var(--cx-text-muted)]" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mm">mm</SelectItem>
          <SelectItem value="in">inch</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default LocaleSwitcher;
