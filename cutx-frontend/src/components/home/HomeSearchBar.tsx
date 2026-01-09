'use client';

import { useRef, useEffect, useState } from 'react';
import { Search, X, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface HomeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  isCompact?: boolean;
  autoFocus?: boolean;
}

export default function HomeSearchBar({
  value,
  onChange,
  onSearch,
  isSearching,
  isCompact = false,
  autoFocus = false,
}: HomeSearchBarProps) {
  const t = useTranslations('home');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const shouldMaintainFocusRef = useRef(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Maintain focus while typing - restore focus after search results update
  useEffect(() => {
    if (shouldMaintainFocusRef.current && inputRef.current) {
      // Use requestAnimationFrame to ensure DOM has settled
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isSearching]);

  // Global keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim().length >= 2) {
      onSearch();
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  // Compact mode (after search)
  if (isCompact) {
    return (
      <div className="relative w-full max-w-2xl">
        <div
          className={`relative flex items-center h-12 bg-[var(--cx-surface-1)] rounded-full overflow-hidden border transition-all duration-200 ${isFocused ? 'border-[var(--cx-border-strong)] shadow-lg shadow-black/30' : 'border-[var(--cx-border)] shadow-md shadow-black/20'}`}
        >
          <div className="flex items-center justify-center w-12">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-[var(--cx-text-muted)] animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-[var(--cx-text-muted)]" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { setIsFocused(true); shouldMaintainFocusRef.current = true; }}
            onBlur={() => { setIsFocused(false); setTimeout(() => { shouldMaintainFocusRef.current = false; }, 100); }}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent border-none outline-none text-[var(--cx-text)] placeholder:text-[var(--cx-text-muted)] text-base"
            autoComplete="off"
            spellCheck={false}
          />
          {value && (
            <button
              onClick={handleClear}
              className="flex items-center justify-center w-10 h-10 text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <Sparkles className="mr-4 w-5 h-5 text-[var(--cx-text-muted)]" />
        </div>
      </div>
    );
  }

  // Full mode (landing page)
  return (
    <div className="relative w-full max-w-2xl">
      <div
        data-onboarding="search-bar"
        className={`relative flex items-center h-16 bg-[var(--cx-surface-1)] rounded-full overflow-hidden border transition-all duration-200 ${
          isFocused
            ? 'border-[var(--cx-border-strong)] shadow-lg shadow-black/30'
            : 'border-[var(--cx-border)] shadow-md shadow-black/20'
        }`}
      >
        <div className="flex items-center justify-center w-14">
          {isSearching ? (
            <Loader2 className="w-6 h-6 text-[var(--cx-text-muted)] animate-spin" />
          ) : (
            <Search className="w-6 h-6 text-[var(--cx-text-muted)]" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setIsFocused(true); shouldMaintainFocusRef.current = true; }}
          onBlur={() => { setIsFocused(false); setTimeout(() => { shouldMaintainFocusRef.current = false; }, 100); }}
          placeholder={t('search.placeholder')}
          className="flex-1 bg-transparent border-none outline-none text-[var(--cx-text)] placeholder:text-[var(--cx-text-muted)] text-lg"
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center w-10 h-10 text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <Sparkles className="mr-5 w-6 h-6 text-[var(--cx-text-muted)]" />
      </div>

      {/* Hint text */}
      {!value && (
        <p className="mt-4 text-center text-sm text-[var(--cx-text-muted)]">
          {t('search.hint')}
        </p>
      )}

      {/* Examples */}
      {!value && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['MDF 19mm', 'mélaminé blanc', 'chêne massif', 'OSB 18'].map((example) => (
            <button
              key={example}
              onClick={() => onChange(example)}
              className="px-4 py-2 text-sm text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] border border-[var(--cx-border)] hover:border-[var(--cx-border-strong)] rounded-full transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
