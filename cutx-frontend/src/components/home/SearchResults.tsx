'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import ProductCard from './ProductCard';
import FilterChips from './FilterChips';
import SponsoredRow from './SponsoredRow';
import type { SearchProduct, SmartSearchFacets, ParsedFilters } from './types';

interface SearchResultsProps {
  query: string;
  results: SearchProduct[];
  sponsored: SearchProduct[];
  total: number;
  isLoading: boolean;
  hasMore: boolean;
  facets: SmartSearchFacets | null;
  parsedFilters: ParsedFilters | null;
  onProductClick: (product: SearchProduct) => void;
  onFilterClick: (filterType: string, value: string) => void;
  onLoadMore: () => void;
}

export default function SearchResults({
  query,
  results,
  sponsored,
  total,
  isLoading,
  hasMore,
  facets,
  parsedFilters,
  onProductClick,
  onFilterClick,
  onLoadMore,
}: SearchResultsProps) {
  const t = useTranslations('home');

  // Show initial loading state
  if (isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--cx-text-muted)] animate-spin mb-4" />
        <p className="text-[var(--cx-text-muted)]">{t('results.loading')}</p>
      </div>
    );
  }

  // Show no results
  if (!isLoading && results.length === 0 && query.length >= 2) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xl text-[var(--cx-text-muted)] mb-2">
          {t('results.noResults', { query })}
        </p>
        <p className="text-sm text-[var(--cx-text-muted)]">
          {t('results.tryAgain')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Sponsored row */}
      <SponsoredRow products={sponsored} onProductClick={onProductClick} />

      {/* Filter chips */}
      <div className="mb-6">
        <FilterChips
          facets={facets}
          parsedFilters={parsedFilters}
          onFilterClick={onFilterClick}
          total={total}
        />
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--cx-text-muted)]">
          {t('results.count', { count: total })}
        </p>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {results.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={onProductClick}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] text-[var(--cx-text)] rounded-lg hover:border-[var(--cx-border-strong)] transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('results.loading')}
              </span>
            ) : (
              t('results.loadMore')
            )}
          </button>
        </div>
      )}
    </div>
  );
}
