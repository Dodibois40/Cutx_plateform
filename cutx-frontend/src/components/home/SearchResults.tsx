'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, LayoutGrid, Columns2, List, ChevronUp, ChevronDown, ChevronsUpDown, Send, CheckCircle, AlertCircle } from 'lucide-react';
import ProductCard from './ProductCard';
import FilterChips from './FilterChips';
import SponsoredRow from './SponsoredRow';
import type { SearchProduct, SmartSearchFacets, ParsedFilters } from './types';
import type { ClaudeRecommendation } from '@/lib/services/ai-assistant-api';

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
  onFilterClick: (filterType: string, value: string) => void;
  onClearFilter?: (filterType: string, value: string) => void;
  onClearAllFilters?: () => void;
  onLoadMore: () => void;
  isDraggable?: boolean;
  // AI Integration
  aiMode?: boolean;
  aiResponse?: string;
  aiIsStreaming?: boolean;
  aiRecap?: ClaudeRecommendation | null;
  aiError?: string | null;
  onAISendMessage?: (message: string) => void;
  onAIValidate?: () => void;
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
  onFilterClick,
  onClearFilter,
  onClearAllFilters,
  onLoadMore,
  isDraggable = false,
  // AI props
  aiMode = false,
  aiResponse = '',
  aiIsStreaming = false,
  aiRecap = null,
  aiError = null,
  onAISendMessage,
  onAIValidate,
}: SearchResultsProps) {
  const t = useTranslations('home');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [aiInput, setAiInput] = useState('');
  const aiResponseRef = useRef<HTMLDivElement>(null);

  // Auto-scroll AI response
  useEffect(() => {
    if (aiIsStreaming && aiResponseRef.current) {
      aiResponseRef.current.scrollTop = aiResponseRef.current.scrollHeight;
    }
  }, [aiResponse, aiIsStreaming]);

  // Handle AI message send
  const handleAISend = () => {
    if (aiInput.trim() && onAISendMessage) {
      onAISendMessage(aiInput.trim());
      setAiInput('');
    }
  };

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

  // Show no results (only if not in AI mode)
  if (!aiMode && !isLoading && results.length === 0 && query.length >= 2) {
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

  // AI Mode - show conversation instead of products
  if (aiMode) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-6">
        {/* AI Response area */}
        <div className="bg-[var(--cx-surface-1)] border border-[var(--cx-border)] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--cx-border)] bg-amber-500/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-medium text-amber-500">
                Assistant CutX
              </span>
              {aiIsStreaming && (
                <span className="text-xs text-[var(--cx-text-muted)]">
                  en train de répondre...
                </span>
              )}
            </div>
          </div>

          {/* Response content */}
          <div
            ref={aiResponseRef}
            className="p-4 max-h-[400px] overflow-y-auto"
          >
            {aiResponse ? (
              <div className="prose prose-invert prose-amber max-w-none">
                <div className="text-[var(--cx-text)] whitespace-pre-wrap leading-relaxed">
                  {aiResponse}
                  {aiIsStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-amber-500 animate-pulse" />
                  )}
                </div>
              </div>
            ) : aiIsStreaming ? (
              <div className="flex items-center gap-3 text-[var(--cx-text-muted)]">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span>L&apos;assistant analyse votre demande...</span>
              </div>
            ) : (
              <p className="text-[var(--cx-text-muted)]">
                Décrivez votre projet ou posez une question sur les panneaux...
              </p>
            )}
          </div>

          {/* Error message */}
          {aiError && (
            <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{aiError}</span>
              </div>
            </div>
          )}

          {/* Recap card - when recommendation is available */}
          {aiRecap?.recommendation && (
            <div className="p-4 border-t border-[var(--cx-border)] bg-[var(--cx-surface-2)]">
              <h3 className="text-sm font-semibold text-amber-500 mb-3">
                Récapitulatif de votre projet
              </h3>

              {/* Recap text */}
              {aiRecap.recap && (
                <p className="text-sm text-[var(--cx-text)] mb-4">{aiRecap.recap}</p>
              )}

              {/* Panels */}
              {aiRecap.recommendation.panels.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-[var(--cx-text-muted)] mb-2">Panneaux recommandés</p>
                  <div className="space-y-1">
                    {aiRecap.recommendation.panels.map((panel, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 bg-[var(--cx-surface-1)] rounded-lg text-sm"
                      >
                        <span className="text-[var(--cx-text)]">
                          {panel.productType} {panel.criteria.thickness ? `${panel.criteria.thickness}mm` : ''} - {panel.role}
                        </span>
                        <span className="text-[var(--cx-text-muted)]">
                          {panel.quantity}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cuts/Debits */}
              {aiRecap.recommendation.debits.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-[var(--cx-text-muted)] mb-2">Débits prévus</p>
                  <div className="flex flex-wrap gap-2">
                    {aiRecap.recommendation.debits.slice(0, 6).map((debit, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-[var(--cx-surface-1)] rounded text-xs text-[var(--cx-text-muted)]"
                      >
                        {debit.largeur}×{debit.longueur} ({debit.quantity}x)
                      </span>
                    ))}
                    {aiRecap.recommendation.debits.length > 6 && (
                      <span className="px-2 py-1 text-xs text-[var(--cx-text-muted)]">
                        +{aiRecap.recommendation.debits.length - 6} autres
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Validate button */}
              <button
                onClick={onAIValidate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                Valider et configurer
              </button>
            </div>
          )}

          {/* Input for follow-up */}
          {!aiRecap && (
            <div className="p-3 border-t border-[var(--cx-border)]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISend()}
                  placeholder="Précisez votre demande..."
                  disabled={aiIsStreaming}
                  className="flex-1 px-3 py-2 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg text-[var(--cx-text)] placeholder:text-[var(--cx-text-muted)]/50 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
                />
                <button
                  onClick={handleAISend}
                  disabled={aiIsStreaming || !aiInput.trim()}
                  className="p-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
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
          activeFilters={activeFilters}
          onFilterClick={onFilterClick}
          onClearFilter={onClearFilter}
          onClearAllFilters={onClearAllFilters}
          total={total}
        />
      </div>

      {/* Results count + View toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--cx-text-muted)]">
          {t('results.count', { count: total })}
        </p>

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
        {sortedResults.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={onProductClick}
            viewMode={viewMode}
            isDraggable={isDraggable}
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
