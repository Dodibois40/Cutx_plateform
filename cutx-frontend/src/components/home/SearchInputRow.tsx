'use client';

import { forwardRef } from 'react';
import { Search, X, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SearchInputRowProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClear: () => void;
  onFocus: () => void;
  onBlur: (e: React.FocusEvent) => void;
  isSearching: boolean;
  size: 'compact' | 'full';
}

const SearchInputRow = forwardRef<HTMLInputElement, SearchInputRowProps>(
  ({ value, onChange, onKeyDown, onClear, onFocus, onBlur, isSearching, size }, ref) => {
    const t = useTranslations('home');
    const isCompact = size === 'compact';

    return (
      <div className={`flex items-center ${isCompact ? 'h-12' : 'h-20 px-6'}`}>
        <div className={`flex items-center justify-center ${isCompact ? 'w-12' : 'w-10'}`}>
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-[var(--cx-text-muted)] animate-spin" aria-hidden="true" />
          ) : (
            <Search className="w-5 h-5 text-[var(--cx-text-muted)]" aria-hidden="true" />
          )}
        </div>
        <input
          ref={ref}
          type="search"
          role="searchbox"
          aria-label={t('search.placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={t('search.placeholder')}
          className={`flex-1 bg-transparent border-none outline-none text-[var(--cx-text)] placeholder:text-[var(--cx-text-muted)] ${isCompact ? 'text-base' : 'text-lg'}`}
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button
            onClick={onClear}
            aria-label="Effacer la recherche"
            className="flex items-center justify-center w-10 h-10 text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <Sparkles
          className={`text-[var(--cx-text-muted)] ${isCompact ? 'mr-4 w-5 h-5' : 'w-6 h-6'}`}
          aria-hidden="true"
        />
      </div>
    );
  }
);

SearchInputRow.displayName = 'SearchInputRow';

export default SearchInputRow;
