'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { CutXAppsMenu } from '@/components/ui/CutXAppsMenu';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCatalogueSearch } from '@/lib/hooks/useCatalogueSearch';
import { getSponsored, type CatalogueProduit } from '@/lib/services/catalogue-api';
import { extractDecorFromName } from '@/lib/services/panneaux-catalogue';
import {
  HomeSearchBar,
  SearchResults,
  ProductDetailModal,
} from '@/components/home';
import FilesPanel, { DropZoneVisual } from '@/components/home/ImportWorkspace/FilesPanel';
import WorkspaceBottomBar from '@/components/home/ImportWorkspace/WorkspaceBottomBar';
import SplitThicknessModal from '@/components/home/ImportWorkspace/SplitThicknessModal';
import {
  MulticoucheBuilder,
  MulticoucheBuilderProvider,
  useMulticoucheBuilder,
  ModeSelector,
  type HomePanelMode,
} from '@/components/home/multicouche-builder';
import dynamic from 'next/dynamic';
import { MULTI_GROUP_CONFIG_KEY, MASSIF_PIECES_STORAGE_KEY, type GroupConfig } from '@/components/home/MultiFileImportWizard';
import type { DxfMassifPiece } from '@/lib/configurateur/import/types';

// Client-only component - never rendered on server
const OnboardingGuide = dynamic(
  () => import('@/components/home/OnboardingGuide'),
  { ssr: false }
);
import type { SearchProduct } from '@/components/home/types';
import { useFileImport } from '@/components/home/hooks/useFileImport';
import { useSearchState } from '@/components/home/hooks/useSearchState';
import { useRouter, Link } from '@/i18n/routing';
import { Upload, ClipboardCheck, Play, Settings } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { UserAccountMenu } from '@/components/ui/UserAccountMenu';
import { useIsAdmin } from '@/lib/hooks/useIsAdmin';

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
      <MulticoucheBuilderProvider>
        <HomePageContent />
      </MulticoucheBuilderProvider>
    </Suspense>
  );
}

function HomePageContent() {
  const t = useTranslations('common');
  const { isSignedIn } = useUser();
  const { isAdmin } = useIsAdmin();

  // Multicouche builder context
  const multicoucheBuilder = useMulticoucheBuilder();

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

  const [sponsored, setSponsored] = useState<CatalogueProduit[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isDraggingOnPanel, setIsDraggingOnPanel] = useState(false);
  const [splitModalFileId, setSplitModalFileId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLaunchMessage, setShowLaunchMessage] = useState(false);
  // Chant (edge banding) search mode - tracks which file we're searching chant for
  const [searchingChantForFileId, setSearchingChantForFileId] = useState<string | null>(null);
  // Panel search mode - tracks which file we're searching panel for (from "Rechercher" button)
  const [searchingPanelForFileId, setSearchingPanelForFileId] = useState<string | null>(null);
  // Chant search mode for multicouche builder
  const [searchingChantForMulticouche, setSearchingChantForMulticouche] = useState(false);
  // Product detail modal
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  // Search category: panels (panneaux), chants (bandes de chant), all (tous)
  const [searchCategory, setSearchCategory] = useState<'panels' | 'chants' | 'all'>('all');
  // Panel mode: industriel (fichiers) ou multicouche (builder)
  const [panelMode, setPanelMode] = useState<HomePanelMode>('industriel');
  // Suggested chant for the panel being searched
  const [suggestedChant, setSuggestedChant] = useState<{
    chant: SearchProduct | null;
    reason: string;
    panelIsRealWood?: boolean;
    thicknessVariants?: { thickness: number; chant: SearchProduct }[];
  } | null>(null);

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

  // Manual demo trigger - reset and start fresh demo
  const handleStartDemo = useCallback(() => {
    // Reset everything first
    goHome();
    fileImport.resetImport();
    setSelectedFileId(null);

    // Add mock file and show onboarding
    fileImport.addMockFile();
    setShowOnboarding(true);
  }, [fileImport, goHome]);

  const debouncedQuery = useDebounce(query, 300);

  // Extract explicit filters (handled via API parameters, not text search)
  const explicitFilters = useMemo(() => {
    const decorCategory = activeFilters.find(f => f.type === 'decorCategory')?.value;
    const manufacturer = activeFilters.find(f => f.type === 'manufacturer')?.value;
    const isHydrofuge = activeFilters.some(f => f.type === 'property' && f.value === 'hydrofuge');
    const isIgnifuge = activeFilters.some(f => f.type === 'property' && f.value === 'ignifuge');
    const isPreglued = activeFilters.some(f => f.type === 'property' && f.value === 'preglued');
    const enStock = activeFilters.some(f => f.type === 'stock');

    return { decorCategory, manufacturer, isHydrofuge, isIgnifuge, isPreglued, enStock };
  }, [activeFilters]);

  // Construct combined search query from base query + text-based filters only
  // (thickness, dimension, genre are added to text query; decorCategory, manufacturer, property use API params)
  const combinedQuery = useMemo(() => {
    const textFilters = activeFilters.filter(f =>
      !['stock', 'decorCategory', 'manufacturer', 'property'].includes(f.type)
    );
    if (textFilters.length === 0) return debouncedQuery;

    const filterTerms = textFilters.map(f => {
      if (f.type === 'thickness') return `${f.value}mm`;
      return f.value;
    });

    return `${debouncedQuery} ${filterTerms.join(' ')}`.trim();
  }, [debouncedQuery, activeFilters]);

  // Search hook with smart search - uses combined query + explicit filters
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
    enStock: explicitFilters.enStock || undefined,
    // Catégorie: panels | chants | all
    category: searchCategory,
    decorCategory: explicitFilters.decorCategory,
    manufacturer: explicitFilters.manufacturer,
    isHydrofuge: explicitFilters.isHydrofuge || undefined,
    isIgnifuge: explicitFilters.isIgnifuge || undefined,
    isPreglued: explicitFilters.isPreglued || undefined,
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

  // Fetch suggested chant when entering chant search mode
  useEffect(() => {
    if (!searchingChantForFileId) {
      setSuggestedChant(null);
      return;
    }
    const file = fileImport.importedFiles.find(f => f.id === searchingChantForFileId);
    if (!file?.assignedPanel?.id) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';
    fetch(`${apiUrl}/api/panels/${file.assignedPanel.id}/best-matching-chant`)
      .then(res => res.json())
      .then(data => {
        if (data.chant) {
          // Map thickness variants to SearchProduct format
          const thicknessVariants = (data.thicknessVariants || []).map(
            (v: { thickness: number; chant: { id: string; reference: string; name: string; imageUrl?: string; pricePerMl?: number; defaultThickness?: number; defaultWidth?: number; stockStatus?: string; catalogue?: { name: string } } }) => ({
              thickness: v.thickness,
              chant: {
                id: v.chant.id,
                reference: v.chant.reference,
                nom: v.chant.name,
                imageUrl: v.chant.imageUrl,
                prixMl: v.chant.pricePerMl,
                epaisseur: v.chant.defaultThickness,
                largeur: v.chant.defaultWidth,
                stock: v.chant.stockStatus,
                fournisseur: v.chant.catalogue?.name,
              },
            })
          );

          setSuggestedChant({
            chant: {
              id: data.chant.id,
              reference: data.chant.reference,
              nom: data.chant.name,
              imageUrl: data.chant.imageUrl,
              prixMl: data.chant.pricePerMl,
              epaisseur: data.chant.defaultThickness,
              largeur: data.chant.defaultWidth,
              stock: data.chant.stockStatus,
              fournisseur: data.chant.catalogue?.name,
            },
            reason: data.reason,
            panelIsRealWood: data.panelIsRealWood,
            thicknessVariants,
          });
        }
      })
      .catch(err => console.error('[SuggestedChant] Error:', err));
  }, [searchingChantForFileId, fileImport.importedFiles]);

  // Handle product click - create virtual file, assign panel, assign chant, or assign to multicouche layer
  const handleProductClick = useCallback((product: SearchProduct) => {
    if (searchingChantForFileId) {
      // In chant search mode (industriel) - assign chant and exit mode
      fileImport.assignChantToFile(searchingChantForFileId, product);
      setSearchingChantForFileId(null);
      // Don't clear search - user might want to continue browsing
    } else if (searchingChantForMulticouche) {
      // In chant search mode (multicouche) - assign chant to builder and exit mode
      multicoucheBuilder.assignerChant(product);
      setSearchingChantForMulticouche(false);
      console.log('[HomePage] Assigned chant to multicouche builder:', product.nom);
    } else if (searchingPanelForFileId) {
      // In panel search mode - assign panel to existing file and exit mode
      fileImport.assignPanelToFile(searchingPanelForFileId, product);
      setSearchingPanelForFileId(null);
      console.log('[HomePage] Assigned panel to file from click:', product.nom);
    } else if (panelMode === 'multicouche' && multicoucheBuilder.activeCoucheId) {
      // In multicouche mode with active layer - assign product to layer
      multicoucheBuilder.assignerProduit(multicoucheBuilder.activeCoucheId, product);
      console.log('[HomePage] Assigned product to multicouche layer:', product.nom);
    } else if (panelMode === 'multicouche') {
      // In multicouche mode but no active layer - do nothing, user must select a layer first
      console.log('[HomePage] Multicouche mode: select a layer first');
    } else {
      // Normal mode (industriel) - create virtual file in right column (same as drag & drop)
      fileImport.addVirtualFile(product);
      console.log('[HomePage] Created virtual file from click:', product.nom);
    }
  }, [searchingChantForFileId, searchingChantForMulticouche, searchingPanelForFileId, fileImport, panelMode, multicoucheBuilder]);

  // Handle panel search - triggered from FilesPanel "Rechercher" button on detected panel
  const handleSearchPanel = useCallback((file: import('@/components/home/hooks/useFileImport').ImportedFileData) => {
    setSearchingPanelForFileId(file.id);
    // Set search query to detected panel search query
    const searchTerm = file.detection?.panelSearchQuery || '';
    setQuery(searchTerm);
    console.log('[HomePage] Entering panel search mode for file:', file.id);
  }, [setQuery]);

  // Handle chant search - triggered from FilesPanel "Ajouter bande de chant" button
  const handleSearchChant = useCallback((file: import('@/components/home/hooks/useFileImport').ImportedFileData) => {
    setSearchingChantForFileId(file.id);
    // Activate Chants filter
    setSearchCategory('chants');
    // Extract decor from assigned panel name as search suggestion
    const decor = file.assignedPanel?.nom ? extractDecorFromName(file.assignedPanel.nom) : null;
    setQuery(decor || '');
  }, [setQuery]);

  // Handle chant search for multicouche builder
  const handleSearchChantMulticouche = useCallback(() => {
    setSearchingChantForMulticouche(true);
    // Activate Chants filter
    setSearchCategory('chants');
    // Clear query to start fresh search
    setQuery('');
    console.log('[HomePage] Entering chant search mode for multicouche builder');
  }, [setQuery]);

  // Handle clear chant - triggered from FilesPanel
  const handleClearChant = useCallback((fileId: string) => {
    fileImport.clearChantFromFile(fileId);
  }, [fileImport]);

  // Handle chant suggestion click - search for matching chants with the manufacturer ref
  // User clicks on "Chant suggéré: H1180" → opens search filtered to edge bandings
  const handleSearchSuggestedChant = useCallback((file: import('@/components/home/hooks/useFileImport').ImportedFileData) => {
    const manufacturerRef = file.assignedPanel?.refFabricant;
    if (!manufacturerRef) return;

    // Enter chant search mode for this file
    setSearchingChantForFileId(file.id);
    // Search for chants matching the panel's manufacturer ref
    setQuery(`chant ${manufacturerRef}`);
    console.log(`[ChantSuggestion] Searching for chant matching: ${manufacturerRef}`);
  }, [setQuery]);

  // Cancel search modes when user clears search or goes home
  const handleGoHome = useCallback(() => {
    setSearchingChantForFileId(null);
    setSearchingPanelForFileId(null);
    goHome();
  }, [goHome]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  // Open product detail modal
  const handleViewDetails = useCallback((productId: string) => {
    setDetailProductId(productId);
  }, []);

  // Close product detail modal
  const handleCloseDetailModal = useCallback(() => {
    setDetailProductId(null);
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

  // Handle drop on right panel (from drag event) - supports multiple files AND product drops
  const handlePanelDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOnPanel(false);

    // 1. Check for product drop first (from search results drag)
    if (e.dataTransfer.types.includes('application/json')) {
      try {
        const productJson = e.dataTransfer.getData('application/json');
        if (productJson) {
          const product = JSON.parse(productJson) as SearchProduct;
          // Create virtual file with pre-assigned panel
          fileImport.addVirtualFile(product);
          console.log('[HomePage] Created virtual file from product drop:', product.nom);
          return; // Don't process as file drop
        }
      } catch (error) {
        console.error('[HomePage] Error parsing product drop:', error);
      }
    }

    // 2. Handle file drops (.xlsx, .xls, .dxf)
    const files = e.dataTransfer.files;
    const supportedExts = ['dxf', 'xlsx', 'xls'];

    // Process ALL dropped files, not just the first one
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && supportedExts.includes(ext)) {
        handleFileDrop(file);
      }
    }
  }, [handleFileDrop, fileImport]);

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
      // Use first file's chant if available (all files in group typically share the same chant)
      const chant = files.find(f => f.assignedChant)?.assignedChant;
      groupConfigs.push({
        panel,
        lines: files.flatMap(f => f.lines),
        sourceFileNames: files.map(f => f.name),
        chant,
      });
    }

    // Collect all massif pieces from all imported files (bois massif = non panel cuts)
    const allMassifPieces: DxfMassifPiece[] = [];
    // Include ALL imported files, not just those with panels assigned
    fileImport.importedFiles.forEach(file => {
      if (file.massifPieces && file.massifPieces.length > 0) {
        allMassifPieces.push(...file.massifPieces);
      }
    });

    // Save to session storage and navigate
    sessionStorage.setItem(MULTI_GROUP_CONFIG_KEY, JSON.stringify(groupConfigs));
    // Store massif pieces separately (will become unassigned lines in configurateur)
    if (allMassifPieces.length > 0) {
      sessionStorage.setItem(MASSIF_PIECES_STORAGE_KEY, JSON.stringify(allMassifPieces));
      console.log('[Homepage] Stored', allMassifPieces.length, 'massif pieces');
    }

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
    <div className="fixed inset-0 w-full h-full bg-[var(--cx-background)] flex flex-col overflow-hidden">
      {/* Main content - permanent 75/25 split */}
      <main className="flex-1 flex min-h-0 w-full">
        {/* Left panel - Search (75%) */}
        <div className="w-[75%] flex flex-col min-h-0 relative">
          {/* Top left - User avatar + Apps menu */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <UserAccountMenu />
            <CutXAppsMenu />
          </div>

          {/* Top right - Demo + Review + Language switcher */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
            <button
              onClick={handleStartDemo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--cx-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 rounded-full border border-[var(--cx-border)] hover:border-amber-500/30 transition-colors"
              title="Lancer la démo"
            >
              <Play size={12} fill="currentColor" />
              <span>Démo</span>
            </button>
            {isSignedIn && (
              <Link
                href="/panels-review"
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-amber-500/60 hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                title="Review des panneaux"
              >
                <ClipboardCheck size={14} />
                <span className="hidden sm:inline">Review</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin/fournisseurs"
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-violet-400/60 hover:text-violet-400 hover:bg-violet-500/10 rounded transition-colors"
                title="Administration"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
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
                <div className="text-center mb-8">
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

                {/* MODE SELECTOR - LE CHOIX SE FAIT ICI, AVANT LA RECHERCHE */}
                <div className="flex justify-center mb-6">
                  <ModeSelector
                    mode={panelMode}
                    onModeChange={setPanelMode}
                    industrielCount={fileImport.totalFiles}
                    multicoucheCount={multicoucheBuilder.couches.filter(c => c.produit).length}
                  />
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
                    onClick={handleGoHome}
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
                    {/* Chant search mode indicator (industriel) */}
                    {searchingChantForFileId && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                          Sélectionnez une bande de chant
                        </span>
                        <button
                          onClick={() => setSearchingChantForFileId(null)}
                          className="text-xs text-[var(--cx-text-muted)] hover:text-amber-400 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                    {/* Chant search mode indicator (multicouche) */}
                    {searchingChantForMulticouche && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                          Chant pour panneau multicouche
                        </span>
                        <button
                          onClick={() => setSearchingChantForMulticouche(false)}
                          className="text-xs text-[var(--cx-text-muted)] hover:text-amber-400 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results section */}
          {hasSearched && (
            <div className="flex-1 overflow-y-auto relative z-10">
              {/* Mode selector + Category tabs - LE CHOIX CLEF SE FAIT ICI */}
              <div className="w-full max-w-6xl mx-auto px-4 pt-4">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Mode: Industriel / Multicouche - THE KEY CHOICE */}
                  <ModeSelector
                    mode={panelMode}
                    onModeChange={setPanelMode}
                    industrielCount={fileImport.totalFiles}
                    multicoucheCount={multicoucheBuilder.couches.filter(c => c.produit).length}
                  />

                  {/* Separator */}
                  <div className="h-8 w-px bg-[var(--cx-border)]" />

                  {/* Category tabs - Panneaux | Chants | Tous */}
                  <div className="flex items-center gap-1 p-1 bg-[var(--cx-surface-1)] border border-[var(--cx-border)] rounded-lg">
                    <button
                      onClick={() => setSearchCategory('panels')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        searchCategory === 'panels'
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
                      }`}
                    >
                      Panneaux
                    </button>
                    <button
                      onClick={() => setSearchCategory('chants')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        searchCategory === 'chants'
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
                      }`}
                    >
                      Chants
                    </button>
                    <button
                      onClick={() => setSearchCategory('all')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        searchCategory === 'all'
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] hover:bg-white/5'
                      }`}
                    >
                      Tous
                    </button>
                  </div>
                </div>

                {/* Suggested chant - shown when in chant search mode */}
                {searchingChantForFileId && suggestedChant?.chant && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
                        Chant suggéré
                      </span>
                      {suggestedChant.panelIsRealWood && (
                        <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                          Panneau plaqué bois
                        </span>
                      )}
                    </div>

                    {/* Thickness variants selector */}
                    {suggestedChant.thicknessVariants && suggestedChant.thicknessVariants.length > 1 && (
                      <div className="mb-3">
                        <span className="text-[10px] text-[var(--cx-text-muted)] uppercase tracking-wide mr-2">
                          Épaisseurs disponibles :
                        </span>
                        <div className="inline-flex gap-1 mt-1">
                          {suggestedChant.thicknessVariants.map((variant) => (
                            <button
                              key={variant.thickness}
                              onClick={() => {
                                setSuggestedChant(prev => prev ? {
                                  ...prev,
                                  chant: variant.chant,
                                } : null);
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                suggestedChant.chant?.epaisseur === variant.thickness
                                  ? 'bg-amber-500 text-white font-medium'
                                  : 'bg-[var(--cx-surface-2)] text-[var(--cx-text-muted)] hover:bg-amber-500/20 hover:text-amber-500'
                              }`}
                            >
                              {variant.thickness}mm
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        if (suggestedChant.chant) {
                          handleProductClick(suggestedChant.chant);
                        }
                      }}
                      className="w-full flex items-center gap-4 p-3 bg-[var(--cx-surface-1)] hover:bg-[var(--cx-surface-2)] border border-[var(--cx-border)] rounded-lg transition-colors text-left group"
                    >
                      {suggestedChant.chant.imageUrl && (
                        <img
                          src={suggestedChant.chant.imageUrl}
                          alt=""
                          className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--cx-text)] truncate group-hover:text-amber-500 transition-colors">
                          {suggestedChant.chant.nom}
                        </p>
                        <p className="text-xs text-[var(--cx-text-muted)] mt-1">
                          {suggestedChant.reason}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--cx-text-tertiary)]">
                          {suggestedChant.chant.largeur && (
                            <span>{suggestedChant.chant.largeur}mm</span>
                          )}
                          {suggestedChant.chant.epaisseur && (
                            <span>ép. {suggestedChant.chant.epaisseur}mm</span>
                          )}
                          {suggestedChant.chant.prixMl && (
                            <span className="text-amber-500 font-medium">
                              {suggestedChant.chant.prixMl.toFixed(2)}€/mL
                            </span>
                          )}
                          {suggestedChant.chant.fournisseur && (
                            <span className="text-[var(--cx-text-muted)]">
                              {suggestedChant.chant.fournisseur}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </button>
                  </div>
                )}
              </div>
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
                onViewDetails={handleViewDetails}
                onFilterClick={addFilter}
                onClearFilter={removeFilter}
                onClearAllFilters={clearAllFilters}
                onLoadMore={handleLoadMore}
                isDraggable={true}
                onSearchWithSuggestion={setQuery}
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

        {/* Right panel - Files or Multicouche Builder (25%) - Always visible */}
        <div
          className={`w-[25%] flex flex-col min-h-0 border-l transition-colors duration-200 ${
            isDraggingOnPanel
              ? 'border-amber-500 bg-amber-500/5'
              : 'border-[var(--cx-border)] bg-[var(--cx-surface-1)]/30'
          }`}
          onDragOver={panelMode === 'industriel' ? handlePanelDragOver : (e) => {
            // In multicouche mode, allow drag events to propagate to LayerCard children
            // Without preventDefault on dragover, browser won't allow drops
            e.preventDefault();
          }}
          onDragLeave={panelMode === 'industriel' ? handlePanelDragLeave : undefined}
          onDrop={panelMode === 'industriel' ? handlePanelDrop : (e) => {
            // Let child LayerCard components handle the drop
            e.preventDefault();
          }}
        >
          {/* Content based on mode (Mode selector is in search area) */}
          {panelMode === 'industriel' ? (
            <>
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
                    onSearchPanel={handleSearchPanel}
                    onSplitByThickness={handleOpenSplitModal}
                    onSearchChant={handleSearchChant}
                    onSearchSuggestedChant={handleSearchSuggestedChant}
                    onAssignChant={fileImport.assignChantToFile}
                    onClearChant={handleClearChant}
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
            </>
          ) : (
            /* Multicouche builder */
            <MulticoucheBuilder onSearchChant={handleSearchChantMulticouche} />
          )}
        </div>
      </main>

      {/* Split by thickness modal */}
      <SplitThicknessModal
        open={!!splitModalFileId}
        file={splitModalFileId ? fileImport.importedFiles.find(f => f.id === splitModalFileId) || null : null}
        onSplit={handleConfirmSplit}
        onCancel={handleCloseSplitModal}
      />

      {/* Product detail modal */}
      <ProductDetailModal
        open={!!detailProductId}
        productId={detailProductId}
        onClose={handleCloseDetailModal}
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
          <h2 className="text-base font-semibold text-[var(--cx-text)]">Configuration de débits</h2>
        </div>
      </div>

      {/* Drop zone content - same visual as AddMoreFilesZone in FilesPanel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <DropZoneVisual isDragging={isDragging} />

        {/* Or separator + drag hint */}
        {!isDragging && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <span className="text-xs text-[var(--cx-text-muted)]/50">ou</span>
            <p className="text-sm text-[var(--cx-text-muted)] text-center max-w-[200px]">
              Glissez un panneau depuis<br />le moteur de recherche
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
