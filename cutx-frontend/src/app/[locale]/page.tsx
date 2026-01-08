'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import type { SearchProduct } from '@/components/home/types';
import { useFileImport } from '@/components/home/hooks/useFileImport';

// Type for active filters
interface ActiveFilter {
  type: string; // 'genre', 'thickness', 'dimension'
  value: string; // The filter value
  label: string; // Display label (e.g., "19mm" instead of "19")
}

export default function HomePage() {
  const t = useTranslations('common');

  // Search state
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null);
  const [sponsored, setSponsored] = useState<CatalogueProduit[]>([]);

  // File import hook for DXF/XLSX dropped on homepage
  const fileImport = useFileImport();

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

  // Handle search trigger
  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) {
      setHasSearched(true);
    }
  }, [query]);

  // Auto-search when typing
  // Note: Also check query.length to prevent re-triggering when user clicks logo to go home
  useEffect(() => {
    if (debouncedQuery.length >= 2 && query.length >= 2 && !hasSearched) {
      setHasSearched(true);
    }
  }, [debouncedQuery, query, hasSearched]);

  // Handle product click
  const handleProductClick = useCallback((product: SearchProduct) => {
    setSelectedProduct(product);
  }, []);

  // Handle filter click - add to activeFilters (not query text)
  const handleFilterClick = useCallback((filterType: string, value: string) => {
    // Create label based on filter type
    let label = value;
    if (filterType === 'thickness') {
      label = `${value}mm`;
    } else if (filterType === 'dimension') {
      label = value.replace('x', ' × ');
    }

    // Check if this filter is already active
    setActiveFilters(prev => {
      const exists = prev.some(f => f.type === filterType && f.value === value);
      if (exists) return prev; // Don't add duplicate
      return [...prev, { type: filterType, value, label }];
    });
  }, []);

  // Handle filter removal - remove from activeFilters
  const handleClearFilter = useCallback((filterType: string, value: string) => {
    setActiveFilters(prev => prev.filter(f => !(f.type === filterType && f.value === value)));
  }, []);

  // Handle clearing all filters
  const handleClearAllFilters = useCallback(() => {
    setActiveFilters([]);
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

  return (
    <div className="min-h-screen bg-[var(--cx-background)] flex flex-col relative overflow-hidden">
      {/* Header */}
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
                onSearch={handleSearch}
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
                onClick={() => {
                  setHasSearched(false);
                  setQuery('');
                  setActiveFilters([]);
                }}
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
                  onSearch={handleSearch}
                  isSearching={isLoading}
                  isCompact={true}
                  autoFocus={false}
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
            isLoading={isLoading}
            hasMore={hasMore}
            facets={facets}
            parsedFilters={parsedFilters}
            activeFilters={activeFilters}
            onProductClick={handleProductClick}
            onFilterClick={handleFilterClick}
            onClearFilter={handleClearFilter}
            onClearAllFilters={handleClearAllFilters}
            onLoadMore={handleLoadMore}
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
      />

    </div>
  );
}
