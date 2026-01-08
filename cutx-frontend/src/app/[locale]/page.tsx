'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCatalogueSearch } from '@/lib/hooks/useCatalogueSearch';
import { getSponsored, type CatalogueProduit } from '@/lib/services/catalogue-api';
import {
  HomeSearchBar,
  SearchResults,
  PanelActionPopup,
} from '@/components/home';
import { useIntegratedAI } from '@/components/home/AIAssistant/hooks/useIntegratedAI';
import ImportWorkspace from '@/components/home/ImportWorkspace';
import { MULTI_GROUP_CONFIG_KEY, type GroupConfig } from '@/components/home/MultiFileImportWizard';
import type { SearchProduct } from '@/components/home/types';
import { useFileImport } from '@/components/home/hooks/useFileImport';
import { useSearchState } from '@/components/home/hooks/useSearchState';
import { useRouter } from '@/i18n/routing';

// Fallback for Suspense
function HomePageLoading() {
  return (
    <div className="min-h-screen bg-[var(--cx-background)] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-tighter mb-4">
          <span className="text-white">Cut</span>
          <span className="text-amber-500">X</span>
        </h1>
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}

// Main page wrapper with Suspense (required for useSearchParams)
export default function HomePage() {
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const t = useTranslations('common');

  // Prevent hydration mismatch - render same HTML on server and first client render
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // URL-synced search state
  const {
    query,
    activeFilters,
    hasSearched,
    setQuery,
    addFilter,
    removeFilter,
    clearAllFilters,
    goHome,
  } = useSearchState();

  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);
  const [sponsored, setSponsored] = useState<CatalogueProduit[]>([]);

  // File import hook for DXF/XLSX dropped on homepage
  const fileImport = useFileImport();

  const debouncedQuery = useDebounce(query, 300);

  // Integrated AI - automatically detects if query needs AI
  const integratedAI = useIntegratedAI(debouncedQuery);

  // Construct combined search query from base query + active filters
  const combinedQuery = useMemo(() => {
    if (activeFilters.length === 0) return debouncedQuery;

    const filterTerms = activeFilters.map(f => {
      if (f.type === 'thickness') return `${f.value}mm`;
      return f.value;
    });

    return `${debouncedQuery} ${filterTerms.join(' ')}`.trim();
  }, [debouncedQuery, activeFilters]);

  // Search hook with smart search - uses combined query
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

  // Handle product click
  const handleProductClick = useCallback((product: SearchProduct) => {
    setSelectedProduct(product);
  }, []);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  // Close popup
  const handleClosePopup = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  // Handle file drop on homepage search bar
  const handleFileDrop = useCallback(async (file: File) => {
    console.log('[HomePage] File dropped:', file.name);
    const foundRef = await fileImport.processFile(file);
    console.log('[HomePage] Import result - ref:', foundRef, 'lines:', fileImport.importedLines.length);
  }, [fileImport]);

  // Router for navigation
  const router = useRouter();

  // Handle "Configure All" button - navigate to configurateur with all files that have panels
  const handleConfigureAll = useCallback(() => {
    const filesToConfigure = fileImport.filesWithPanel;
    if (filesToConfigure.length === 0) return;

    // Group files by their assigned panel
    const panelGroups = new Map<string, typeof filesToConfigure>();
    for (const file of filesToConfigure) {
      if (!file.assignedPanel) continue;
      const key = file.assignedPanel.reference;
      if (!panelGroups.has(key)) {
        panelGroups.set(key, []);
      }
      panelGroups.get(key)!.push(file);
    }

    // Create group configs for each panel
    const groupConfigs: GroupConfig[] = [];
    for (const [, files] of panelGroups) {
      const panel = files[0].assignedPanel!;
      groupConfigs.push({
        panel,
        lines: files.flatMap(f => f.lines),
        sourceFileNames: files.map(f => f.name),
      });
    }

    // Save to session storage and navigate
    sessionStorage.setItem(MULTI_GROUP_CONFIG_KEY, JSON.stringify(groupConfigs));

    // Clear all files after configuring
    fileImport.resetImport();

    router.push('/configurateur?import=multi');
  }, [fileImport, router]);

  // Convert CatalogueProduit to SearchProduct
  const mapToSearchProduct = (p: CatalogueProduit): SearchProduct => ({
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
  });

  const searchProducts: SearchProduct[] = produits.map(mapToSearchProduct);
  const sponsoredProducts: SearchProduct[] = sponsored.map(mapToSearchProduct);

  // Show Import Workspace when files are imported (only after mount to prevent hydration mismatch)
  if (mounted && fileImport.totalFiles > 0) {
    return (
      <ImportWorkspace
        files={fileImport.importedFiles}
        isImporting={fileImport.isImporting}
        importError={fileImport.importError}
        onFileDrop={handleFileDrop}
        onRemoveFile={fileImport.removeFile}
        onAssignPanel={fileImport.assignPanelToFile}
        onUnassignPanel={fileImport.unassignPanel}
        onReset={fileImport.resetImport}
        onConfigureAll={handleConfigureAll}
        allFilesHavePanel={fileImport.allFilesHavePanel}
        totalLines={fileImport.totalLines}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cx-background)] flex flex-col relative overflow-hidden">
      {/* Language switcher */}
      <header className="absolute top-0 right-0 p-4 z-10">
        <LocaleSwitcher />
      </header>

      {/* Search section - centered or top based on state */}
      <div
        className={`w-full transition-all duration-500 ease-out relative z-10 ${
          hasSearched ? 'py-4 border-b border-[var(--cx-border)] bg-[var(--cx-background)]/80 backdrop-blur-xl' : 'flex-1 flex items-center justify-center'
        }`}
      >
        {/* Landing page layout (centered) */}
        {!hasSearched && (
          <div className="w-full px-4">
            <div className="text-center mb-10">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">
                <span className="text-white">Cut</span>
                <span className="text-amber-500">X</span>
              </h1>
              <p className="text-xl md:text-2xl font-medium text-[var(--cx-text-muted)] mb-2">
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
                onSearch={() => {}} // Search is triggered automatically by URL sync
                isSearching={isLoading}
                isCompact={false}
                autoFocus={true}
                onFileDrop={handleFileDrop}
                isImporting={fileImport.isImporting}
                importedFile={fileImport.importedFile}
                importError={fileImport.importError}
              />
            </div>
          </div>
        )}

        {/* Search results layout (Google-style: logo left, search bar right) */}
        {hasSearched && (
          <div className="w-full max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-6">
              {/* Logo - clickable to return home */}
              <button
                onClick={goHome}
                className="text-3xl font-black tracking-tighter hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <span className="text-white">Cut</span>
                <span className="text-amber-500">X</span>
              </button>

              {/* Search bar - takes remaining space */}
              <div className="flex-1 max-w-2xl">
                <HomeSearchBar
                  value={query}
                  onChange={setQuery}
                  onSearch={() => {}} // Search is triggered automatically by URL sync
                  isSearching={isLoading}
                  isCompact={true}
                  autoFocus={true}
                  onFileDrop={handleFileDrop}
                  isImporting={fileImport.isImporting}
                  importedFile={fileImport.importedFile}
                  importError={fileImport.importError}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results section */}
      {hasSearched && (
        <main className="flex-1 relative z-10">
          <SearchResults
            query={debouncedQuery}
            results={searchProducts}
            sponsored={sponsoredProducts}
            total={total}
            isLoading={isLoading && !integratedAI.isActive}
            hasMore={hasMore}
            facets={facets}
            parsedFilters={parsedFilters}
            activeFilters={activeFilters}
            onProductClick={handleProductClick}
            onFilterClick={addFilter}
            onClearFilter={removeFilter}
            onClearAllFilters={clearAllFilters}
            onLoadMore={handleLoadMore}
            isDraggable={fileImport.filesWithoutPanel.length > 0}
            // AI Integration
            aiMode={integratedAI.isActive}
            aiResponse={integratedAI.response}
            aiIsStreaming={integratedAI.isStreaming}
            aiRecap={integratedAI.recap}
            aiError={integratedAI.error}
            onAISendMessage={integratedAI.sendMessage}
            onAIValidate={integratedAI.validateAndRedirect}
          />
        </main>
      )}

      {/* Footer - only show when not searching */}
      {!hasSearched && (
        <footer className="py-8 text-center relative z-10">
          <p className="text-[var(--cx-text-muted)]/50 text-sm">
            &copy; {new Date().getFullYear()} CutX — Tous droits réservés
          </p>
        </footer>
      )}

      {/* Panel action popup */}
      <PanelActionPopup
        open={!!selectedProduct}
        product={selectedProduct}
        onClose={handleClosePopup}
        preImportedFile={fileImport.importedFile}
        preImportedLines={fileImport.importedLines}
        preImportError={fileImport.importError}
        onClearPreImport={fileImport.resetImport}
        importedFiles={fileImport.filesWithoutPanel}
        onAssignPanelToFiles={fileImport.assignPanelToFiles}
      />
    </div>
  );
}
