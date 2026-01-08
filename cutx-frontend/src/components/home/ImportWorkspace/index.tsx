'use client';

/**
 * ImportWorkspace - Split-screen layout for multi-file import workflow
 *
 * Left panel: Full CutX search (reuses existing HomeSearchBar + SearchResults)
 * Right panel: Imported files with assignment status
 * Drag from left to right to assign panels
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCatalogueSearch } from '@/lib/hooks/useCatalogueSearch';
import { getSponsored, type CatalogueProduit } from '@/lib/services/catalogue-api';
import { HomeSearchBar, SearchResults } from '@/components/home';
import type { SearchProduct } from '../types';
import type { ImportWorkspaceProps } from './types';
import FilesPanel from './FilesPanel';
import WorkspaceBottomBar from './WorkspaceBottomBar';

// Active filter type (same as in useSearchState)
interface ActiveFilter {
  type: 'thickness' | 'productType' | 'subcategory' | 'dimension';
  value: string;
  label: string;
}

export default function ImportWorkspace({
  files,
  isImporting,
  importError,
  onFileDrop,
  onRemoveFile,
  onAssignPanel,
  onUnassignPanel,
  onReset,
  onConfigureAll,
  allFilesHavePanel,
  totalLines,
}: ImportWorkspaceProps) {
  const t = useTranslations('common');

  // Search state (local, not URL-synced in workspace mode)
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sponsored, setSponsored] = useState<CatalogueProduit[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Get selected file
  const selectedFile = useMemo(
    () => files.find(f => f.id === selectedFileId) || null,
    [files, selectedFileId]
  );

  // Auto-select first unassigned file
  useEffect(() => {
    if (!selectedFileId) {
      const firstUnassigned = files.find(f => !f.assignedPanel);
      if (firstUnassigned) {
        setSelectedFileId(firstUnassigned.id);
      }
    }
  }, [files, selectedFileId]);

  // Construct combined search query from base query + active filters
  const combinedQuery = useMemo(() => {
    const filterTerms = activeFilters.map(f => {
      if (f.type === 'thickness') return `${f.value}mm`;
      return f.value;
    });
    return `${debouncedQuery} ${filterTerms.join(' ')}`.trim();
  }, [debouncedQuery, activeFilters]);

  // Search with smart search
  const {
    produits,
    total,
    hasMore,
    isLoading,
    fetchNextPage,
    parsedFilters,
    facets,
  } = useCatalogueSearch({
    search: combinedQuery,
    useSmartSearch: true,
    enabled: combinedQuery.length >= 2,
  });

  // Fetch sponsored when search changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      getSponsored(4, debouncedQuery).then(setSponsored);
    } else {
      setSponsored([]);
    }
  }, [debouncedQuery]);

  // Filter actions (matching SearchResults interface)
  const addFilter = useCallback((filterType: string, value: string) => {
    const filter: ActiveFilter = { type: filterType as ActiveFilter['type'], value, label: value };
    setActiveFilters(prev => {
      if (prev.some(f => f.type === filter.type && f.value === filter.value)) return prev;
      return [...prev, filter];
    });
  }, []);

  const removeFilter = useCallback((filterType: string, value: string) => {
    setActiveFilters(prev => prev.filter(f => !(f.type === filterType && f.value === value)));
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  // Convert to SearchProduct
  const mapToSearchProduct = useCallback((p: CatalogueProduit): SearchProduct => ({
    id: p.id,
    reference: p.reference,
    nom: p.nom,
    refFabricant: p.refFabricant,
    marque: p.marque,
    categorie: p.categorie,
    sousCategorie: p.sousCategorie,
    type: p.type,
    productType: p.productType,
    longueur: p.longueur,
    largeur: p.largeur,
    epaisseur: p.epaisseur,
    prixAchatM2: p.prixAchatM2,
    prixMl: p.prixMl,
    prixUnit: p.prixUnit,
    imageUrl: p.imageUrl,
    stock: p.stock,
    isVariableLength: p.isVariableLength,
    fournisseur: p.fournisseur,
  }), []);

  const searchProducts = useMemo(
    () => produits.map(mapToSearchProduct),
    [produits, mapToSearchProduct]
  );

  const sponsoredProducts = useMemo(
    () => sponsored.map(mapToSearchProduct),
    [sponsored, mapToSearchProduct]
  );

  // Computed stats
  const assignedCount = files.filter(f => f.assignedPanel).length;
  const hasSearched = query.length >= 2 || activeFilters.length > 0;

  return (
    <div className="fixed inset-0 bg-[var(--cx-background)] flex flex-col">
      {/* Main content - split screen */}
      <main className="flex-1 flex min-h-0">
        {/* Left panel - Full CutX search (80%) */}
        <div className="w-[80%] flex flex-col min-h-0">
          {/* Search header */}
          <div className={`flex-shrink-0 w-full transition-all duration-300 ${
            hasSearched
              ? 'py-4 bg-[var(--cx-background)]/80 backdrop-blur-xl'
              : 'flex-1 flex items-center justify-center'
          }`}>
            {/* Landing state (centered) */}
            {!hasSearched && (
              <div className="w-full px-4">
                <div className="text-center mb-10">
                  <h1 className="text-6xl font-black tracking-tighter mb-4">
                    <span className="text-white">Cut</span>
                    <span className="text-amber-500">X</span>
                  </h1>
                  <p className="text-xl font-medium text-[var(--cx-text-muted)] mb-2">
                    {t('home.subtitle')}
                  </p>
                  <p className="text-sm text-[var(--cx-text-muted)]">
                    Le moteur de recherche intelligent pour vos panneaux bois
                  </p>
                </div>
                <div className="flex justify-center">
                  <HomeSearchBar
                    value={query}
                    onChange={setQuery}
                    onSearch={() => {}}
                    isSearching={isLoading}
                    isCompact={false}
                    autoFocus={true}
                    onFileDrop={onFileDrop}
                    isImporting={isImporting}
                    importedFile={null}
                    importError={importError}
                  />
                </div>
              </div>
            )}

            {/* Search state (compact header) */}
            {hasSearched && (
              <div className="w-full max-w-4xl mx-auto px-4">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => { setQuery(''); clearAllFilters(); }}
                    className="text-3xl font-black tracking-tighter hover:opacity-80 transition-opacity flex-shrink-0"
                  >
                    <span className="text-white">Cut</span>
                    <span className="text-amber-500">X</span>
                  </button>
                  <div className="flex-1 max-w-2xl">
                    <HomeSearchBar
                      value={query}
                      onChange={setQuery}
                      onSearch={() => {}}
                      isSearching={isLoading}
                      isCompact={true}
                      autoFocus={true}
                      onFileDrop={onFileDrop}
                      isImporting={isImporting}
                      importedFile={null}
                      importError={importError}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {hasSearched && (
            <div className="flex-1 overflow-y-auto">
              <SearchResults
                query={debouncedQuery}
                results={searchProducts}
                sponsored={sponsoredProducts}
                total={total}
                isLoading={isLoading}
                hasMore={hasMore}
                facets={facets}
                parsedFilters={parsedFilters}
                activeFilters={activeFilters}
                onProductClick={() => {}} // No popup in workspace mode
                onFilterClick={addFilter}
                onClearFilter={removeFilter}
                onClearAllFilters={clearAllFilters}
                onLoadMore={fetchNextPage}
                isDraggable={true} // Always draggable in workspace mode
              />
            </div>
          )}
        </div>

        {/* Right panel - Files (20%) */}
        <div className="w-[20%] flex flex-col min-h-0 bg-[var(--cx-surface-1)]/20 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.15)]">
          <FilesPanel
            files={files}
            selectedFileId={selectedFileId}
            onSelectFile={setSelectedFileId}
            onRemoveFile={onRemoveFile}
            onUnassignPanel={onUnassignPanel}
            onAssignPanel={onAssignPanel}
          />
        </div>
      </main>

      {/* Bottom bar */}
      <WorkspaceBottomBar
        totalFiles={files.length}
        assignedFiles={assignedCount}
        totalPieces={totalLines}
        allAssigned={allFilesHavePanel}
        onConfigureAll={onConfigureAll}
        onReset={onReset}
      />
    </div>
  );
}
