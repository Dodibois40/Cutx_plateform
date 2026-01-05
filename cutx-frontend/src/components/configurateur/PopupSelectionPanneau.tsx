'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Loader2,
  Info,
} from 'lucide-react';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { ProduitCatalogue } from '@/lib/catalogues';
import {
  getSousCategories as getCategoriesAPI,
  getCatalogues as getCataloguesAPI,
  type CatalogueProduit,
} from '@/lib/services/catalogue-api';
import { useCatalogueSearch } from '@/lib/hooks/useCatalogueSearch';
import { useDebounce } from '@/lib/hooks/useDebounce';
import PopupFicheProduit, { type PanelDetails } from '@/components/produit/PopupFicheProduit';
import SearchAutocomplete from '@/components/ui/SearchAutocomplete';
import { usePanneauxRecents } from '@/lib/hooks/usePanneauxRecents';

type SortColumn = 'nom' | 'epaisseur' | 'prix' | 'stock' | 'reference' | null;
type SortDirection = 'asc' | 'desc';

// Types de produits (basés sur productType en DB)
const PRODUCT_TYPE_KEYS = ['MELAMINE', 'STRATIFIE', 'PLACAGE', 'BANDE_DE_CHANT', 'COMPACT'] as const;

// Épaisseurs disponibles (basé sur l'analyse de la DB)
const EPAISSEURS_PANNEAUX = [8, 12, 16, 19, 38];
const EPAISSEURS_CHANTS = [0.7, 0.8, 0.9, 1, 1.2, 1.5, 2];

// Composant Image avec état de chargement - styles inline pour forcer le carré
function ProductImage({ src, alt }: { src: string | undefined; alt: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '48px',
    height: '48px',
    minWidth: '48px',
    minHeight: '48px',
    maxWidth: '48px',
    maxHeight: '48px',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid var(--admin-border-subtle)',
    background: 'var(--admin-bg-tertiary)',
    flexShrink: 0,
  };

  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    opacity: isLoading ? 0 : 1,
    transition: 'opacity 0.2s ease',
  };

  const noImageStyle: React.CSSProperties = {
    ...containerStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--admin-text-muted)',
  };

  if (!src || hasError) {
    return <div style={noImageStyle}><ImageIcon size={16} /></div>;
  }

  return (
    <div style={containerStyle}>
      {isLoading && (
        <div className="image-loading">
          <div className="image-spinner" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        style={imageStyle}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}

// Composant Skeleton Loader
function SkeletonRow() {
  return (
    <tr className="skeleton-row">
      <td><div className="skeleton skeleton-image" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-text-lg" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-text-xs" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-text-sm" /></td>
      <td><div className="skeleton skeleton-badge" /></td>
    </tr>
  );
}

interface PopupSelectionPanneauProps {
  open: boolean;
  panneauxCatalogue: PanneauCatalogue[];
  selectedPanneauId: string | null;
  epaisseurActuelle: number;
  onSelect: (panneau: PanneauCatalogue, prixM2: number) => void;
  onSelectCatalogue?: (produit: ProduitCatalogue) => void;
  onClose: () => void;
  // Filtres initiaux pour présélection selon type de couche
  initialSearch?: string;
  initialSousCategories?: string[]; // Permet de filtrer sur plusieurs catégories (ex: Âme = basique + technique)
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

export default function PopupSelectionPanneau({
  open,
  onSelectCatalogue,
  onClose,
  initialSearch = '',
  initialSousCategories = [],
}: PopupSelectionPanneauProps) {
  const t = useTranslations('dialogs.panelSelection');
  const [mounted, setMounted] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Hook pour les panneaux récents
  const { recents, addRecent } = usePanneauxRecents(10);

  // Panel detail popup state
  const [selectedPanelDetail, setSelectedPanelDetail] = useState<PanelDetails | null>(null);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Recherche et filtres
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search, 300); // Debounce 300ms
  const [filtreSousCategories, setFiltreSousCategories] = useState<string[]>(initialSousCategories);
  const [filtreProductType, setFiltreProductType] = useState<string>('');
  const [filtreEpaisseur, setFiltreEpaisseur] = useState<number | null>(null);
  const [filtreEnStock, setFiltreEnStock] = useState(false);
  const [filtreCatalogue, setFiltreCatalogue] = useState<string>('');
  const [sousCategories, setSousCategories] = useState<string[]>([]);
  const [catalogues, setCatalogues] = useState<{ slug: string; name: string }[]>([]);

  // Tri
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // React Query pour le chargement des produits avec cache
  const {
    produits,
    total,
    hasMore,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    fetchNextPage,
  } = useCatalogueSearch({
    search: debouncedSearch || undefined,
    productType: filtreProductType || undefined,
    sousCategorie: filtreSousCategories.length === 1 ? filtreSousCategories[0] : undefined,
    epaisseur: filtreEpaisseur || undefined,
    enStock: filtreEnStock || undefined,
    catalogue: filtreCatalogue || undefined,
    sortBy: sortColumn || undefined,
    sortDirection: sortColumn ? sortDirection : undefined,
    enabled: open && mounted,
  });

  // Filtrage côté client pour multi sous-catégories
  const filteredProduits = filtreSousCategories.length > 1
    ? produits.filter(p => filtreSousCategories.includes(p.sousCategorie))
    : produits;

  // Épaisseurs dynamiques selon le type de produit
  const epaisseurs = filtreProductType === 'BANDE_DE_CHANT' ? EPAISSEURS_CHANTS : EPAISSEURS_PANNEAUX;

  const hasFilters = search || filtreSousCategories.length > 0 || filtreProductType || filtreEpaisseur || filtreEnStock || filtreCatalogue;

  // Détecter le scroll pour charger plus (infinite scroll)
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container || !open) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Charger plus quand on est à 200px du bas
      if (scrollHeight - scrollTop - clientHeight < 200 && hasMore && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isFetchingNextPage, fetchNextPage, open]);

  // Charger les catégories et catalogues disponibles
  useEffect(() => {
    if (!open) return;
    const loadFilters = async () => {
      try {
        const [categoriesData, cataloguesData] = await Promise.all([
          getCategoriesAPI(),
          getCataloguesAPI(),
        ]);
        setSousCategories([...new Set(categoriesData)]);
        setCatalogues(cataloguesData);
      } catch (err) {
        console.error('Erreur chargement filtres:', err);
      }
    };
    loadFilters();
  }, [open]);

  // Reset des filtres quand on ouvre la popup
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Reset aux valeurs initiales à l'ouverture
      setSearch(initialSearch);
      setFiltreSousCategories(initialSousCategories);
      setFiltreProductType('');
      setFiltreEpaisseur(null);
      setFiltreEnStock(false);
      setFiltreCatalogue('');
      setSortColumn(null);
      setSortDirection('asc');
    }
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Montage client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fermer le dropdown catégories quand on clique ailleurs
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.getElementById('categories-dropdown');
      const trigger = (e.target as HTMLElement).closest('.filter-dropdown');
      if (dropdown && !trigger) {
        dropdown.classList.remove('open');
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setSearch(initialSearch);
    setFiltreSousCategories(initialSousCategories);
    setFiltreProductType('');
    setFiltreEpaisseur(null);
    setFiltreEnStock(false);
    setFiltreCatalogue('');
    setSortColumn(null);
    setSortDirection('asc');
  };

  // Toggle une catégorie dans le filtre multi-catégories
  const toggleSousCategorie = (cat: string) => {
    setFiltreSousCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  // Reset épaisseur quand on change de type de produit
  useEffect(() => {
    setFiltreEpaisseur(null);
  }, [filtreProductType]);

  const handleSelectProduit = (produit: CatalogueProduit) => {
    // Ajouter aux panneaux récents
    addRecent(produit);
    if (onSelectCatalogue) {
      onSelectCatalogue(produit as ProduitCatalogue);
    }
    onClose();
  };

  // Fetch panel details and open popup
  const handleShowPanelDetail = async (reference: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/api/catalogues/panels/by-reference/${encodeURIComponent(reference)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPanelDetail(data.panel);
        setShowDetailPopup(true);
      } else {
        console.error('Panel not found:', reference);
      }
    } catch (error) {
      console.error('Error fetching panel details:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetailPopup = () => {
    setShowDetailPopup(false);
    setSelectedPanelDetail(null);
  };

  // Handle autocomplete suggestion selection
  const handleAutocompleteSuggestion = async (suggestion: {
    id: string;
    reference: string;
    refFabricant: string | null;
    name: string;
    imageUrl: string | null;
    catalogueName: string;
    productType: string | null;
    epaisseur: number | null;
    prix: number | null;
    prixType: 'M2' | 'ML' | null;
  }) => {
    // First check if we already have this product in the loaded list
    const existingProduct = produits.find(p => p.reference === suggestion.reference);
    if (existingProduct && onSelectCatalogue) {
      addRecent(existingProduct);
      onSelectCatalogue(existingProduct as ProduitCatalogue);
      onClose();
      return;
    }

    // Otherwise fetch the full product details
    try {
      const res = await fetch(`${API_URL}/api/catalogues/panels/by-reference/${encodeURIComponent(suggestion.reference)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.panel && onSelectCatalogue) {
          // Map panel to CatalogueProduit format (same as API response)
          const panel = data.panel;
          const produit: CatalogueProduit = {
            id: panel.id,
            reference: panel.reference,
            nom: panel.name,
            codeArticle: panel.reference,
            marque: panel.catalogue?.name || suggestion.catalogueName,
            categorie: panel.category?.parent?.name || panel.category?.name || '',
            sousCategorie: panel.category?.name || '',
            type: panel.productType || '',
            epaisseur: panel.defaultThickness || (panel.thickness?.[0] ?? 0),
            longueur: panel.isVariableLength ? 'Variable' : panel.defaultLength,
            largeur: panel.defaultWidth,
            prixAchatM2: panel.pricePerM2,
            prixVenteM2: panel.pricePerM2,
            prixMl: panel.pricePerMl,
            stock: panel.stockStatus === 'EN STOCK' ? 'EN STOCK' : 'Sur commande',
            imageUrl: panel.imageUrl,
            productType: panel.productType,
            refFabricant: panel.manufacturerRef,
            isVariableLength: panel.isVariableLength,
            disponible: panel.isActive,
            createdAt: panel.createdAt,
            updatedAt: panel.updatedAt,
          };
          addRecent(produit);
          onSelectCatalogue(produit as ProduitCatalogue);
          onClose();
        }
      }
    } catch (error) {
      console.error('Error fetching panel from autocomplete:', error);
    }
  };

  if (!open || !mounted) return null;

  return [
    createPortal(
    <div
      key="selection-popup"
      className="popup-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        className="popup-container"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--admin-bg-card, #1a1a1a)',
          border: '1px solid var(--admin-border-default, #333)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1400px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div className="popup-header">
          <div className="header-title">
            <h2>{t('title')}</h2>
            <span className="total-count">{t('productsCount', { count: total })}</span>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Barre de filtres - Ligne 1: Recherche principale */}
        <div className="filters-row-main">
          <div className="search-box-large">
            <SearchAutocomplete
              value={search}
              onChange={setSearch}
              onSelect={handleAutocompleteSuggestion}
              placeholder={t('searchPlaceholder')}
              autoFocus
            />
          </div>

          {/* Compteur et Reset */}
          <div className="search-meta">
            <span className="result-count">
              {filteredProduits.length < total
                ? t('loadedCount', { loaded: filteredProduits.length, total })
                : t('resultsCount', { count: total })}
            </span>
            {hasFilters && (
              <button onClick={resetFilters} className="btn-reset-main" title={t('resetFilters')}>
                <RotateCcw size={14} />
                <span>{t('resetFilters')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre de filtres - Ligne 2: Filtres secondaires */}
        <div className="filters-row-secondary">
          {/* Filtre Catalogue */}
          <select
            value={filtreCatalogue}
            onChange={(e) => setFiltreCatalogue(e.target.value)}
            className={`filter-select ${filtreCatalogue ? 'active' : ''}`}
          >
            <option value="">{t('catalogueFilter')}</option>
            {catalogues.map(cat => (
              <option key={cat.slug} value={cat.slug}>{cat.name}</option>
            ))}
          </select>

          {/* Filtre Type de produit */}
          <select
            value={filtreProductType}
            onChange={(e) => setFiltreProductType(e.target.value)}
            className={`filter-select ${filtreProductType ? 'active' : ''}`}
          >
            <option value="">{t('typeFilter')}</option>
            {PRODUCT_TYPE_KEYS.map(key => (
              <option key={key} value={key}>{t(`productTypes.${key}`)}</option>
            ))}
          </select>

          {/* Filtre Catégories (dropdown multi-select) */}
          <div className="filter-dropdown">
            <button
              className={`filter-dropdown-trigger ${filtreSousCategories.length > 0 ? 'active' : ''}`}
              onClick={() => {
                const el = document.getElementById('categories-dropdown');
                if (el) el.classList.toggle('open');
              }}
            >
              <span>{t('categoryFilter')}</span>
              {filtreSousCategories.length > 0 && (
                <span className="filter-count">{filtreSousCategories.length}</span>
              )}
              <ArrowDown size={12} />
            </button>
            <div id="categories-dropdown" className="filter-dropdown-menu">
              {sousCategories.map(sc => (
                <label key={sc} className="dropdown-item">
                  <input
                    type="checkbox"
                    checked={filtreSousCategories.includes(sc)}
                    onChange={() => toggleSousCategorie(sc)}
                  />
                  <span>{sc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtre Épaisseur */}
          <select
            value={filtreEpaisseur ?? ''}
            onChange={(e) => setFiltreEpaisseur(e.target.value ? Number(e.target.value) : null)}
            className={`filter-select ${filtreEpaisseur ? 'active' : ''}`}
          >
            <option value="">{t('thicknessFilter')}</option>
            {epaisseurs.map(ep => (
              <option key={ep} value={ep}>{ep}mm</option>
            ))}
          </select>

          {/* Toggle Stock */}
          <button
            onClick={() => setFiltreEnStock(!filtreEnStock)}
            className={`filter-toggle ${filtreEnStock ? 'active' : ''}`}
          >
            <CheckCircle2 size={12} />
            <span>{t('stockFilter')}</span>
          </button>
        </div>

        {/* Ligne 3: Tags des filtres actifs */}
        {hasFilters && (
          <div className="active-filters-row">
            {search && (
              <span className="filter-tag">
                <span className="tag-label">{t('searchLabel')}:</span> {search}
                <button onClick={() => setSearch('')}><X size={12} /></button>
              </span>
            )}
            {filtreCatalogue && (
              <span className="filter-tag">
                {catalogues.find(c => c.slug === filtreCatalogue)?.name}
                <button onClick={() => setFiltreCatalogue('')}><X size={12} /></button>
              </span>
            )}
            {filtreProductType && (
              <span className="filter-tag">
                {t(`productTypes.${filtreProductType}`)}
                <button onClick={() => setFiltreProductType('')}><X size={12} /></button>
              </span>
            )}
            {filtreSousCategories.map(cat => (
              <span key={cat} className="filter-tag">
                {cat}
                <button onClick={() => toggleSousCategorie(cat)}><X size={12} /></button>
              </span>
            ))}
            {filtreEpaisseur && (
              <span className="filter-tag">
                {filtreEpaisseur}mm
                <button onClick={() => setFiltreEpaisseur(null)}><X size={12} /></button>
              </span>
            )}
            {filtreEnStock && (
              <span className="filter-tag">
                {t('stockFilter')}
                <button onClick={() => setFiltreEnStock(false)}><X size={12} /></button>
              </span>
            )}
          </div>
        )}

        {/* Section Panneaux Récents - visible uniquement sans filtres actifs */}
        {!hasFilters && recents.length > 0 && (
          <div className="recents-section">
            <div className="recents-header">
              <Clock size={14} />
              <span>Récents</span>
              <span className="recents-count">{recents.length}</span>
            </div>
            <div className="recents-grid">
              {recents.map((produit) => {
                // Nom: 2 premiers mots
                const nomCourt = produit.nom.split(' ').slice(0, 2).join(' ');

                // Dimensions (L × l en mm)
                const isVariable = produit.longueur === 'Variable' || produit.isVariableLength;
                const dims = isVariable
                  ? `Var. × ${produit.largeur}`
                  : produit.longueur && produit.largeur
                    ? `${produit.longueur} × ${produit.largeur}`
                    : '';

                return (
                  <button
                    key={produit.reference}
                    className="recent-card"
                    onClick={() => handleSelectProduit(produit as CatalogueProduit)}
                  >
                    {produit.imageUrl ? (
                      <img
                        src={produit.imageUrl}
                        alt={produit.nom}
                        className="recent-image"
                      />
                    ) : (
                      <div className="recent-image recent-image--placeholder">
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div className="recent-info">
                      <span className="recent-name" title={produit.nom}>
                        {nomCourt}
                      </span>
                      <span className="recent-meta">
                        <span className="recent-epaisseur">{produit.epaisseur}mm</span>
                        {dims && <span className="recent-dims">{dims}</span>}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tableau */}
        <div className="table-container" ref={tableContainerRef}>
          {isLoading ? (
            <table className="products-table">
              <thead>
                <tr>
                  <th className="col-image">{t('imageColumn')}</th>
                  <th className="col-ref">{t('refColumn')}</th>
                  <th className="col-ref-fab">{t('refFabColumn')}</th>
                  <th className="col-nom">{t('nameColumn')}</th>
                  <th className="col-type">{t('typeColumn')}</th>
                  <th className="col-dim">{t('thicknessColumn')}</th>
                  <th className="col-dimensions">{t('dimensionsColumn')}</th>
                  <th className="col-prix">{t('priceColumn')}</th>
                  <th className="col-stock">{t('stockColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          ) : isError ? (
            <div className="error-message">{error?.message || 'Erreur de chargement'}</div>
          ) : filteredProduits.length === 0 ? (
            <div className="no-results">
              {hasFilters ? t('noResults') : t('noProducts')}
            </div>
          ) : (
            <table className="products-table">
              <thead>
                <tr>
                  <th className="col-image">{t('imageColumn')}</th>
                  <th className="col-ref sortable" onClick={() => handleSort('reference')}>
                    <span>{t('refColumn')}</span>
                    {sortColumn === 'reference' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : <ArrowUpDown size={12} className="sort-inactive" />}
                  </th>
                  <th className="col-ref-fab">{t('refFabColumn')}</th>
                  <th className="col-nom sortable" onClick={() => handleSort('nom')}>
                    <span>{t('nameColumn')}</span>
                    {sortColumn === 'nom' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : <ArrowUpDown size={12} className="sort-inactive" />}
                  </th>
                  <th className="col-type">{t('typeColumn')}</th>
                  <th className="col-dim sortable" onClick={() => handleSort('epaisseur')}>
                    <span>{t('thicknessColumn')}</span>
                    {sortColumn === 'epaisseur' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : <ArrowUpDown size={12} className="sort-inactive" />}
                  </th>
                  <th className="col-dimensions">{t('dimensionsColumn')}</th>
                  <th className="col-prix sortable" onClick={() => handleSort('prix')}>
                    <span>{t('priceColumn')}</span>
                    {sortColumn === 'prix' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : <ArrowUpDown size={12} className="sort-inactive" />}
                  </th>
                  <th className="col-stock sortable" onClick={() => handleSort('stock')}>
                    <span>{t('stockColumn')}</span>
                    {sortColumn === 'stock' ? (
                      sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : <ArrowUpDown size={12} className="sort-inactive" />}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProduits.map((produit) => {
                  const isEnStock = produit.stock === 'EN STOCK';
                  const prixM2 = produit.prixVenteM2 || produit.prixAchatM2 || 0;
                  const prixMl = produit.prixMl || 0;
                  const prix = prixMl > 0 ? prixMl : prixM2;
                  const prixUnit = prixMl > 0 ? '€/ml' : '€/m²';

                  // Calcul des dimensions - cas spécial pour les chants
                  const isChant = produit.productType === 'BANDE_DE_CHANT';
                  const isVariable = produit.longueur === 'Variable' || produit.isVariableLength || isChant;

                  // Pour les chants: largeur en mm (peut être stockée en m, donc × 1000 si < 1)
                  let largeurDisplay = produit.largeur;
                  if (isChant && produit.largeur && produit.largeur < 1) {
                    largeurDisplay = Math.round(produit.largeur * 1000); // Convertir m → mm
                  }

                  let dimensionsDisplay = '-';
                  if (isVariable && largeurDisplay) {
                    dimensionsDisplay = `Var. × ${largeurDisplay}`;
                  } else if (produit.longueur && produit.largeur) {
                    dimensionsDisplay = `${produit.longueur} × ${produit.largeur}`;
                  }

                  return (
                    <tr
                      key={produit.id}
                      className="product-row"
                      onClick={() => handleSelectProduit(produit)}
                    >
                      <td className="col-image">
                        <ProductImage src={produit.imageUrl} alt={produit.nom} />
                      </td>
                      <td className="col-ref">
                        <span className="ref-text">{produit.reference}</span>
                        <button
                          className="btn-info"
                          onClick={(e) => handleShowPanelDetail(produit.reference, e)}
                          disabled={loadingDetail}
                          title="Voir la fiche produit"
                        >
                          <Info size={14} />
                        </button>
                      </td>
                      <td className="col-ref-fab">
                        {produit.refFabricant || '-'}
                      </td>
                      <td className="col-nom">
                        <div className="col-nom-content" title={produit.nom}>{produit.nom}</div>
                      </td>
                      <td className="col-type">
                        {produit.productType ? (
                          <span className="type-badge">{t(`productTypes.${produit.productType}`)}</span>
                        ) : '-'}
                      </td>
                      <td className="col-dim">{produit.epaisseur}mm</td>
                      <td className="col-dimensions">{dimensionsDisplay}</td>
                      <td className="col-prix">{prix > 0 ? `${prix.toFixed(2)} ${prixUnit}` : '-'}</td>
                      <td className="col-stock">
                        {isEnStock ? (
                          <span className="stock-badge en-stock">
                            <CheckCircle2 size={12} />
                            {t('inStock')}
                          </span>
                        ) : (
                          <span className="stock-badge sur-commande">
                            <Clock size={12} />
                            {t('onOrder')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Indicateur de chargement infinite scroll */}
          {isFetchingNextPage && (
            <div className="loading-more">
              <Loader2 size={20} className="spinner" />
              <span>{t('loadingMore')}</span>
            </div>
          )}

          {/* Message fin de liste */}
          {!isLoading && !isFetchingNextPage && !hasMore && filteredProduits.length > 0 && filteredProduits.length === total && (
            <div className="end-of-list">
              {t('allProductsLoaded', { count: total })}
            </div>
          )}
        </div>


        <style jsx>{`
          /* Header */
          .popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--admin-border-subtle);
            background: var(--admin-bg-tertiary);
            flex-shrink: 0;
          }

          .header-title {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .header-title h2 {
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--admin-text-primary);
            margin: 0;
            font-family: 'Space Grotesk', sans-serif;
          }

          .total-count {
            font-size: 0.75rem;
            color: var(--admin-text-muted);
            background: var(--admin-bg-hover);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
          }

          .btn-close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: transparent;
            border: none;
            border-radius: 6px;
            color: var(--admin-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-close:hover {
            background: var(--admin-status-danger-bg);
            color: var(--admin-status-danger);
          }

          /* Ligne 1: Recherche principale */
          .filters-row-main {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 0.75rem 1rem;
            background: var(--admin-bg-card);
            border-bottom: 1px solid var(--admin-border-subtle);
            flex-shrink: 0;
          }

          .search-box-large {
            position: relative;
            flex: 1;
            max-width: 500px;
            z-index: 100;
          }

          .search-meta {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
          }

          .result-count {
            font-size: 0.8125rem;
            color: var(--admin-text-muted);
            white-space: nowrap;
          }

          .btn-reset-main {
            display: flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            padding: 0 12px;
            background: transparent;
            border: 1px solid var(--admin-border-default);
            border-radius: 6px;
            font-size: 0.75rem;
            color: var(--admin-text-muted);
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-reset-main:hover {
            background: var(--admin-status-danger-bg);
            border-color: var(--admin-status-danger);
            color: var(--admin-status-danger);
          }

          /* Ligne 2: Filtres secondaires */
          .filters-row-secondary {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--admin-bg-tertiary);
            border-bottom: 1px solid var(--admin-border-subtle);
            flex-shrink: 0;
            overflow: visible;
            position: relative;
            z-index: 50;
          }

          .filter-select {
            height: 32px;
            padding: 0 28px 0 10px;
            background: var(--admin-bg-card);
            border: 1px solid var(--admin-border-default);
            border-radius: 6px;
            font-size: 0.75rem;
            color: var(--admin-text-secondary);
            cursor: pointer;
            outline: none;
            transition: all 0.15s;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            min-width: 100px;
            box-sizing: border-box;
            flex-shrink: 0;
          }

          .filter-select:hover {
            border-color: var(--admin-border-hover);
          }

          .filter-select.active {
            background-color: var(--admin-olive-bg);
            border-color: var(--admin-olive);
            color: var(--admin-olive);
            font-weight: 600;
          }

          .filter-select option {
            background: var(--admin-bg-elevated, #2a2a2a);
            color: var(--admin-text-primary, #fff);
            padding: 0.5rem;
          }

          /* Dropdown multi-select pour catégories */
          .filter-dropdown {
            position: relative;
            flex-shrink: 0;
          }

          .filter-dropdown-trigger {
            display: flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            padding: 0 10px;
            background: var(--admin-bg-card);
            border: 1px solid var(--admin-border-default);
            border-radius: 6px;
            font-size: 0.75rem;
            color: var(--admin-text-secondary);
            cursor: pointer;
            transition: all 0.15s;
          }

          .filter-dropdown-trigger:hover {
            border-color: var(--admin-border-hover);
          }

          .filter-dropdown-trigger.active {
            background-color: var(--admin-olive-bg);
            border-color: var(--admin-olive);
            color: var(--admin-olive);
          }

          .filter-count {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            background: var(--admin-olive);
            color: white;
            border-radius: 9px;
            font-size: 0.625rem;
            font-weight: 700;
          }

          .filter-dropdown-menu {
            display: none;
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            min-width: 220px;
            max-height: 300px;
            overflow-y: auto;
            background: var(--admin-bg-elevated, #2a2a2a);
            border: 1px solid var(--admin-border-default);
            border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            z-index: 1000;
            padding: 0.5rem;
          }

          .filter-dropdown-menu.open {
            display: block;
          }

          .dropdown-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0.5rem 0.75rem;
            font-size: 0.8125rem;
            color: var(--admin-text-primary);
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.1s;
          }

          .dropdown-item:hover {
            background: var(--admin-bg-hover);
          }

          .dropdown-item input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: var(--admin-olive);
          }

          .filter-toggle {
            display: flex;
            align-items: center;
            gap: 6px;
            height: 32px;
            padding: 0 12px;
            background: var(--admin-bg-card);
            border: 1px solid var(--admin-border-default);
            border-radius: 6px;
            font-size: 0.75rem;
            color: var(--admin-text-secondary);
            cursor: pointer;
            transition: all 0.15s;
            box-sizing: border-box;
            flex-shrink: 0;
          }

          .filter-toggle:hover {
            border-color: var(--admin-border-hover);
          }

          .filter-toggle.active {
            background-color: var(--admin-olive-bg);
            border-color: var(--admin-olive);
            color: var(--admin-olive);
            font-weight: 600;
          }

          /* Ligne 3: Tags des filtres actifs */
          .active-filters-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--admin-bg-secondary);
            border-bottom: 1px solid var(--admin-border-subtle);
            flex-shrink: 0;
            flex-wrap: wrap;
          }

          .filter-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            height: 26px;
            padding: 0 8px;
            background: var(--admin-olive-bg);
            border: 1px solid var(--admin-olive);
            border-radius: 13px;
            font-size: 0.6875rem;
            color: var(--admin-olive);
            font-weight: 500;
          }

          .filter-tag .tag-label {
            color: var(--admin-text-muted);
            font-weight: 400;
          }

          .filter-tag button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            background: transparent;
            border: none;
            border-radius: 50%;
            color: var(--admin-olive);
            cursor: pointer;
            transition: all 0.1s;
            padding: 0;
          }

          .filter-tag button:hover {
            background: var(--admin-olive);
            color: white;
          }

          /* Section Récents */
          .recents-section {
            padding: 0.75rem 1rem;
            background: var(--admin-bg-tertiary);
            border-bottom: 1px solid var(--admin-border-subtle);
            flex-shrink: 0;
          }

          .recents-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--admin-text-muted);
          }

          .recents-count {
            font-size: 0.6875rem;
            background: var(--admin-bg-hover);
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-weight: 500;
          }

          .recents-grid {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 0.25rem;
            scrollbar-width: thin;
            scrollbar-color: var(--admin-border-default) transparent;
          }

          .recents-grid::-webkit-scrollbar {
            height: 4px;
          }

          .recents-grid::-webkit-scrollbar-track {
            background: transparent;
          }

          .recents-grid::-webkit-scrollbar-thumb {
            background: var(--admin-border-default);
            border-radius: 2px;
          }

          .recent-card {
            display: flex;
            align-items: center;
            gap: 0.625rem;
            padding: 0.5rem 0.75rem;
            background: var(--admin-bg-card);
            border: 1px solid var(--admin-border-subtle);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
            flex-shrink: 0;
            min-width: 200px;
            max-width: 280px;
            text-align: left;
          }

          .recent-card:hover {
            border-color: var(--admin-olive);
            background: var(--admin-olive-bg);
          }

          .recent-image {
            width: 40px;
            height: 40px;
            min-width: 40px;
            border-radius: 6px;
            object-fit: cover;
            border: 1px solid var(--admin-border-subtle);
            background: var(--admin-bg-tertiary);
          }

          .recent-image--placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--admin-text-muted);
          }

          .recent-info {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
            min-width: 0;
            flex: 1;
          }

          .recent-name {
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--admin-text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .recent-meta {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
          }

          .recent-epaisseur {
            color: var(--admin-text-muted);
            font-family: 'Space Mono', monospace;
          }

          .recent-dims {
            color: var(--admin-text-muted);
            font-family: 'Space Mono', monospace;
            font-size: 0.6875rem;
          }

          /* Tableau */
          .table-container {
            flex: 1;
            overflow: auto;
            min-height: 0;
          }

          /* Infinite scroll loading */
          .loading-more {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 1rem;
            color: var(--admin-text-muted);
            font-size: 0.875rem;
          }

          .loading-more :global(.spinner) {
            animation: spin 1s linear infinite;
          }

          .end-of-list {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            color: var(--admin-text-muted);
            font-size: 0.75rem;
            opacity: 0.7;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .error-message,
          .no-results {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--admin-text-muted);
            font-size: 0.875rem;
          }

          .products-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }

          .products-table thead {
            position: sticky;
            top: 0;
            z-index: 10;
            background: var(--admin-bg-tertiary);
          }

          .products-table th {
            padding: 0.75rem;
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--admin-text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.03em;
            text-align: left;
            border-bottom: 1px solid var(--admin-border-subtle);
            white-space: nowrap;
          }

          .products-table th.sortable {
            cursor: pointer;
            user-select: none;
            transition: background 0.15s;
          }

          .products-table th.sortable:hover {
            background: var(--admin-bg-secondary);
          }

          .products-table th.sortable span,
          .products-table th.sortable :global(svg) {
            display: inline-block;
            vertical-align: middle;
          }

          .products-table th.sortable :global(svg) {
            margin-left: 4px;
          }

          .products-table th.sortable :global(.sort-inactive) {
            opacity: 0.3;
          }

          .products-table td {
            padding: 0.625rem 0.75rem;
            font-size: 0.8125rem;
            color: var(--admin-text-primary);
            border-bottom: 1px solid var(--admin-border-subtle);
          }

          .product-row {
            cursor: pointer;
            transition: background 0.1s;
          }

          .product-row:hover {
            background: var(--admin-olive-bg);
          }

          /* Colonnes */
          .col-image {
            width: 60px !important;
            min-width: 60px !important;
            max-width: 60px !important;
            text-align: center;
            padding: 0.5rem !important;
          }

          .col-image > div,
          .col-image > .image-container,
          .col-image > .no-image {
            width: 48px !important;
            height: 48px !important;
            margin: 0 auto;
          }

          .product-image {
            width: 48px !important;
            height: 48px !important;
            min-width: 48px !important;
            min-height: 48px !important;
            max-width: 48px !important;
            max-height: 48px !important;
            object-fit: cover !important;
            object-position: center !important;
            border-radius: 6px;
            border: 1px solid var(--admin-border-subtle);
          }

          .no-image {
            width: 48px !important;
            height: 48px !important;
            min-width: 48px !important;
            min-height: 48px !important;
            max-width: 48px !important;
            max-height: 48px !important;
            display: flex !important;
            align-items: center;
            justify-content: center;
            background: var(--admin-bg-tertiary);
            border-radius: 6px;
            border: 1px solid var(--admin-border-subtle);
            color: var(--admin-text-muted);
            font-size: 0.75rem;
          }

          /* Image avec état de chargement */
          .image-container {
            position: relative !important;
            width: 48px !important;
            height: 48px !important;
            min-width: 48px !important;
            min-height: 48px !important;
            max-width: 48px !important;
            max-height: 48px !important;
            border-radius: 6px;
            overflow: hidden !important;
            border: 1px solid var(--admin-border-subtle);
            background: var(--admin-bg-tertiary);
            flex-shrink: 0;
            display: block !important;
          }

          .image-loading {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--admin-bg-tertiary);
          }

          .image-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--admin-border-subtle);
            border-top-color: var(--admin-olive);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          .image-container .product-image,
          .image-container img {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            min-width: 100% !important;
            min-height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: cover !important;
            object-position: center !important;
            opacity: 1;
            transition: opacity 0.2s ease;
            border: none !important;
            border-radius: 0 !important;
          }

          .image-container .product-image.loading {
            opacity: 0;
          }

          /* Skeleton Loader */
          .skeleton-row td {
            padding: 0.625rem 0.75rem;
            border-bottom: 1px solid var(--admin-border-subtle);
          }

          .skeleton {
            background: linear-gradient(
              90deg,
              var(--admin-bg-tertiary) 25%,
              var(--admin-bg-hover) 50%,
              var(--admin-bg-tertiary) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          }

          .skeleton-image {
            width: 48px;
            height: 48px;
            border-radius: 6px;
          }

          .skeleton-text-xs {
            width: 40px;
            height: 14px;
          }

          .skeleton-text-sm {
            width: 60px;
            height: 14px;
          }

          .skeleton-text-lg {
            width: 140px;
            height: 14px;
          }

          .skeleton-badge {
            width: 50px;
            height: 22px;
            border-radius: 999px;
          }

          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          .col-marque {
            font-weight: 600;
            color: var(--admin-text-primary);
          }

          .col-ref {
            display: flex;
            align-items: center;
            gap: 6px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--admin-olive);
            white-space: nowrap;
          }

          .ref-text {
            font-weight: 500;
          }

          .col-ref-fab {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--admin-text-secondary);
            white-space: nowrap;
          }

          .btn-info {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            background: transparent;
            border: 1px solid var(--admin-border-subtle);
            border-radius: 4px;
            color: var(--admin-text-muted);
            cursor: pointer;
            transition: all 0.15s;
            flex-shrink: 0;
          }

          .btn-info:hover {
            background: var(--admin-olive-bg);
            border-color: var(--admin-olive);
            color: var(--admin-olive);
          }

          .btn-info:disabled {
            opacity: 0.5;
            cursor: wait;
          }

          .col-nom {
            min-width: 200px;
            max-width: 350px;
          }

          .col-nom-content {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.4;
            font-size: 0.8125rem;
          }

          .col-type {
            white-space: nowrap;
          }

          .type-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.2rem 0.5rem;
            background: var(--admin-bg-tertiary);
            border-radius: 4px;
            font-size: 0.6875rem;
            color: var(--admin-text-secondary);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }

          .col-dim {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            white-space: nowrap;
          }

          .col-dimensions {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--admin-text-muted);
            white-space: nowrap;
          }

          .col-prix {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            color: var(--admin-sable);
            white-space: nowrap;
          }

          .col-stock {
            text-align: center;
          }

          .stock-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 0.25rem 0.5rem;
            font-size: 0.6875rem;
            font-weight: 600;
            border-radius: 999px;
          }

          .stock-badge.en-stock {
            background: rgba(34, 197, 94, 0.1);
            color: #22c55e;
          }

          .stock-badge.sur-commande {
            background: rgba(249, 115, 22, 0.1);
            color: #f97316;
          }

          /* Responsive */
          @media (max-width: 1100px) {
            .col-dimensions {
              display: none;
            }
          }

          @media (max-width: 900px) {
            .filters-row-main {
              flex-wrap: wrap;
            }

            .search-box-large {
              max-width: 100%;
              order: 1;
            }

            .search-meta {
              order: 2;
              width: 100%;
              justify-content: space-between;
              margin-top: 0.5rem;
            }

            .filters-row-secondary {
              gap: 0.375rem;
              padding: 0.5rem;
            }

            .filter-select {
              min-width: 70px;
              padding-left: 6px;
              padding-right: 22px;
              font-size: 0.7rem;
            }

            .col-type {
              display: none;
            }

            .col-nom {
              max-width: 200px;
            }

            .col-nom-content {
              -webkit-line-clamp: 1;
            }
          }

          @media (max-width: 700px) {
            .col-prix {
              display: none;
            }
          }

          @media (max-width: 600px) {
            .filters-row-secondary {
              flex-wrap: wrap;
            }

            .filter-dropdown,
            .filter-select {
              flex: 1 1 calc(50% - 0.25rem);
              min-width: 0;
            }

            .filter-toggle {
              flex: 0 0 auto;
            }

            .result-count {
              display: none;
            }

            .col-ref {
              font-size: 0.65rem;
            }

            .col-nom {
              max-width: 140px;
            }
          }
        `}</style>
      </div>
    </div>,
    document.body
  ),
  <PopupFicheProduit
    key="panel-detail-popup"
    open={showDetailPopup}
    panel={selectedPanelDetail}
    onClose={handleCloseDetailPopup}
    onAddToConfigurator={(panel) => {
      // Find the matching product in the list and select it
      const matchingProduct = produits.find(p => p.reference === panel.reference);
      if (matchingProduct && onSelectCatalogue) {
        onSelectCatalogue(matchingProduct as ProduitCatalogue);
        handleCloseDetailPopup();
        onClose();
      }
    }}
  />
  ];
}
