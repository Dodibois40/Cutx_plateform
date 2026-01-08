'use client';

import { useState } from 'react';
import { X, ChevronDown, Layers, Ruler, Box, MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SmartSearchFacets, ParsedFilters } from './types';

export interface ActiveFilter {
  type: string;
  value: string;
  label: string;
}

interface FilterChipsProps {
  facets: SmartSearchFacets | null;
  parsedFilters: ParsedFilters | null;
  onFilterClick: (filterType: string, value: string) => void;
  onClearFilter?: (filterType: string, value: string) => void;
  onClearAllFilters?: () => void;
  activeFilters?: ActiveFilter[];
  total?: number;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  MELAMINE: 'Mélaminé',
  STRATIFIE: 'Stratifié',
  MDF: 'MDF',
  BANDE_DE_CHANT: 'Chant',
  COMPACT: 'Compact',
  CONTREPLAQUE: 'Contreplaqué',
  PARTICULE: 'Aggloméré',
  OSB: 'OSB',
};

type TabId = 'genres' | 'thicknesses' | 'dimensions' | null;

export default function FilterChips({
  facets,
  parsedFilters,
  onFilterClick,
  onClearFilter,
  onClearAllFilters,
  activeFilters = [],
  total = 0,
}: FilterChipsProps) {
  const t = useTranslations('home');
  const [activeTab, setActiveTab] = useState<TabId>(null);
  const [showMore, setShowMore] = useState(false);

  const VISIBLE_COUNT = 8;

  // Popular thicknesses sorted by demand (19mm = 50%, 16mm = 15%, 22mm = 10%, etc.)
  const POPULAR_THICKNESSES = [19, 16, 22, 18, 10];

  if (!facets && !parsedFilters) return null;

  const hasActiveFilters = activeFilters.length > 0;
  const hasParsedFilters = parsedFilters && (parsedFilters.productTypes.length > 0 || parsedFilters.thickness);

  // Sort thicknesses by popularity, then numerically
  const sortedThicknesses = facets?.thicknesses
    ? [...facets.thicknesses].sort((a, b) => {
        const aPopIndex = POPULAR_THICKNESSES.indexOf(a.value);
        const bPopIndex = POPULAR_THICKNESSES.indexOf(b.value);
        if (aPopIndex !== -1 && bPopIndex !== -1) return aPopIndex - bPopIndex;
        if (aPopIndex !== -1) return -1;
        if (bPopIndex !== -1) return 1;
        return a.value - b.value;
      })
    : [];

  // Only show facets if we have many results (> 10)
  const showFacets = total > 10 && facets && (
    (facets.genres?.length > 0) ||
    (facets.thicknesses?.length > 0) ||
    (facets.dimensions?.length > 0)
  );

  if (!hasActiveFilters && !hasParsedFilters && !showFacets) return null;

  const handleTabClick = (tab: TabId) => {
    setActiveTab(activeTab === tab ? null : tab);
    setShowMore(false);
  };

  // Get current tab items
  const getCurrentItems = () => {
    if (activeTab === 'genres' && facets?.genres) {
      const items = showMore ? facets.genres : facets.genres.slice(0, VISIBLE_COUNT);
      return {
        items: items.map(g => ({ key: g.label, label: g.label, value: g.searchTerm, count: g.count })),
        hasMore: facets.genres.length > VISIBLE_COUNT,
        total: facets.genres.length,
      };
    }
    if (activeTab === 'thicknesses' && sortedThicknesses.length > 0) {
      const items = showMore ? sortedThicknesses : sortedThicknesses.slice(0, VISIBLE_COUNT);
      return {
        items: items.map(t => ({
          key: String(t.value),
          label: t.value === 19 ? `★ ${t.value}mm` : `${t.value}mm`,
          value: String(t.value),
          count: t.count,
          isPopular: t.value === 19,
        })),
        hasMore: sortedThicknesses.length > VISIBLE_COUNT,
        total: sortedThicknesses.length,
      };
    }
    if (activeTab === 'dimensions' && facets?.dimensions) {
      const items = showMore ? facets.dimensions : facets.dimensions.slice(0, VISIBLE_COUNT);
      return {
        items: items.map(d => ({ key: d.label, label: d.label, value: `${d.length}x${d.width}`, count: d.count })),
        hasMore: facets.dimensions.length > VISIBLE_COUNT,
        total: facets.dimensions.length,
      };
    }
    return null;
  };

  const currentItems = getCurrentItems();

  return (
    <div className="w-full space-y-3">
      {/* Combined: Parsed filters + Active filters on same line */}
      {(hasParsedFilters || hasActiveFilters) && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Parsed filters (detected from query) */}
          {hasParsedFilters && (
            <>
              <span className="text-xs font-medium text-[var(--cx-text-muted)] uppercase tracking-wide">
                {t('filters.detected')}
              </span>
              {parsedFilters?.productTypes.map((type) => (
                <span
                  key={type}
                  className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-sm font-medium rounded-full border border-amber-500/20"
                >
                  {PRODUCT_TYPE_LABELS[type] || type}
                </span>
              ))}
              {parsedFilters?.thickness && (
                <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-sm font-medium rounded-full border border-amber-500/20">
                  {parsedFilters.thickness}mm
                </span>
              )}
            </>
          )}

          {/* Separator if both exist */}
          {hasParsedFilters && hasActiveFilters && (
            <span className="w-px h-5 bg-[var(--cx-border)] mx-1" />
          )}

          {/* Active filters (user-selected) */}
          {hasActiveFilters && (
            <>
              <span className="text-xs font-medium text-[var(--cx-text-muted)] uppercase tracking-wide">
                {t('filters.active')}
              </span>
              {activeFilters.map((filter, idx) => (
                <button
                  key={`${filter.type}-${filter.value}-${idx}`}
                  onClick={() => onClearFilter?.(filter.type, filter.value)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-black text-sm font-medium rounded-full hover:bg-amber-400 transition-colors group"
                >
                  {filter.label}
                  <X className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                </button>
              ))}
              {activeFilters.length > 1 && (
                <button
                  onClick={onClearAllFilters}
                  className="px-3 py-1.5 text-sm text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] transition-colors"
                >
                  {t('filters.clearAll')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab-based facets */}
      {showFacets && (
        <div className="space-y-2">
          {/* Tab buttons row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[var(--cx-text-muted)] uppercase tracking-wide mr-1">
              {t('filters.refine')}
            </span>

            {/* Type tab */}
            {facets?.genres && facets.genres.length > 0 && (
              <button
                onClick={() => handleTabClick('genres')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  activeTab === 'genres'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                    : 'bg-[var(--cx-surface-1)] border-[var(--cx-border)] text-[var(--cx-text)] hover:border-amber-500/30'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {t('filters.type')}
                <span className="text-[var(--cx-text-muted)]">({facets.genres.length})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeTab === 'genres' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Thickness tab */}
            {sortedThicknesses.length > 0 && (
              <button
                onClick={() => handleTabClick('thicknesses')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  activeTab === 'thicknesses'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                    : 'bg-[var(--cx-surface-1)] border-[var(--cx-border)] text-[var(--cx-text)] hover:border-amber-500/30'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                {t('filters.thickness')}
                <span className="text-[var(--cx-text-muted)]">({sortedThicknesses.length})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeTab === 'thicknesses' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Dimensions tab */}
            {facets?.dimensions && facets.dimensions.length > 0 && (
              <button
                onClick={() => handleTabClick('dimensions')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  activeTab === 'dimensions'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                    : 'bg-[var(--cx-surface-1)] border-[var(--cx-border)] text-[var(--cx-text)] hover:border-amber-500/30'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                {t('filters.dimensions')}
                <span className="text-[var(--cx-text-muted)]">({facets.dimensions.length})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeTab === 'dimensions' ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Tab content */}
          {activeTab && currentItems && (
            <div className="flex flex-wrap items-center gap-2 pl-0 py-2 border-t border-[var(--cx-border)]">
              {currentItems.items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onFilterClick(activeTab === 'thicknesses' ? 'thickness' : activeTab === 'dimensions' ? 'dimension' : 'genre', item.value)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    'isPopular' in item && item.isPopular
                      ? 'bg-[var(--cx-surface-2)] border-amber-500/30 text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/10'
                      : 'bg-[var(--cx-surface-2)] border-[var(--cx-border)] text-[var(--cx-text)] hover:border-amber-500/50 hover:bg-amber-500/5'
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 text-[var(--cx-text-muted)]">({item.count})</span>
                </button>
              ))}
              {currentItems.hasMore && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="px-3 py-1.5 bg-[var(--cx-surface-2)] border border-dashed border-[var(--cx-border)] text-[var(--cx-text-muted)] text-sm rounded-full hover:border-amber-500/50 hover:text-[var(--cx-text)] transition-colors flex items-center gap-1"
                >
                  {showMore ? (
                    <>Moins</>
                  ) : (
                    <>
                      <MoreHorizontal className="w-3 h-3" />
                      +{currentItems.total - VISIBLE_COUNT}
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
