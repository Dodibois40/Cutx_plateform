'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Layers, Ruler, Box, MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SmartSearchFacets, ParsedFilters } from './types';

interface FilterChipsProps {
  facets: SmartSearchFacets | null;
  parsedFilters: ParsedFilters | null;
  onFilterClick: (filterType: string, value: string) => void;
  onClearFilter?: (filterType: string, value: string) => void;
  activeFilters?: { type: string; value: string }[];
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

export default function FilterChips({
  facets,
  parsedFilters,
  onFilterClick,
  onClearFilter,
  activeFilters = [],
  total = 0,
}: FilterChipsProps) {
  const t = useTranslations('home');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    genres: true,
    thicknesses: true,
    dimensions: false,
  });
  const [showAllThicknesses, setShowAllThicknesses] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);

  const INITIAL_THICKNESS_COUNT = 10;
  const INITIAL_GENRE_COUNT = 8;

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

        // If both are popular, sort by popularity order
        if (aPopIndex !== -1 && bPopIndex !== -1) {
          return aPopIndex - bPopIndex;
        }
        // Popular ones come first
        if (aPopIndex !== -1) return -1;
        if (bPopIndex !== -1) return 1;
        // Others sort numerically
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="w-full space-y-4">
      {/* Parsed filters (detected from query) */}
      {hasParsedFilters && (
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      )}

      {/* Active filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--cx-text-muted)] uppercase tracking-wide">
            {t('filters.active')}
          </span>
          {activeFilters.map((filter, idx) => (
            <button
              key={`${filter.type}-${filter.value}-${idx}`}
              onClick={() => onClearFilter?.(filter.type, filter.value)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-black text-sm font-medium rounded-full hover:bg-amber-400 transition-colors"
            >
              {filter.value}
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}

      {/* Available facets - show when many results */}
      {showFacets && (
        <div className="bg-[var(--cx-surface-1)] border border-[var(--cx-border)] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--cx-text)]">
            <span>{t('filters.refine')}</span>
            <span className="text-[var(--cx-text-muted)]">({total} résultats)</span>
          </div>

          {/* Genres / Types */}
          {facets?.genres && facets.genres.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('genres')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--cx-text-muted)]" />
                  <span className="text-sm font-medium text-[var(--cx-text)]">
                    {t('filters.type')}
                  </span>
                </div>
                {expandedSections.genres ? (
                  <ChevronUp className="w-4 h-4 text-[var(--cx-text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--cx-text-muted)]" />
                )}
              </button>
              {expandedSections.genres && (
                <div className="flex flex-wrap gap-2 pl-6">
                  {(showAllGenres ? facets.genres : facets.genres.slice(0, INITIAL_GENRE_COUNT)).map((genre) => (
                    <button
                      key={genre.label}
                      onClick={() => onFilterClick('genre', genre.searchTerm)}
                      className="px-3 py-1.5 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] text-[var(--cx-text)] text-sm rounded-full hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors"
                    >
                      {genre.label}
                      <span className="ml-1.5 text-[var(--cx-text-muted)]">({genre.count})</span>
                    </button>
                  ))}
                  {facets.genres.length > INITIAL_GENRE_COUNT && (
                    <button
                      onClick={() => setShowAllGenres(!showAllGenres)}
                      className="px-3 py-1.5 bg-[var(--cx-surface-2)] border border-dashed border-[var(--cx-border)] text-[var(--cx-text-muted)] text-sm rounded-full hover:border-amber-500/50 hover:text-[var(--cx-text)] transition-colors flex items-center gap-1"
                    >
                      {showAllGenres ? (
                        <>Moins</>
                      ) : (
                        <>
                          <MoreHorizontal className="w-3 h-3" />
                          +{facets.genres.length - INITIAL_GENRE_COUNT}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Thicknesses */}
          {sortedThicknesses.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('thicknesses')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-[var(--cx-text-muted)]" />
                  <span className="text-sm font-medium text-[var(--cx-text)]">
                    {t('filters.thickness')}
                  </span>
                </div>
                {expandedSections.thicknesses ? (
                  <ChevronUp className="w-4 h-4 text-[var(--cx-text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--cx-text-muted)]" />
                )}
              </button>
              {expandedSections.thicknesses && (
                <div className="flex flex-wrap gap-2 pl-6">
                  {(showAllThicknesses ? sortedThicknesses : sortedThicknesses.slice(0, INITIAL_THICKNESS_COUNT)).map((thick) => (
                    <button
                      key={thick.value}
                      onClick={() => onFilterClick('thickness', String(thick.value))}
                      className="px-3 py-1.5 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] text-[var(--cx-text)] text-sm rounded-full hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors"
                    >
                      {thick.value === 19 && <span className="mr-1 text-amber-500">★</span>}
                      {thick.value}mm
                      <span className="ml-1.5 text-[var(--cx-text-muted)]">({thick.count})</span>
                    </button>
                  ))}
                  {sortedThicknesses.length > INITIAL_THICKNESS_COUNT && (
                    <button
                      onClick={() => setShowAllThicknesses(!showAllThicknesses)}
                      className="px-3 py-1.5 bg-[var(--cx-surface-2)] border border-dashed border-[var(--cx-border)] text-[var(--cx-text-muted)] text-sm rounded-full hover:border-amber-500/50 hover:text-[var(--cx-text)] transition-colors flex items-center gap-1"
                    >
                      {showAllThicknesses ? (
                        <>Moins</>
                      ) : (
                        <>
                          <MoreHorizontal className="w-3 h-3" />
                          +{sortedThicknesses.length - INITIAL_THICKNESS_COUNT}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dimensions */}
          {facets?.dimensions && facets.dimensions.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('dimensions')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-[var(--cx-text-muted)]" />
                  <span className="text-sm font-medium text-[var(--cx-text)]">
                    {t('filters.dimensions')}
                  </span>
                </div>
                {expandedSections.dimensions ? (
                  <ChevronUp className="w-4 h-4 text-[var(--cx-text-muted)]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--cx-text-muted)]" />
                )}
              </button>
              {expandedSections.dimensions && (
                <div className="flex flex-wrap gap-2 pl-6">
                  {facets.dimensions.slice(0, 6).map((dim) => (
                    <button
                      key={dim.label}
                      onClick={() => onFilterClick('dimension', `${dim.length}x${dim.width}`)}
                      className="px-3 py-1.5 bg-[var(--cx-surface-2)] border border-[var(--cx-border)] text-[var(--cx-text)] text-sm rounded-full hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors"
                    >
                      {dim.label}
                      <span className="ml-1.5 text-[var(--cx-text-muted)]">({dim.count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
