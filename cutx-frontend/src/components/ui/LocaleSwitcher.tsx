'use client';

import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useUnits, type UnitSystem } from '@/hooks/useUnits';
import { usePreferenceSync } from '@/components/providers/PreferencesProvider';

/**
 * LocaleSwitcher - Language and unit system selector
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const { unit, setUnit } = useUnits();
  const { syncLocale, syncUnit } = usePreferenceSync();

  const switchLocale = (newLocale: 'fr' | 'en') => {
    if (newLocale === locale) return;
    syncLocale(newLocale);
    // Force full page navigation to avoid client-side routing issues
    window.location.href = `/${newLocale}${pathname}`;
  };

  const switchUnit = (newUnit: UnitSystem) => {
    syncUnit(newUnit);
    setUnit(newUnit);
  };

  const groupClass = "flex items-center gap-0.5 p-[3px] bg-[var(--cx-surface-2)] border border-[var(--cx-border-default)] rounded-md";
  const btnBase = "px-2 py-1 text-xs font-medium rounded-sm cursor-pointer transition-all";
  const btnInactive = "text-[var(--cx-text-muted)] hover:text-[#d4d0c8] bg-transparent border-none";
  const btnActive = "bg-[var(--cx-surface-3)] text-[#e8e4dc] border-none";

  return (
    <div className="flex items-center gap-3">
      {/* Language Toggle */}
      <div className={groupClass}>
        <button
          onClick={() => switchLocale('fr')}
          className={`${btnBase} ${locale === 'fr' ? btnActive : btnInactive}`}
        >
          Fr
        </button>
        <button
          onClick={() => switchLocale('en')}
          className={`${btnBase} ${locale === 'en' ? btnActive : btnInactive}`}
        >
          En
        </button>
      </div>

      {/* Unit Toggle */}
      <div className={groupClass}>
        <button
          onClick={() => switchUnit('mm')}
          className={`${btnBase} ${unit === 'mm' ? btnActive : btnInactive}`}
        >
          mm
        </button>
        <button
          onClick={() => switchUnit('in')}
          className={`${btnBase} ${unit === 'in' ? btnActive : btnInactive}`}
        >
          in
        </button>
      </div>
    </div>
  );
}

export default LocaleSwitcher;
