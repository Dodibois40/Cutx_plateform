'use client';

import { useState } from 'react';
import { X, ChevronDown, Layers, Ruler, Box, MoreHorizontal, Palette, Building2, Shield } from 'lucide-react';
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

type TabId = 'genres' | 'thicknesses' | 'dimensions' | 'decorCategories' | 'manufacturers' | 'properties' | null;

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
    (facets.dimensions?.length > 0) ||
    (facets.decorCategories?.length ?? 0) > 0 ||
    (facets.manufacturers?.length ?? 0) > 0 ||
    (facets.properties?.length ?? 0) > 0
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
    if (activeTab === 'decorCategories' && facets?.decorCategories) {
      const items = showMore ? facets.decorCategories : facets.decorCategories.slice(0, VISIBLE_COUNT);
      return {
        items: items.map(d => ({ key: d.value, label: d.label, value: d.value, count: d.count })),
        hasMore: facets.decorCategories.length > VISIBLE_COUNT,
        total: facets.decorCategories.length,
      };
    }
    if (activeTab === 'manufacturers' && facets?.manufacturers) {
      const items = showMore ? facets.manufacturers : facets.manufacturers.slice(0, VISIBLE_COUNT);
      return {
        items: items.map(m => ({ key: m.value, label: m.label, value: m.value, count: m.count })),
        hasMore: facets.manufacturers.length > VISIBLE_COUNT,
        total: facets.manufacturers.length,
      };
    }
    if (activeTab === 'properties' && facets?.properties) {
      return {
        items: facets.properties.map(p => ({ key: p.key, label: p.label, value: p.key, count: p.count })),
        hasMore: false,
        total: facets.properties.length,
      };
    }
    return null;
  };

  const currentItems = getCurrentItems();

  return (
    <div className="w-full space-y-3">
      {/* Tags actifs (détectés + sélectionnés) - design unifié olive subtil */}
      {(hasParsedFilters || hasActiveFilters || showFacets) && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Parsed filters (detected) - style olive subtil, pas de label */}
          {hasParsedFilters && (
            <>
              {parsedFilters?.productTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--cx-accent)]/10 text-[var(--cx-accent)] text-xs font-medium rounded-md border border-[var(--cx-accent)]/20"
                >
                  {PRODUCT_TYPE_LABELS[type] || type}
                </span>
              ))}
              {parsedFilters?.thickness && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--cx-accent)]/10 text-[var(--cx-accent)] text-xs font-medium rounded-md border border-[var(--cx-accent)]/20">
                  {parsedFilters.thickness}mm
                </span>
              )}
            </>
          )}

          {/* Séparateur subtil si tags détectés ET filtres actifs */}
          {hasParsedFilters && activeFilters.some(f => f.type !== 'stock') && (
            <span className="w-px h-4 bg-white/10 mx-1" />
          )}

          {/* Active filters (user-selected) - style olive avec X, pas de label */}
          {(() => {
            const nonStockFilters = activeFilters.filter(f => f.type !== 'stock');
            const hasNonStockFilters = nonStockFilters.length > 0;
            return hasNonStockFilters ? (
              <>
                {nonStockFilters.map((filter, idx) => (
                  <button
                    key={`${filter.type}-${filter.value}-${idx}`}
                    onClick={() => onClearFilter?.(filter.type, filter.value)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--cx-accent)]/15 text-[var(--cx-accent)] text-xs font-medium rounded-md border border-[var(--cx-accent)]/25 hover:bg-[var(--cx-accent)]/20 transition-colors duration-150 group"
                  >
                    {filter.label}
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity duration-150" />
                  </button>
                ))}
                {nonStockFilters.length > 1 && (
                  <button
                    onClick={onClearAllFilters}
                    className="px-2 py-1 text-xs text-white/40 hover:text-white/70 transition-colors duration-150"
                  >
                    {t('filters.clearAll')}
                  </button>
                )}
              </>
            ) : null;
          })()}

        </div>
      )}

      {/* Dropdowns de filtres - style discret, pas de label */}
      {showFacets && (
        <div className="space-y-2">
          {/* Tab buttons row - design gris discret */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Type tab */}
            {facets?.genres && facets.genres.length > 0 && (
              <button
                onClick={() => handleTabClick('genres')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-[background-color,border-color,color] duration-150 ${
                  activeTab === 'genres'
                    ? 'bg-white/[0.08] text-white/90 border-white/10'
                    : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 opacity-60" />
                {t('filters.type')}
                <span className="text-white/30">({facets.genres.length})</span>
                <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-150 ${activeTab === 'genres' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Thickness tab */}
            {sortedThicknesses.length > 0 && (
              <button
                onClick={() => handleTabClick('thicknesses')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-[background-color,border-color,color] duration-150 ${
                  activeTab === 'thicknesses'
                    ? 'bg-white/[0.08] text-white/90 border-white/10'
                    : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <Ruler className="w-3.5 h-3.5 opacity-60" />
                {t('filters.thickness')}
                <span className="text-white/30">({sortedThicknesses.length})</span>
                <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-150 ${activeTab === 'thicknesses' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Dimensions tab */}
            {facets?.dimensions && facets.dimensions.length > 0 && (
              <button
                onClick={() => handleTabClick('dimensions')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-[background-color,border-color,color] duration-150 ${
                  activeTab === 'dimensions'
                    ? 'bg-white/[0.08] text-white/90 border-white/10'
                    : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <Box className="w-3.5 h-3.5 opacity-60" />
                {t('filters.dimensions')}
                <span className="text-white/30">({facets.dimensions.length})</span>
                <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-150 ${activeTab === 'dimensions' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Decor category tab */}
            {facets?.decorCategories && facets.decorCategories.length > 0 && (
              <button
                onClick={() => handleTabClick('decorCategories')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-[background-color,border-color,color] duration-150 ${
                  activeTab === 'decorCategories'
                    ? 'bg-white/[0.08] text-white/90 border-white/10'
                    : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <Palette className="w-3.5 h-3.5 opacity-60" />
                Décor
                <span className="text-white/30">({facets.decorCategories.length})</span>
                <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-150 ${activeTab === 'decorCategories' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Manufacturer tab */}
            {facets?.manufacturers && facets.manufacturers.length > 0 && (
              <button
                onClick={() => handleTabClick('manufacturers')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-[background-color,border-color,color] duration-150 ${
                  activeTab === 'manufacturers'
                    ? 'bg-white/[0.08] text-white/90 border-white/10'
                    : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 opacity-60" />
                Fabricant
                <span className="text-white/30">({facets.manufacturers.length})</span>
                <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-150 ${activeTab === 'manufacturers' ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Properties tab */}
            {facets?.properties && facets.properties.length > 0 && (
              <button
                onClick={() => handleTabClick('properties')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-[background-color,border-color,color] duration-150 ${
                  activeTab === 'properties'
                    ? 'bg-white/[0.08] text-white/90 border-white/10'
                    : 'text-white/50 border-transparent hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <Shield className="w-3.5 h-3.5 opacity-60" />
                Propriétés
                <span className="text-white/30">({facets.properties.length})</span>
                <ChevronDown className={`w-3 h-3 opacity-40 transition-transform duration-150 ${activeTab === 'properties' ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Tab content - style cohérent gris/olive */}
          {activeTab && currentItems && (
            <div className="flex flex-wrap items-center gap-1.5 py-2 border-t border-white/[0.06]">
              {currentItems.items.map((item) => {
                // Map tab ID to filter type
                const filterTypeMap: Record<string, string> = {
                  thicknesses: 'thickness',
                  dimensions: 'dimension',
                  genres: 'genre',
                  decorCategories: 'decorCategory',
                  manufacturers: 'manufacturer',
                  properties: 'property',
                };
                const filterType = filterTypeMap[activeTab!] || 'genre';

                return (
                <button
                  key={item.key}
                  onClick={() => onFilterClick(filterType, item.value)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-[background-color,color] duration-150 ${
                    'isPopular' in item && item.isPopular
                      ? 'bg-[var(--cx-accent)]/10 text-[var(--cx-accent)] hover:bg-[var(--cx-accent)]/15'
                      : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white/90'
                  }`}
                >
                  {item.label}
                  <span className="ml-1.5 text-white/30">({item.count})</span>
                </button>
                );
              })}
              {currentItems.hasMore && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="px-2.5 py-1 text-xs text-white/40 hover:text-white/70 transition-colors duration-150 flex items-center gap-1"
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
