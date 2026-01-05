'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, ArrowRight, ImageIcon } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

interface Suggestion {
  id: string;
  reference: string;
  refFabricant: string | null;
  name: string;
  imageUrl: string | null;
  catalogueName: string;
  productType: string | null;
  epaisseur: number | null;
  prix: number | null;
  prixType: 'M2' | 'ML' | null;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: Suggestion) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  onSearch,
  placeholder = 'Rechercher...',
  autoFocus = false,
  className = '',
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(value, 150);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setTotalMatches(0);
      setIsOpen(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/catalogues/autocomplete?q=${encodeURIComponent(query)}&limit=8`,
        { signal: abortControllerRef.current.signal }
      );

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setTotalMatches(data.totalMatches || 0);
        setIsOpen(data.suggestions?.length > 0 || data.totalMatches > 0);
        setHighlightedIndex(-1);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Autocomplete error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch when debounced query changes
  useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery, fetchSuggestions]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelectSuggestion(suggestions[highlightedIndex]);
        } else if (onSearch) {
          onSearch(value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.reference);
    setIsOpen(false);
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  const handleSeeAllResults = () => {
    if (onSearch) {
      onSearch(value);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setTotalMatches(0);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`search-autocomplete ${className}`}>
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="search-input"
          autoFocus={autoFocus}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 size={16} className="loading-icon" />
        )}
        {value && !isLoading && (
          <button className="clear-btn" onClick={handleClear} type="button">
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div ref={dropdownRef} className="suggestions-dropdown">
          {suggestions.length > 0 ? (
            <>
              <ul className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    className={`suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="suggestion-image">
                      {suggestion.imageUrl ? (
                        <img
                          src={suggestion.imageUrl}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`no-image ${suggestion.imageUrl ? 'hidden' : ''}`}>
                        <ImageIcon size={14} />
                      </div>
                    </div>
                    <span className="suggestion-ref">
                      {suggestion.refFabricant || suggestion.reference}
                    </span>
                    {suggestion.epaisseur && (
                      <span className="suggestion-thickness">{suggestion.epaisseur}mm</span>
                    )}
                    {suggestion.prix && suggestion.prixType && (
                      <span className="suggestion-price">
                        {suggestion.prix.toFixed(2)}€/{suggestion.prixType === 'ML' ? 'ml' : 'm²'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {totalMatches > suggestions.length && (
                <button
                  className="see-all-btn"
                  onClick={handleSeeAllResults}
                  type="button"
                >
                  <span>Voir tous les résultats ({totalMatches})</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </>
          ) : totalMatches === 0 && value.length >= 2 ? (
            <div className="no-suggestions">
              Aucun résultat pour "{value}"
            </div>
          ) : null}
        </div>
      )}

      <style jsx>{`
        .search-autocomplete {
          position: relative;
          width: 100%;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .search-input-wrapper :global(.search-icon) {
          position: absolute;
          left: 14px;
          color: var(--admin-text-muted);
          pointer-events: none;
          z-index: 1;
        }

        .search-input {
          width: 100%;
          height: 40px;
          padding: 0 40px 0 44px;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-default);
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--admin-text-primary);
          outline: none;
          transition: all 0.15s;
        }

        .search-input:focus {
          border-color: var(--admin-olive);
          box-shadow: 0 0 0 3px var(--admin-olive-bg);
        }

        .search-input::placeholder {
          color: var(--admin-text-muted);
        }

        .search-input-wrapper :global(.loading-icon) {
          position: absolute;
          right: 12px;
          color: var(--admin-olive);
          animation: spin 1s linear infinite;
        }

        .clear-btn {
          position: absolute;
          right: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: var(--admin-bg-hover);
          border: none;
          border-radius: 4px;
          color: var(--admin-text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .clear-btn:hover {
          background: var(--admin-status-danger-bg);
          color: var(--admin-status-danger);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .suggestions-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: var(--admin-bg-elevated, #1e1e1e);
          border: 1px solid var(--admin-border-default);
          border-radius: 10px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          z-index: 1000;
          overflow: hidden;
        }

        .suggestions-list {
          list-style: none;
          margin: 0;
          padding: 6px;
          max-height: 360px;
          overflow-y: auto;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.1s;
        }

        .suggestion-item:hover,
        .suggestion-item.highlighted {
          background: var(--admin-bg-hover);
        }

        .suggestion-image {
          position: relative;
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 3px;
          overflow: hidden;
          background: var(--admin-bg-tertiary);
          border: 1px solid var(--admin-border-subtle);
        }

        .suggestion-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .suggestion-image .no-image {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: var(--admin-text-muted);
        }

        .suggestion-image .no-image.hidden {
          display: none;
        }

        .suggestion-ref {
          flex: 1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--admin-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .suggestion-thickness {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--admin-text-secondary);
          background: var(--admin-bg-tertiary);
          padding: 2px 5px;
          border-radius: 3px;
          white-space: nowrap;
        }

        .suggestion-price {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.625rem;
          font-weight: 500;
          color: var(--admin-sable, #c9a961);
          white-space: nowrap;
          min-width: 65px;
          text-align: right;
        }

        .see-all-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 10px;
          background: var(--admin-bg-tertiary);
          border: none;
          border-top: 1px solid var(--admin-border-subtle);
          color: var(--admin-olive);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .see-all-btn:hover {
          background: var(--admin-olive-bg);
        }

        .no-suggestions {
          padding: 16px;
          text-align: center;
          color: var(--admin-text-muted);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
