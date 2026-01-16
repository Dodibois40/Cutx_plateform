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
  getFilterOptions,
  type CatalogueProduit,
  type FilterOptionsResponse,
} from '@/lib/services/catalogue-api';
import { useCatalogueSearch } from '@/lib/hooks/useCatalogueSearch';
import { useDebounce } from '@/lib/hooks/useDebounce';
import PopupFicheProduit, { type PanelDetails } from '@/components/produit/PopupFicheProduit';
import SearchAutocomplete from '@/components/ui/SearchAutocomplete';
import { usePanneauxRecents } from '@/lib/hooks/usePanneauxRecents';
import { ProductImage, SkeletonRow } from './PopupSelectionPanneau/components';
import './PopupSelectionPanneau/styles.css';

type SortColumn = 'nom' | 'epaisseur' | 'prix' | 'stock' | 'reference' | null;
type SortDirection = 'asc' | 'desc';

/**
 * Formate l'affichage de l'épaisseur
 * Affiche simplement "épaisseur mm" (ex: 0.8mm, 19mm)
 * La largeur des chants est déjà affichée dans la colonne Dimensions
 */
function formatThicknessDisplay(produit: CatalogueProduit): string {
  if (!produit.epaisseur) return '-';
  return `${produit.epaisseur}mm`;
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

  // Options de filtres dynamiques depuis la DB
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

  // États dérivés pour la compatibilité (utilisés par le JSX)
  const sousCategories = filterOptions?.categories.map(c => c.value) ?? [];
  const catalogues = filterOptions?.catalogues ?? [];

  // Tri
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Déterminer si on utilise smart search:
  // Smart search est activé si l'utilisateur tape du texte ET n'a pas de filtres manuels
  const hasManualFilters = filtreProductType || filtreSousCategories.length > 0 || filtreEpaisseur || filtreEnStock;
  const useSmartSearch = !!debouncedSearch && !hasManualFilters;

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
    parsedFilters,
    facets,
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
    useSmartSearch,
  });

  // Filtrage côté client pour multi sous-catégories
  const filteredProduits = filtreSousCategories.length > 1
    ? produits.filter(p => filtreSousCategories.includes(p.sousCategorie))
    : produits;

  // Épaisseurs dynamiques depuis la DB
  const epaisseurs = filterOptions?.thicknesses.map(t => t.value) ?? [];

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

  // Charger les options de filtres dynamiques depuis la DB
  useEffect(() => {
    if (!open) return;
    const loadFilters = async () => {
      setFilterOptionsLoading(true);
      try {
        // Charger les options, filtré par catalogue si sélectionné
        const options = await getFilterOptions(filtreCatalogue || undefined);
        setFilterOptions(options);
      } catch (err) {
        console.error('Erreur chargement filtres:', err);
      } finally {
        setFilterOptionsLoading(false);
      }
    };
    loadFilters();
  }, [open, filtreCatalogue]); // Re-charger quand le catalogue change

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
            epaisseur: panel.defaultThickness || panel.thickness?.[0] || 0,
            longueur: panel.isVariableLength ? 'Variable' : panel.defaultLength,
            largeur: panel.defaultWidth,
            prixAchatM2: panel.pricePerM2,
            prixVenteM2: panel.pricePerM2,
            prixMl: panel.pricePerMl,
            prixUnit: panel.pricePerUnit,
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
            disabled={filterOptionsLoading}
          >
            <option value="">{t('typeFilter')}</option>
            {filterOptions?.productTypes.map(pt => (
              <option key={pt.value} value={pt.value}>
                {t(`productTypes.${pt.value}`, { defaultValue: pt.label })} ({pt.count})
              </option>
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
              disabled={filterOptionsLoading}
            >
              <span>{t('categoryFilter')}</span>
              {filtreSousCategories.length > 0 && (
                <span className="filter-count">{filtreSousCategories.length}</span>
              )}
              <ArrowDown size={12} />
            </button>
            <div id="categories-dropdown" className="filter-dropdown-menu">
              {filterOptions?.categories.map(cat => (
                <label key={cat.value} className="dropdown-item">
                  <input
                    type="checkbox"
                    checked={filtreSousCategories.includes(cat.value)}
                    onChange={() => toggleSousCategorie(cat.value)}
                  />
                  <span>{cat.label} ({cat.count})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filtre Épaisseur */}
          <select
            value={filtreEpaisseur ?? ''}
            onChange={(e) => setFiltreEpaisseur(e.target.value ? Number(e.target.value) : null)}
            className={`filter-select ${filtreEpaisseur ? 'active' : ''}`}
            disabled={filterOptionsLoading}
          >
            <option value="">{t('thicknessFilter')}</option>
            {filterOptions?.thicknesses.map(t => (
              <option key={t.value} value={t.value}>{t.value}mm ({t.count})</option>
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

        {/* Affichage des filtres détectés par Smart Search */}
        {useSmartSearch && parsedFilters && (
          parsedFilters.productTypes.length > 0 ||
          parsedFilters.subcategories?.length > 0 ||
          parsedFilters.thickness ||
          parsedFilters.searchTerms.length > 0
        ) && (
          <div className="smart-search-info">
            <span className="smart-search-label">🧠 Détecté :</span>
            {parsedFilters.productTypes.map(type => (
              <span key={type} className="smart-tag type">
                {t(`productTypes.${type}`, { defaultValue: type })}
              </span>
            ))}
            {parsedFilters.subcategories?.map(subcat => (
              <span key={subcat} className="smart-tag subcategory">
                {subcat}
              </span>
            ))}
            {parsedFilters.thickness && (
              <span className="smart-tag thickness">{parsedFilters.thickness}mm</span>
            )}
            {parsedFilters.searchTerms.slice(0, 3).map((term, i) => (
              <span key={i} className="smart-tag term">{term}</span>
            ))}
          </div>
        )}

        {/* Facettes suggérées - filtres cliquables pour affiner la recherche */}
        {useSmartSearch && facets && (facets.genres.length > 0 || facets.dimensions.length > 0) && total > 10 && (
          <div className="facets-section">
            <span className="facets-label">Affiner :</span>

            {/* Genres / Qualités */}
            {facets.genres.length > 0 && (
              <div className="facets-group">
                <span className="facets-group-label">Genre</span>
                {facets.genres.slice(0, 5).map((genre) => (
                  <button
                    key={genre.label}
                    className="facet-chip genre"
                    onClick={() => {
                      // Ajouter le terme de recherche à la requête
                      setSearch((prev) => prev + ' ' + genre.searchTerm);
                    }}
                  >
                    {genre.label}
                    <span className="facet-count">{genre.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Dimensions */}
            {facets.dimensions.length > 1 && (
              <div className="facets-group">
                <span className="facets-group-label">Format</span>
                {facets.dimensions.slice(0, 4).map((dim) => (
                  <button
                    key={dim.label}
                    className="facet-chip dimension"
                    onClick={() => {
                      // Ajouter les dimensions à la recherche
                      setSearch((prev) => prev + ' ' + dim.length + 'x' + dim.width);
                    }}
                  >
                    {dim.label}
                    <span className="facet-count">{dim.count}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Épaisseurs si pas déjà filtrées */}
            {!parsedFilters?.thickness && facets.thicknesses.length > 1 && (
              <div className="facets-group">
                <span className="facets-group-label">Épaisseur</span>
                {facets.thicknesses.slice(0, 6).map((thick) => (
                  <button
                    key={thick.value}
                    className="facet-chip thickness"
                    onClick={() => {
                      setSearch((prev) => prev + ' ' + thick.value);
                    }}
                  >
                    {thick.value}mm
                    <span className="facet-count">{thick.count}</span>
                  </button>
                ))}
              </div>
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
                        <span className="recent-epaisseur">{formatThicknessDisplay(produit)}</span>
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
                  const prixUnitaire = produit.prixUnit || 0;
                  // Priorité: prixMl > prixUnit > prixM2
                  const prix = prixMl > 0 ? prixMl : (prixUnitaire > 0 ? prixUnitaire : prixM2);
                  const prixUnitLabel = prixMl > 0 ? '€/ml' : (prixUnitaire > 0 ? '€/u' : '€/m²');

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
                      <td className="col-dim">{formatThicknessDisplay(produit)}</td>
                      <td className="col-dimensions">{dimensionsDisplay}</td>
                      <td className="col-prix">{prix > 0 ? `${prix.toFixed(2)} ${prixUnitLabel}` : '-'}</td>
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
        {/* CSS moved to ./PopupSelectionPanneau/styles.css */}
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
