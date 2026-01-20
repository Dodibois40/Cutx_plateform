'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  FolderTree,
  ChevronsUpDown,
  ChevronsDownUp,
} from 'lucide-react';
import { TreeNode } from './TreeNode';
import { TreeBreadcrumb } from './TreeBreadcrumb';
import { TreeSearchFilter } from './TreeSearchFilter';
import { useTreeNavigation } from '../hooks/useTreeNavigation';
import {
  useSyncSearchToTree,
  type ParsedFilters,
  RESULT_PRODUCT_TYPE_TO_CATEGORY,
} from '../hooks/useSyncSearchToTree';
import type { BreadcrumbItem } from '../types';

interface TreeNavigationProps {
  isCollapsed: boolean;
  onToggle: () => void;
  selectedPath: BreadcrumbItem[];
  selectedSlug: string | null;
  onSelect: (path: BreadcrumbItem[], categorySlug: string | null) => void;
  catalogueSlug?: string;
  /** Filter panel counts by supplier slugs (e.g., ['dispano', 'bouney', 'barrillet']) */
  supplierSlugs?: string[];
  /** Search query for sync (tree expands to match search) */
  searchQuery?: string;
  /** Parsed filters from smart search (productTypes, woods, etc.) */
  parsedFilters?: ParsedFilters | null;
  /** ProductTypes from search results (for expanding when reference search like "U963") */
  resultProductTypes?: string[];
  /** Actual category slugs from search results for deep highlighting (e.g., 'decors-unis', 'chants-abs') */
  resultCategorySlugs?: string[];
}

export function TreeNavigation({
  isCollapsed,
  onToggle,
  selectedPath,
  selectedSlug,
  onSelect,
  catalogueSlug,
  supplierSlugs,
  searchQuery = '',
  parsedFilters,
  resultProductTypes,
  resultCategorySlugs,
}: TreeNavigationProps) {
  const {
    tree,
    filteredTree,
    isLoading,
    expandedNodes,
    searchFilter,
    setSearchFilter,
    toggleNode,
    expandPath,
    collapseAll,
    expandAll,
    findPathToCategory,
  } = useTreeNavigation({ catalogueSlug, supplierSlugs, enabled: !isCollapsed });

  // Sync search → tree: expand tree to match search query
  const { syncTreeWithSearch, expandByResultProductTypes } = useSyncSearchToTree({
    tree,
    expandPath,
    collapseAll,
    findPathToCategory,
  });

  // Track if we've already synced for the current query+filters combination
  const lastSyncedRef = useRef<string>('');
  const hasTreeLoaded = useRef(false);

  // Auto-sync tree when parsed filters arrive for the current search query
  // Key insight: parsedFilters.originalQuery tells us which query the filters are for
  useEffect(() => {
    const treeJustLoaded = !hasTreeLoaded.current && tree.length > 0;
    if (treeJustLoaded) {
      hasTreeLoaded.current = true;
    }

    // Skip if no filters or tree not loaded
    if (!parsedFilters || tree.length === 0) {
      return;
    }

    // Create a unique key for this query+filters combination
    const syncKey = `${searchQuery}:${parsedFilters.productTypes?.join(',')}`;

    // Skip if we've already synced for this combination
    if (syncKey === lastSyncedRef.current) {
      return;
    }

    // Verify filters are for this query (not stale from cache)
    // originalQuery from API should match what we searched for
    const normalizedSearch = searchQuery.toLowerCase().trim();
    const normalizedOriginal = (parsedFilters.originalQuery || '').toLowerCase().trim();
    const filtersMatchQuery = normalizedOriginal === normalizedSearch;

    if (searchQuery.length >= 2 && filtersMatchQuery) {
      console.log('[TreeNavigation] Syncing tree:', {
        searchQuery,
        parsedFilters,
        treeLength: tree.length,
        syncKey
      });
      lastSyncedRef.current = syncKey;
      syncTreeWithSearch(searchQuery, parsedFilters);
    }
  }, [searchQuery, parsedFilters, syncTreeWithSearch, tree]);

  // Track last synced result types to avoid re-expanding
  const lastResultTypesRef = useRef<string>('');

  // Expand tree based on productTypes from search results
  // This handles cases like "U963" where parser doesn't detect productType
  // but results contain panels with various productTypes
  useEffect(() => {
    // Skip if no results or tree not loaded
    if (!resultProductTypes || resultProductTypes.length === 0 || tree.length === 0) {
      return;
    }

    // Skip if parsedFilters already has productTypes (already handled by syncTreeWithSearch)
    if (parsedFilters?.productTypes && parsedFilters.productTypes.length > 0) {
      return;
    }

    // Create unique key for this combination
    const typesKey = `${searchQuery}:${resultProductTypes.sort().join(',')}`;

    // Skip if already synced for these types
    if (typesKey === lastResultTypesRef.current) {
      return;
    }

    // Only expand if we have a meaningful search
    if (searchQuery.length >= 2) {
      console.log('[TreeNavigation] Expanding by result productTypes:', {
        searchQuery,
        resultProductTypes,
      });
      lastResultTypesRef.current = typesKey;
      expandByResultProductTypes(resultProductTypes);
    }
  }, [searchQuery, resultProductTypes, parsedFilters, expandByResultProductTypes, tree]);

  // Collapse tree when search is cleared
  useEffect(() => {
    if (searchQuery.length < 2) {
      lastSyncedRef.current = '';
      lastResultTypesRef.current = '';
      collapseAll();
    }
  }, [searchQuery, collapseAll]);

  // Compute highlighted slugs from resultProductTypes
  // These are categories that contain search results
  const highlightedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    if (searchQuery.length < 2) {
      return slugs;
    }

    // Priority 1: Use actual category slugs from search results (deep highlighting)
    // This shows green dots on exact categories like "decors-unis", "chants-abs", "strat-unis"
    if (resultCategorySlugs && resultCategorySlugs.length > 0) {
      for (const slug of resultCategorySlugs) {
        slugs.add(slug);
      }
    }

    // Fallback: Map productTypes to top-level categories if no direct slugs
    // (backward compatibility for when category slugs aren't available)
    if (slugs.size === 0 && resultProductTypes && resultProductTypes.length > 0) {
      for (const productType of resultProductTypes) {
        const slug = RESULT_PRODUCT_TYPE_TO_CATEGORY[productType];
        if (slug) {
          slugs.add(slug);
        }
      }
    }

    return slugs;
  }, [searchQuery, resultCategorySlugs, resultProductTypes]);

  // Handle category selection
  const handleSelect = useCallback(
    (path: BreadcrumbItem[], slug: string) => {
      expandPath(path);
      onSelect(path, slug);
    },
    [expandPath, onSelect]
  );

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback(
    (path: BreadcrumbItem[], slug: string | null) => {
      onSelect(path, slug);
    },
    [onSelect]
  );

  // Collapsed state: show only icons
  if (isCollapsed) {
    return (
      <div className="w-12 flex flex-col border-r border-[var(--cx-border)] bg-[var(--cx-surface-1)]/30">
        <button
          onClick={onToggle}
          className="p-3 hover:bg-white/5 transition-colors"
          aria-label="Ouvrir la navigation"
        >
          <ChevronRight className="w-5 h-5 text-[var(--cx-text-muted)]" />
        </button>
        <div className="flex-1 flex flex-col items-center pt-2 gap-2">
          <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
            <FolderTree className="w-3.5 h-3.5 text-[var(--cx-text-muted)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 flex flex-col border-r border-[var(--cx-border)] bg-[var(--cx-surface-1)]/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--cx-border)]">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-[var(--cx-text)]">
            Catégories
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Expand/Collapse all */}
          <button
            onClick={expandAll}
            className="p-1 hover:bg-white/5 rounded transition-colors"
            aria-label="Tout développer"
            title="Tout développer"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-[var(--cx-text-muted)]" />
          </button>
          <button
            onClick={collapseAll}
            className="p-1 hover:bg-white/5 rounded transition-colors"
            aria-label="Tout réduire"
            title="Tout réduire"
          >
            <ChevronsDownUp className="w-3.5 h-3.5 text-[var(--cx-text-muted)]" />
          </button>
          {/* Close button */}
          <button
            onClick={onToggle}
            className="p-1 hover:bg-white/5 rounded transition-colors ml-1"
            aria-label="Fermer la navigation"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--cx-text-muted)]" />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {selectedPath.length > 0 && (
        <TreeBreadcrumb path={selectedPath} onNavigate={handleBreadcrumbNavigate} />
      )}

      {/* Search filter */}
      <TreeSearchFilter value={searchFilter} onChange={setSearchFilter} />

      {/* Tree content */}
      <div
        className="flex-1 overflow-y-auto px-1 pb-2"
        role="tree"
        aria-label="Arborescence des catégories"
      >
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-1 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-7 rounded bg-white/5 animate-pulse"
                style={{ width: `${100 - i * 10}%` }}
              />
            ))}
          </div>
        ) : filteredTree.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <FolderTree className="w-8 h-8 text-[var(--cx-text-muted)] opacity-50 mb-2" />
            <p className="text-sm text-[var(--cx-text-muted)]">
              {searchFilter
                ? 'Aucune catégorie trouvée'
                : 'Aucune catégorie disponible'}
            </p>
          </div>
        ) : (
          // Tree nodes
          filteredTree.map((node, index) => (
            <TreeNode
              key={node.slug}
              node={node}
              level={0}
              expandedNodes={expandedNodes}
              selectedSlug={selectedSlug}
              onToggle={toggleNode}
              onSelect={handleSelect}
              highlightedSlugs={highlightedSlugs}
              index={index}
              siblingCount={filteredTree.length}
              showConnectors={true}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Re-export components
export { TreeNode } from './TreeNode';
export { TreeBreadcrumb } from './TreeBreadcrumb';
export { TreeSearchFilter } from './TreeSearchFilter';
export { TreeConnector } from './TreeConnector';
