'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, LayoutGrid, Columns2, List, ChevronUp, ChevronDown, ChevronsUpDown, PackageCheck, Lightbulb } from 'lucide-react';
import ProductCard from './ProductCard';
import FilterChips from './FilterChips';
import SponsoredRow from './SponsoredRow';
import { useSearchSuggestions } from '@/lib/hooks/useSearchSuggestions';
import type { SearchProduct, SmartSearchFacets, ParsedFilters } from './types';

export type ViewMode = 'detail' | 'grid' | 'list';
export type SortField = 'nom' | 'epaisseur' | 'prix' | 'dimensions' | null;
export type SortOrder = 'asc' | 'desc';

const VIEW_MODE_STORAGE_KEY = 'cutx-search-view-mode';

export interface ActiveFilter {
  type: string;
  value: string;
  label: string;
}

interface SearchResultsProps {
  query: string;
  results: SearchProduct[];
  sponsored: SearchProduct[];
  total: number;
  isLoading: boolean;
  hasMore: boolean;
  facets: SmartSearchFacets | null;
  parsedFilters: ParsedFilters | null;
  activeFilters?: ActiveFilter[];
  onProductClick: (product: SearchProduct) => void;
  onViewDetails?: (productId: string) => void;
  onFilterClick: (filterType: string, value: string) => void;
  onClearFilter?: (filterType: string, value: string) => void;
  onClearAllFilters?: () => void;
  onLoadMore: () => void;
  isDraggable?: boolean;
  /** Callback to search with a suggested correction */
  onSearchWithSuggestion?: (suggestion: string) => void;
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
  activeFilters = [],
  onProductClick,
  onViewDetails,
  onFilterClick,
  onClearFilter,
  onClearAllFilters,
  onLoadMore,
  isDraggable = false,
  onSearchWithSuggestion,
}: SearchResultsProps) {
  const t = useTranslations('home');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Get spelling suggestions when results are few or empty
  const {
    suggestions,
    correctedQuery,
    hasSuggestions,
    isLoading: suggestionsLoading,
  } = useSearchSuggestions({
    query,
    resultsCount: total,
    threshold: 3, // Show suggestions when <= 3 results
    enabled: !isLoading && query.length >= 3,
  });

  // Load view mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved && ['detail', 'grid', 'list'].includes(saved)) {
      setViewMode(saved as ViewMode);
    }
  }, []);

  // Save view mode to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  };

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order or reset
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortField(null);
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    }
    return sortOrder === 'asc'
      ? <ChevronUp className="w-3 h-3 text-amber-500" />
      : <ChevronDown className="w-3 h-3 text-amber-500" />;
  };

  // Sorted results
  const sortedResults = useMemo(() => {
    if (!sortField) return results;

    return [...results].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'nom':
          aVal = a.nom.toLowerCase();
          bVal = b.nom.toLowerCase();
          break;
        case 'epaisseur':
          aVal = a.epaisseur ?? 0;
          bVal = b.epaisseur ?? 0;
          break;
        case 'prix':
          aVal = a.prixAchatM2 ?? a.prixMl ?? 0;
          bVal = b.prixAchatM2 ?? b.prixMl ?? 0;
          break;
        case 'dimensions':
          // Sort by surface (L x l)
          const aL = typeof a.longueur === 'number' ? a.longueur : 0;
          const bL = typeof b.longueur === 'number' ? b.longueur : 0;
          aVal = aL * (a.largeur ?? 0);
          bVal = bL * (b.largeur ?? 0);
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [results, sortField, sortOrder]);

  // Grid classes based on view mode
  const gridClasses = {
    detail: 'grid-cols-1 max-w-3xl mx-auto',
    grid: 'grid-cols-1 lg:grid-cols-2',
    list: 'grid-cols-1',
  };

  // Show initial loading state
  if (isLoading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--cx-text-muted)] animate-spin mb-4" />
        <p className="text-[var(--cx-text-muted)]">{t('results.loading')}</p>
      </div>
    );
  }

  // Show no results with suggestion
  if (!isLoading && results.length === 0 && query.length >= 2) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xl text-[var(--cx-text-muted)] mb-2">
          {t('results.noResults', { query })}
        </p>
        <p className="text-sm text-[var(--cx-text-muted)] mb-4">
          {t('results.tryAgain')}
        </p>

        {/* Spelling suggestion */}
        {hasSuggestions && correctedQuery && onSearchWithSuggestion && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400">
              <Lightbulb className="w-5 h-5" />
              <span className="text-sm">Vouliez-vous dire :</span>
              <button
                onClick={() => onSearchWithSuggestion(correctedQuery)}
                className="font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
              >
                {correctedQuery}
              </button>
              <span className="text-xs text-amber-500/70">?</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Sponsored row */}
      <SponsoredRow products={sponsored} onProductClick={onProductClick} />

      {/* Spelling suggestion when few results */}
      {hasSuggestions && correctedQuery && onSearchWithSuggestion && total > 0 && total <= 3 && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-amber-400">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm">Peu de résultats. Vouliez-vous dire :</span>
            <button
              onClick={() => onSearchWithSuggestion(correctedQuery)}
              className="font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
            >
              {correctedQuery}
            </button>
            <span className="text-xs text-amber-500/70">?</span>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="mb-6">
        <FilterChips
          facets={facets}
          parsedFilters={parsedFilters}
          activeFilters={activeFilters}
          onFilterClick={onFilterClick}
          onClearFilter={onClearFilter}
          onClearAllFilters={onClearAllFilters}
          total={total}
        />
      </div>

      {/* Results count + Stock filter + View toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--cx-text-muted)]">
          {t('results.count', { count: total })}
        </p>

        <div className="flex items-center gap-3">
          {/* En Stock toggle button */}
          {(() => {
            const isStockActive = activeFilters.some(f => f.type === 'stock');
            return (
              <button
                onClick={() => {
                  if (isStockActive) {
                    onClearFilter?.('stock', 'true');
                  } else {
                    onFilterClick('stock', 'true');
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  isStockActive
                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                    : 'bg-[var(--cx-surface-1)] border-[var(--cx-border)] text-[var(--cx-text)] hover:border-green-500/30 hover:text-green-400'
                }`}
              >
                <PackageCheck className="w-4 h-4" />
                En stock
              </button>
            );
          })()}

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-[var(--cx-surface-1)] border border-[var(--cx-border)] rounded-lg">
          <button
            onClick={() => handleViewModeChange('detail')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'detail'
                ? 'bg-amber-500/20 text-amber-500'
                : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
            }`}
            title="Vue détaillée"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-amber-500/20 text-amber-500'
                : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
            }`}
            title="Vue grille"
          >
            <Columns2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-amber-500/20 text-amber-500'
                : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
            }`}
            title="Vue liste"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>

      {/* List view header row */}
      {viewMode === 'list' && (
        <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-[var(--cx-surface-1)]/50 border border-[var(--cx-border)] rounded-lg text-xs font-medium text-[var(--cx-text-muted)]">
          {/* Spacer for image */}
          <div className="w-10 flex-shrink-0" />

          {/* Type - not sortable */}
          <div className="w-16 flex-shrink-0">Type</div>

          {/* Name - sortable */}
          <button
            onClick={() => handleSort('nom')}
            className="flex-1 min-w-0 flex items-center gap-1 hover:text-[var(--cx-text)] transition-colors text-left"
          >
            Nom <SortIcon field="nom" />
          </button>

          {/* Ref - not sortable */}
          <div className="w-24 flex-shrink-0">Référence</div>

          {/* Dimensions - sortable */}
          <button
            onClick={() => handleSort('dimensions')}
            className="w-24 flex-shrink-0 flex items-center gap-1 hover:text-[var(--cx-text)] transition-colors"
          >
            Dimensions <SortIcon field="dimensions" />
          </button>

          {/* Thickness - sortable */}
          <button
            onClick={() => handleSort('epaisseur')}
            className="w-16 flex-shrink-0 flex items-center gap-1 hover:text-[var(--cx-text)] transition-colors"
          >
            Ép. <SortIcon field="epaisseur" />
          </button>

          {/* Price - sortable */}
          <button
            onClick={() => handleSort('prix')}
            className="w-24 flex-shrink-0 flex items-center gap-1 hover:text-[var(--cx-text)] transition-colors"
          >
            Prix <SortIcon field="prix" />
          </button>

          {/* Stock indicator spacer */}
          <div className="w-4 flex-shrink-0" />

          {/* Supplier spacer */}
          <div className="w-6 flex-shrink-0" />
        </div>
      )}

      {/* Results grid */}
      <div className={`grid ${gridClasses[viewMode]} ${viewMode === 'list' ? 'gap-1' : 'gap-4'} mb-8`}>
        {sortedResults.map((product, index) => (
          <div key={product.id} data-product-card={index === 0 ? 'first' : undefined}>
            <ProductCard
              product={product}
              onClick={onProductClick}
              onViewDetails={onViewDetails}
              viewMode={viewMode}
              isDraggable={isDraggable}
            />
          </div>
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
