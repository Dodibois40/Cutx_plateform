'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { ProduitCatalogue } from '@/lib/catalogues';
import {
  searchCatalogues as searchCataloguesAPI,
  getSousCategories as getCategoriesAPI,
  type CatalogueProduit,
} from '@/lib/services/catalogue-api';

type SortColumn = 'nom' | 'epaisseur' | 'prix' | 'stock' | 'reference' | null;
type SortDirection = 'asc' | 'desc';

// Types de produits (basés sur productType en DB)
const PRODUCT_TYPE_KEYS = ['MELAMINE', 'STRATIFIE', 'PLACAGE', 'BANDE_DE_CHANT', 'COMPACT'] as const;

// Épaisseurs disponibles (basé sur l'analyse de la DB)
const EPAISSEURS_PANNEAUX = [8, 12, 16, 19, 38];
const EPAISSEURS_CHANTS = [0.7, 0.8, 0.9, 1, 1.2, 1.5, 2];

// Composant Image avec état de chargement
function ProductImage({ src, alt }: { src: string | undefined; alt: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <div className="no-image"><ImageIcon size={16} /></div>;
  }

  return (
    <div className="image-container">
      {isLoading && (
        <div className="image-loading">
          <div className="image-spinner" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`product-image ${isLoading ? 'loading' : ''}`}
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

export default function PopupSelectionPanneau({
  open,
  onSelectCatalogue,
  onClose,
  initialSearch = '',
  initialSousCategories = [],
}: PopupSelectionPanneauProps) {
  const t = useTranslations('dialogs.panelSelection');
  const [mounted, setMounted] = useState(false);
  const [produits, setProduits] = useState<CatalogueProduit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recherche et filtres
  const [search, setSearch] = useState(initialSearch);
  const [filtreSousCategories, setFiltreSousCategories] = useState<string[]>(initialSousCategories);
  const [filtreProductType, setFiltreProductType] = useState<string>('');
  const [filtreEpaisseur, setFiltreEpaisseur] = useState<number | null>(null);
  const [filtreEnStock, setFiltreEnStock] = useState(false);
  const [sousCategories, setSousCategories] = useState<string[]>([]);

  // Tri (100% côté client)
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Total pour affichage
  const [total, setTotal] = useState(0);

  // Épaisseurs dynamiques selon le type de produit
  const epaisseurs = filtreProductType === 'BANDE_DE_CHANT' ? EPAISSEURS_CHANTS : EPAISSEURS_PANNEAUX;

  const hasFilters = search || filtreSousCategories.length > 0 || filtreProductType || filtreEpaisseur || filtreEnStock;

  // Charger les produits avec filtrage côté serveur
  const loadProduits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Envoyer les filtres au backend
      const result = await searchCataloguesAPI({
        q: search || undefined,
        productType: filtreProductType || undefined,
        sousCategorie: filtreSousCategories.length === 1 ? filtreSousCategories[0] : undefined,
        epaisseurMin: filtreEpaisseur || undefined,
        enStock: filtreEnStock || undefined,
      });

      let filteredProduits = result.produits as CatalogueProduit[];

      // Filtrage côté client uniquement pour les cas complexes
      // (plusieurs sous-catégories sélectionnées)
      if (filtreSousCategories.length > 1) {
        filteredProduits = filteredProduits.filter(p => filtreSousCategories.includes(p.sousCategorie));
      }

      // Tri côté client
      if (sortColumn) {
        filteredProduits.sort((a, b) => {
          let comparison = 0;
          switch (sortColumn) {
            case 'reference':
              comparison = (a.reference || '').localeCompare(b.reference || '');
              break;
            case 'nom':
              comparison = (a.nom || '').localeCompare(b.nom || '');
              break;
            case 'epaisseur':
              comparison = (a.epaisseur || 0) - (b.epaisseur || 0);
              break;
            case 'prix':
              const prixA = a.prixVenteM2 || a.prixAchatM2 || a.prixMl || 0;
              const prixB = b.prixVenteM2 || b.prixAchatM2 || b.prixMl || 0;
              comparison = prixA - prixB;
              break;
            case 'stock':
              const stockA = a.stock === 'EN STOCK' ? 0 : 1;
              const stockB = b.stock === 'EN STOCK' ? 0 : 1;
              comparison = stockA - stockB;
              break;
          }
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }

      setProduits(filteredProduits);
      setTotal(filteredProduits.length);
    } catch (err: unknown) {
      console.error('❌ Erreur chargement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des produits');
    } finally {
      setIsLoading(false);
    }
  }, [search, filtreProductType, filtreSousCategories, filtreEpaisseur, filtreEnStock, sortColumn, sortDirection]);

  // Charger les catégories disponibles
  useEffect(() => {
    if (!open) return;
    const loadFilters = async () => {
      try {
        const categoriesData = await getCategoriesAPI();
        setSousCategories([...new Set(categoriesData)]);
      } catch (err) {
        console.error('Erreur chargement filtres:', err);
      }
    };
    loadFilters();
  }, [open]);

  // Ref pour tracker l'état précédent de open et éviter les doublons
  const wasOpenRef = useRef(false);
  // Ref pour savoir si c'est le premier chargement après ouverture
  const isFirstLoadRef = useRef(false);

  // Reset et chargement SEULEMENT quand on ouvre (open passe de false à true)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Marquer qu'on vient d'ouvrir - le prochain render aura les bons filtres
      isFirstLoadRef.current = true;
      // Initialiser avec les valeurs des props
      setSearch(initialSearch);
      setFiltreSousCategories(initialSousCategories);
      setFiltreProductType('');
      setFiltreEpaisseur(null);
      setFiltreEnStock(false);
      setSortColumn(null);
      setSortDirection('asc');
    }
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Intentionnellement on n'inclut pas initialSearch/initialSousCategories

  // Charger les produits quand les filtres changent (après le reset)
  useEffect(() => {
    // Ne charger que si la popup est ouverte
    if (!open) return;

    // Skip le premier effet quand open devient true (les filtres ne sont pas encore mis à jour)
    // loadProduits sera appelé au prochain render quand les filtres seront mis à jour
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      // On ne charge pas ici - on attend que les filtres soient mis à jour
      // Ce qui va recréer loadProduits et déclencher cet effet à nouveau
      return;
    }

    loadProduits();
  }, [open, loadProduits]);

  // Montage client
  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (onSelectCatalogue) {
      onSelectCatalogue(produit as ProduitCatalogue);
    }
    onClose();
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
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
          maxWidth: '1200px',
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

        {/* Barre de filtres compacts */}
        <div className="filters-bar">
          {/* Recherche */}
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              autoFocus
            />
            {search && (
              <button className="btn-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="separator" />

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

          {/* Filtre Catégories (multi-sélection avec chips) */}
          <div className="filter-categories-wrapper">
            {sousCategories.map(sc => (
              <button
                key={sc}
                onClick={() => toggleSousCategorie(sc)}
                className={`filter-chip ${filtreSousCategories.includes(sc) ? 'active' : ''}`}
              >
                {sc}
              </button>
            ))}
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

          {/* Reset */}
          {hasFilters && (
            <button onClick={resetFilters} className="btn-reset" title={t('resetFilters')}>
              <RotateCcw size={12} />
            </button>
          )}

          <div className="separator" />

          {/* Compteur */}
          <span className="result-count">
            {t('resultsCount', { count: total })}
          </span>
        </div>

        {/* Tableau */}
        <div className="table-container">
          {isLoading ? (
            <table className="products-table">
              <thead>
                <tr>
                  <th className="col-image">{t('imageColumn')}</th>
                  <th className="col-ref">{t('refColumn')}</th>
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
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : produits.length === 0 ? (
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
                {produits.map((produit) => {
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
                      <td className="col-ref">{produit.reference}</td>
                      <td className="col-nom">{produit.nom}</td>
                      <td className="col-type">{produit.productType ? t(`productTypes.${produit.productType}`) : '-'}</td>
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

          /* Barre de filtres - alignée sur une ligne */
          .filters-bar {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--admin-bg-card);
            border-bottom: 1px solid var(--admin-border-subtle);
            flex-shrink: 0;
            overflow-x: auto;
          }

          .separator {
            width: 1px;
            height: 24px;
            background: var(--admin-border-subtle);
            flex-shrink: 0;
          }

          .search-box {
            position: relative;
            width: 160px;
            height: 32px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
          }

          .search-icon {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--admin-text-muted);
            pointer-events: none;
            z-index: 1;
          }

          .search-input {
            width: 100%;
            height: 32px;
            padding: 0 28px 0 32px;
            background: var(--admin-bg-tertiary);
            border: 1px solid var(--admin-border-default);
            border-radius: 6px;
            font-size: 0.75rem;
            color: var(--admin-text-primary);
            outline: none;
            transition: border-color 0.15s;
            box-sizing: border-box;
          }

          .search-input:focus {
            border-color: var(--admin-olive);
          }

          .search-input::placeholder {
            color: var(--admin-text-muted);
          }

          .btn-clear {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            background: var(--admin-bg-hover);
            border: none;
            border-radius: 4px;
            color: var(--admin-text-muted);
            cursor: pointer;
          }

          .btn-clear:hover {
            background: var(--admin-status-danger-bg);
            color: var(--admin-status-danger);
          }

          .filter-select {
            height: 32px;
            padding: 0 24px 0 8px;
            background: var(--admin-bg-tertiary);
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
            background-position: right 6px center;
            min-width: 80px;
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

          .filter-sous-type {
            max-width: 130px;
          }

          .filter-categories-wrapper {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
          }

          .filter-chip {
            height: 28px;
            padding: 0 10px;
            background: var(--admin-bg-tertiary);
            border: 1px solid var(--admin-border-default);
            border-radius: 14px;
            font-size: 0.7rem;
            color: var(--admin-text-secondary);
            cursor: pointer;
            transition: all 0.15s;
            white-space: nowrap;
          }

          .filter-chip:hover {
            border-color: var(--admin-border-hover);
            background: var(--admin-bg-hover);
          }

          .filter-chip.active {
            background: var(--admin-olive-bg);
            border-color: var(--admin-olive);
            color: var(--admin-olive);
            font-weight: 600;
          }

          .filter-toggle {
            display: flex;
            align-items: center;
            gap: 4px;
            height: 32px;
            padding: 0 10px;
            background: var(--admin-bg-tertiary);
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

          .btn-reset {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: var(--admin-bg-tertiary);
            border: 1px solid var(--admin-border-default);
            border-radius: 6px;
            color: var(--admin-text-muted);
            cursor: pointer;
            transition: all 0.15s;
            box-sizing: border-box;
            flex-shrink: 0;
          }

          .btn-reset:hover {
            background: var(--admin-status-danger-bg);
            border-color: var(--admin-status-danger);
            color: var(--admin-status-danger);
          }

          .result-count {
            font-size: 0.75rem;
            color: var(--admin-text-muted);
            flex-shrink: 0;
            white-space: nowrap;
            line-height: 32px;
          }

          /* Tableau */
          .table-container {
            flex: 1;
            overflow: auto;
            min-height: 0;
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
            width: 50px;
            text-align: center;
          }

          .product-image {
            width: 40px;
            height: 40px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid var(--admin-border-subtle);
          }

          .no-image {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--admin-bg-tertiary);
            border-radius: 4px;
            border: 1px solid var(--admin-border-subtle);
            color: var(--admin-text-muted);
            font-size: 0.75rem;
          }

          /* Image avec état de chargement */
          .image-container {
            position: relative;
            width: 40px;
            height: 40px;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid var(--admin-border-subtle);
            background: var(--admin-bg-tertiary);
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

          .image-container .product-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 1;
            transition: opacity 0.2s ease;
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
            width: 40px;
            height: 40px;
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
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--admin-olive);
          }

          .col-nom {
            max-width: 280px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .col-type {
            font-size: 0.75rem;
            color: var(--admin-text-muted);
            max-width: 120px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .col-dim {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
          }

          .col-dimensions {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--admin-text-muted);
          }

          .col-prix {
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            color: var(--admin-sable);
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
          @media (max-width: 900px) {
            .filters-bar {
              gap: 0.375rem;
              padding: 0.5rem;
            }

            .search-box {
              width: 140px;
            }

            .filter-select {
              min-width: 65px;
              padding-left: 6px;
              padding-right: 20px;
              font-size: 0.7rem;
            }

            .col-dimensions,
            .col-type {
              display: none;
            }

            .col-nom {
              max-width: 150px;
            }
          }

          @media (max-width: 600px) {
            .separator {
              display: none;
            }

            .search-box {
              width: 120px;
            }

            .filter-select {
              min-width: 55px;
            }

            .result-count {
              display: none;
            }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}
