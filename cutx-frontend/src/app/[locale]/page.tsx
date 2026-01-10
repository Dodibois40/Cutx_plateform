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
import FilesPanel, { DropZoneVisual } from '@/components/home/ImportWorkspace/FilesPanel';
import WorkspaceBottomBar from '@/components/home/ImportWorkspace/WorkspaceBottomBar';
import SplitThicknessModal from '@/components/home/ImportWorkspace/SplitThicknessModal';
import dynamic from 'next/dynamic';
import { MULTI_GROUP_CONFIG_KEY, type GroupConfig } from '@/components/home/MultiFileImportWizard';

// Client-only component - never rendered on server
const OnboardingGuide = dynamic(
  () => import('@/components/home/OnboardingGuide'),
  { ssr: false }
);
import type { SearchProduct } from '@/components/home/types';
import { useFileImport } from '@/components/home/hooks/useFileImport';
import { useSearchState } from '@/components/home/hooks/useSearchState';
import { useRouter } from '@/i18n/routing';
import { Upload } from 'lucide-react';

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
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isDraggingOnPanel, setIsDraggingOnPanel] = useState(false);
  const [splitModalFileId, setSplitModalFileId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLaunchMessage, setShowLaunchMessage] = useState(false);

  // File import hook for DXF/XLSX dropped on homepage
  const fileImport = useFileImport();

  // Onboarding: show on first file import, hide when user types or closes
  const ONBOARDING_KEY = 'cutx-onboarding-seen';
  useEffect(() => {
    if (!mounted) return;
    // Show onboarding only if user has files without panel AND hasn't seen the demo yet
    if (fileImport.filesWithoutPanel.length > 0 && !localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, [mounted, fileImport.filesWithoutPanel.length]);

  const handleCloseOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');

    // Reset everything after demo - goHome() resets hasSearched to false
    goHome();
    fileImport.resetImport();
    setSelectedFileId(null);

    // Show "Lancez-vous" message
    setShowLaunchMessage(true);
    setTimeout(() => {
      setShowLaunchMessage(false);
    }, 2000);
  }, [fileImport, goHome]);

  const debouncedQuery = useDebounce(query, 300);

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

  // Auto-select first unassigned file
  useEffect(() => {
    if (!selectedFileId && fileImport.importedFiles.length > 0) {
      const firstUnassigned = fileImport.importedFiles.find(f => !f.assignedPanel);
      if (firstUnassigned) {
        setSelectedFileId(firstUnassigned.id);
      }
    }
  }, [fileImport.importedFiles, selectedFileId]);

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

  // Handle split by thickness
  const handleOpenSplitModal = useCallback((fileId: string) => {
    setSplitModalFileId(fileId);
  }, []);

  const handleCloseSplitModal = useCallback(() => {
    setSplitModalFileId(null);
  }, []);

  const handleConfirmSplit = useCallback((fileId: string) => {
    console.log('[HomePage] handleConfirmSplit called, fileId:', fileId);
    console.log('[HomePage] fileImport.splitFileByThickness type:', typeof fileImport.splitFileByThickness);
    if (typeof fileImport.splitFileByThickness === 'function') {
      fileImport.splitFileByThickness(fileId);
    } else {
      console.error('[HomePage] splitFileByThickness is not a function!', fileImport);
    }
    console.log('[HomePage] splitFileByThickness called');
    setSplitModalFileId(null);
  }, [fileImport]);

  // Handle file drop on homepage search bar or right panel
  const handleFileDrop = useCallback(async (file: File) => {
    console.log('[HomePage] File dropped:', file.name);
    await fileImport.processFile(file);
  }, [fileImport]);

  // Handle drop on right panel (from drag event)
  const handlePanelDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOnPanel(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      const supportedExts = ['dxf', 'xlsx', 'xls'];
      if (ext && supportedExts.includes(ext)) {
        handleFileDrop(file);
      }
    }
  }, [handleFileDrop]);

  const handlePanelDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOnPanel(true);
  }, []);

  const handlePanelDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOnPanel(false);
  }, []);

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

  // First product for onboarding demo drag animation
  const firstSearchProduct = searchProducts.length > 0 ? searchProducts[0] : null;

  // Computed values
  const assignedCount = fileImport.filesWithPanel.length;
  const hasFiles = mounted && fileImport.totalFiles > 0;

  return (
    <div className="fixed inset-0 bg-[var(--cx-background)] flex flex-col">
      {/* Main content - permanent 75/25 split */}
      <main className="flex-1 flex min-h-0">
        {/* Left panel - Search (75%) */}
        <div className="w-[75%] flex flex-col min-h-0 relative">
          {/* Language switcher - inside left panel, top right */}
          <div className="absolute top-4 right-4 z-20">
            <LocaleSwitcher />
          </div>
          {/* Search section - centered or top based on state */}
          <div
            className={`w-full transition-all duration-500 ease-out relative z-10 ${
              hasSearched
                ? 'flex-shrink-0 py-4 border-b border-[var(--cx-border)] bg-[var(--cx-background)]/80 backdrop-blur-xl'
                : 'flex-1 flex items-center justify-center'
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
                    {t('home.description')}
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
                  />
                </div>
              </div>
            )}

            {/* Search results layout (Google-style: logo left, search bar right) */}
            {hasSearched && (
              <div className="w-full max-w-5xl mx-auto px-4">
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
                      onSearch={() => {}}
                      isSearching={isLoading}
                      isCompact={true}
                      autoFocus={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results section */}
          {hasSearched && (
            <div className="flex-1 overflow-y-auto relative z-10">
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
                onProductClick={handleProductClick}
                onFilterClick={addFilter}
                onClearFilter={removeFilter}
                onClearAllFilters={clearAllFilters}
                onLoadMore={handleLoadMore}
                isDraggable={hasFiles}
              />
            </div>
          )}

          {/* Footer - only show when not searching */}
          {!hasSearched && (
            <footer className="py-8 text-center relative z-10">
              <p className="text-[var(--cx-text-muted)]/50 text-sm">
                &copy; {new Date().getFullYear()} CutX — Tous droits réservés
              </p>
            </footer>
          )}
        </div>

        {/* Right panel - Files (25%) - Always visible */}
        <div
          className={`w-[25%] flex flex-col min-h-0 border-l transition-colors duration-200 ${
            isDraggingOnPanel
              ? 'border-amber-500 bg-amber-500/5'
              : 'border-[var(--cx-border)] bg-[var(--cx-surface-1)]/30'
          }`}
          onDragOver={handlePanelDragOver}
          onDragLeave={handlePanelDragLeave}
          onDrop={handlePanelDrop}
        >
          {/* Files content */}
          <div className="flex-1 min-h-0">
            {hasFiles ? (
              <FilesPanel
                files={fileImport.importedFiles}
                selectedFileId={selectedFileId}
                onSelectFile={setSelectedFileId}
                onRemoveFile={fileImport.removeFile}
                onUnassignPanel={fileImport.unassignPanel}
                onAssignPanel={fileImport.assignPanelToFile}
                onFileDrop={handleFileDrop}
                isImporting={fileImport.isImporting}
                onSearchPanel={setQuery}
                onSplitByThickness={handleOpenSplitModal}
              />
            ) : (
              <EmptyDropZone isDragging={isDraggingOnPanel} />
            )}
          </div>

          {/* Bottom bar - inside right panel */}
          {hasFiles && (
            <WorkspaceBottomBar
              totalFiles={fileImport.totalFiles}
              assignedFiles={assignedCount}
              totalPieces={fileImport.totalLines}
              allAssigned={fileImport.allFilesHavePanel}
              onConfigureAll={handleConfigureAll}
              onReset={fileImport.resetImport}
            />
          )}
        </div>
      </main>

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

      {/* Split by thickness modal */}
      <SplitThicknessModal
        open={!!splitModalFileId}
        file={splitModalFileId ? fileImport.importedFiles.find(f => f.id === splitModalFileId) || null : null}
        onSplit={handleConfirmSplit}
        onCancel={handleCloseSplitModal}
      />

      {/* Onboarding overlay - shows on first file import */}
      {showOnboarding && (
        <OnboardingGuide
          onClose={handleCloseOnboarding}
          onTypeText={setQuery}
          onAddMockFile={fileImport.addMockFile}
          onAssignPanel={fileImport.assignPanelToFile}
          firstProduct={firstSearchProduct}
        />
      )}

      {/* "Lancez-vous" message after onboarding - positioned above CutX logo */}
      {showLaunchMessage && (
        <div className="fixed z-50 left-[40%] top-[28%] -translate-x-1/2 pointer-events-none">
          <div
            className="px-6 py-3 rounded-xl bg-[#1a1a19]/90 border border-amber-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.4)] backdrop-blur-sm"
            style={{
              animation: 'fadeInOut 2s ease-in-out forwards',
            }}
          >
            <span className="text-lg font-semibold text-white">Lancez-vous !</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Empty state drop zone for right panel - uses shared DropZoneVisual for consistency
function EmptyDropZone({ isDragging }: { isDragging: boolean }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--cx-border)]">
        <div className="flex items-center gap-3">
          <Upload className="w-5 h-5 text-amber-500/70" />
          <h2 className="text-base font-semibold text-[var(--cx-text)]">Fichiers</h2>
        </div>
      </div>

      {/* Drop zone content - same visual as AddMoreFilesZone in FilesPanel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <DropZoneVisual isDragging={isDragging} />
      </div>
    </div>
  );
}
