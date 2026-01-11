// ═══════════════════════════════════════════════════════════════
// CLIENT API CATALOGUE BOUNEY
// Adapté pour l'API CutX PostgreSQL
// ═══════════════════════════════════════════════════════════════

import { apiCall } from './core';

// Types correspondant au frontend (format legacy)
export interface CatalogueProduit {
  id: string;
  nom: string;
  reference: string;
  codeArticle: string;
  refFabricant?: string; // Référence fabricant (ex: U963 pour Egger)
  marque: string;
  categorie: string;
  sousCategorie: string;
  type: string;
  qualiteSupport?: string;
  productType?: string; // MELAMINE, STRATIFIE, BANDE_DE_CHANT, COMPACT
  longueur: number | 'Variable';
  largeur: number;
  epaisseur: number;
  isVariableLength?: boolean;
  stock: 'EN STOCK' | 'Sur commande';
  prixAchatM2?: number;
  prixMl?: number; // Prix au mètre linéaire (chants)
  prixUnit?: number; // Prix unitaire
  marge?: number;
  prixVenteM2?: number;
  imageUrl?: string;
  disponible: boolean;
  fournisseur?: string; // Nom du fournisseur (B comme Bois, Dispano)
  createdAt: string;
  updatedAt: string;
}

// Type retourné par l'API CutX
interface ApiPanel {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  thickness: number[];
  defaultLength: number;
  defaultWidth: number;
  defaultThickness: number | null;
  isVariableLength: boolean;
  pricePerM2: number | null;
  pricePerMl: number | null;
  pricePerUnit: number | null;
  productType: string | null;
  material: string;
  finish: string;
  colorCode: string | null;
  imageUrl: string | null;
  isActive: boolean;
  stockStatus: string | null;
  manufacturerRef: string | null; // Référence fabricant (ex: U963 pour Egger)
  category?: {
    name: string;
    slug: string;
    parent?: { name: string; slug: string } | null;
  };
  catalogue?: { name: string }; // Fournisseur (Bouney, Dispano)
  createdAt: string;
  updatedAt: string;
}

// Transformer un panel API en CatalogueProduit
function transformPanel(panel: ApiPanel): CatalogueProduit {
  // Épaisseur: priorité à defaultThickness, sinon premier élément du tableau
  // Ne pas utiliser de fallback par défaut - garder 0 si pas d'épaisseur
  const epaisseur = panel.defaultThickness || panel.thickness[0] || 0;

  // Déterminer la sous-catégorie pour le filtrage
  const sousCategorie = panel.category?.parent?.name
    || panel.category?.name
    || 'Matières';

  // Pour la catégorie détaillée (affichage), utiliser le nom exact
  const categorie = panel.category?.name || 'Panneaux';

  // Longueur: 'Variable' si isVariableLength, sinon la valeur
  const longueur: number | 'Variable' = panel.isVariableLength ? 'Variable' : panel.defaultLength;

  // Prix: selon le type de produit
  const prixM2 = panel.pricePerM2 || undefined;
  const prixMl = panel.pricePerMl || undefined;
  const prixUnit = panel.pricePerUnit || undefined;

  return {
    id: panel.id,
    nom: panel.name,
    reference: panel.reference,
    codeArticle: panel.reference,
    refFabricant: panel.manufacturerRef || undefined,
    marque: panel.finish || 'Bouney',
    categorie,
    sousCategorie,
    type: panel.material || panel.productType || '',
    productType: panel.productType || undefined,
    longueur,
    largeur: panel.defaultWidth,
    epaisseur,
    isVariableLength: panel.isVariableLength,
    stock: panel.stockStatus === 'EN STOCK' ? 'EN STOCK' : 'Sur commande',
    prixAchatM2: prixM2,
    prixMl,
    prixUnit,
    prixVenteM2: prixM2,
    imageUrl: panel.imageUrl || undefined,
    disponible: panel.isActive,
    fournisseur: panel.catalogue?.name || undefined,
    createdAt: panel.createdAt,
    updatedAt: panel.updatedAt,
  };
}

export interface SearchResult {
  produits: CatalogueProduit[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SearchParams {
  q?: string;
  marque?: string;
  productType?: string; // MELAMINE, STRATIFIE, BANDE_DE_CHANT, COMPACT
  categorie?: string;
  sousCategorie?: string;
  epaisseurMin?: number;
  epaisseurMax?: number;
  enStock?: boolean;
  sortBy?: 'nom' | 'marque' | 'prix' | 'epaisseur' | 'stock' | 'reference';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  catalogue?: string; // Filter by catalogue slug (e.g., 'bouney', 'dispano')
}

export interface CatalogueStats {
  total: number;
  enStock: number;
  parMarque: { marque: string; count: number }[];
  parType: { type: string; count: number }[];
  parSousCategorie: { sousCategorie: string; count: number }[];
}

// ═══════════════════════════════════════════════════════════════
// TYPES POUR LES OPTIONS DE FILTRES DYNAMIQUES
// ═══════════════════════════════════════════════════════════════

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface ThicknessOption {
  value: number;
  count: number;
}

export interface FilterOptionsResponse {
  productTypes: FilterOption[];
  categories: FilterOption[];
  thicknesses: ThicknessOption[];
  catalogues: { slug: string; name: string }[];
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS DE RECHERCHE (PUBLIQUES)
// ═══════════════════════════════════════════════════════════════

/**
 * Rechercher dans le catalogue avec filtres
 * Utilise /api/catalogues/panels pour récupérer les panels de TOUS les catalogues
 * Supporte le filtrage côté serveur pour de meilleures performances
 */
export async function searchCatalogues(params: SearchParams = {}): Promise<SearchResult> {
  const queryParams = new URLSearchParams();

  // Filtres envoyés au backend
  if (params.q) queryParams.append('search', params.q);
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params.offset !== undefined) queryParams.append('page', String(Math.floor(params.offset / (params.limit || 100)) + 1));
  if (params.sousCategorie) queryParams.append('sousCategorie', params.sousCategorie);
  if (params.productType) queryParams.append('productType', params.productType);
  if (params.epaisseurMin) queryParams.append('epaisseur', params.epaisseurMin.toString());
  if (params.enStock) queryParams.append('enStock', 'true');
  if (params.catalogue) queryParams.append('catalogue', params.catalogue);

  // Tri côté serveur - mapper les noms frontend vers backend
  if (params.sortBy) {
    const sortByMap: Record<string, string> = {
      nom: 'name',
      reference: 'reference',
      prix: 'pricePerM2',
      epaisseur: 'defaultThickness',
      stock: 'stockStatus',
    };
    queryParams.append('sortBy', sortByMap[params.sortBy] || 'name');
  }
  if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

  // Utiliser l'endpoint unifié /panels qui retourne tous les catalogues
  const endpoint = `/api/catalogues/panels?${queryParams}`;

  const response = await apiCall<{
    panels: ApiPanel[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(endpoint);

  // Transformer les panels en produits
  const produits = (response.panels || []).map(transformPanel);

  return {
    produits,
    total: response.total || produits.length,
    page: response.page || 1,
    limit: response.limit || params.limit || 100,
    hasMore: response.hasMore ?? false,
  };
}

/**
 * Récupérer les statistiques du catalogue
 */
export async function getCatalogueStats(): Promise<CatalogueStats> {
  // Route n'existe pas encore - retourner des valeurs par défaut
  return {
    total: 2001,
    enStock: 2001,
    parMarque: [{ marque: 'Egger', count: 1500 }, { marque: 'Autres', count: 501 }],
    parType: [{ type: 'Mélaminé', count: 800 }, { type: 'Stratifié', count: 600 }],
    parSousCategorie: [{ sousCategorie: 'Bois', count: 1000 }, { sousCategorie: 'Unis', count: 600 }],
  };
}

/**
 * Récupérer tous les types de produits disponibles
 * Basé sur le champ productType en base de données
 */
export async function getTypesDisponibles(): Promise<{ value: string; label: string; count?: number }[]> {
  // Types réels du catalogue (basés sur productType en DB)
  return [
    { value: 'MELAMINE', label: 'Mélaminé' },
    { value: 'STRATIFIE', label: 'Stratifié' },
    { value: 'PLACAGE', label: 'Placage / Essence Fine' },
    { value: 'BANDE_DE_CHANT', label: 'Bande de chant' },
    { value: 'COMPACT', label: 'Compact' },
  ];
}

/**
 * Récupérer la liste des catalogues disponibles
 */
export async function getCatalogues(): Promise<{ slug: string; name: string }[]> {
  try {
    const response = await apiCall<{ catalogues: { slug: string; name: string }[] }>('/api/catalogues');
    return response.catalogues || [];
  } catch {
    // Fallback en cas d'erreur
    return [
      { slug: 'bouney', name: 'B comme Bois' },
      { slug: 'dispano', name: 'Dispano' },
    ];
  }
}

/**
 * Récupérer toutes les catégories parentes disponibles depuis l'API
 * @deprecated Utiliser getFilterOptions() à la place pour obtenir les vraies valeurs de la DB
 */
export async function getSousCategories(): Promise<string[]> {
  // Fallback - utiliser getFilterOptions() pour les vraies valeurs
  return [
    'Panneaux Basiques & Techniques',
    'Stratifiés - Mélaminés - Compacts - Chants',
    'Essences Fine',
    'Panneaux Déco',
  ];
}

/**
 * Récupérer les options de filtres dynamiques depuis la base de données
 * Retourne les vraies valeurs de productType, categories et thicknesses avec leur count
 * @param catalogueSlug - Optionnel: filtrer par catalogue spécifique
 */
export async function getFilterOptions(catalogueSlug?: string): Promise<FilterOptionsResponse> {
  try {
    const params = new URLSearchParams();
    if (catalogueSlug) {
      params.append('catalogue', catalogueSlug);
    }

    const endpoint = `/api/catalogues/filter-options${params.toString() ? '?' + params.toString() : ''}`;
    const response = await apiCall<FilterOptionsResponse>(endpoint);
    return response;
  } catch (error) {
    console.error('Erreur lors de la récupération des options de filtres:', error);
    // Fallback avec valeurs par défaut si l'API échoue
    return {
      productTypes: [
        { value: 'MELAMINE', label: 'Mélaminé', count: 0 },
        { value: 'STRATIFIE', label: 'Stratifié', count: 0 },
        { value: 'PLACAGE', label: 'Placage / Essence Fine', count: 0 },
        { value: 'BANDE_DE_CHANT', label: 'Bande de chant', count: 0 },
        { value: 'COMPACT', label: 'Compact', count: 0 },
      ],
      categories: [],
      thicknesses: [],
      catalogues: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// SPONSORED PANELS - Panneaux sponsorisés
// ═══════════════════════════════════════════════════════════════

/**
 * Récupérer les panneaux sponsorisés
 * @param limit - Nombre max de panneaux (défaut: 4)
 * @param query - Optionnel: filtre par requête de recherche
 */
export async function getSponsored(
  limit: number = 4,
  query?: string
): Promise<CatalogueProduit[]> {
  try {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (query) params.append('q', query);

    const response = await apiCall<{ panels: ApiPanel[] }>(
      `/api/catalogues/sponsored?${params}`
    );

    return (response.panels || []).map(transformPanel);
  } catch (error) {
    console.error('Error fetching sponsored panels:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// SMART SEARCH - Recherche Intelligente
// ═══════════════════════════════════════════════════════════════

export interface SmartSearchParsed {
  productTypes: string[];
  subcategories: string[];
  thickness: number | null;
  searchTerms: string[];
  originalQuery: string;
}

export interface SmartSearchFacets {
  genres: { label: string; count: number; searchTerm: string }[];
  dimensions: { label: string; count: number; length: number; width: number }[];
  thicknesses: { value: number; count: number }[];
}

export interface SmartSearchResult {
  produits: CatalogueProduit[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  parsed: SmartSearchParsed;
  facets: SmartSearchFacets;
}

/**
 * Recherche Intelligente - Parse automatiquement les requêtes en langage naturel
 *
 * Exemples de requêtes supportées:
 * - "mdf 19" → trouve les MDF en 19mm
 * - "méla gris foncé" → trouve les mélaminés gris foncé
 * - "agglo chêne 19" → trouve les agglomérés plaqués chêne en 19mm
 * - "strat blanc 0.8" → trouve les stratifiés blancs en 0.8mm
 * - "chant chêne" → trouve les bandes de chant chêne
 *
 * @param query - Requête en langage naturel
 * @param options - Options de pagination et tri
 */
export async function smartSearch(
  query: string,
  options?: {
    page?: number;
    limit?: number;
    catalogueSlug?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    enStock?: boolean;
    // Filtres explicites
    decorCategory?: string;
    manufacturer?: string;
    isHydrofuge?: boolean;
    isIgnifuge?: boolean;
    isPreglued?: boolean;
  }
): Promise<SmartSearchResult> {
  const queryParams = new URLSearchParams();
  queryParams.append('q', query);

  if (options?.page) queryParams.append('page', options.page.toString());
  if (options?.limit) queryParams.append('limit', options.limit.toString());
  if (options?.catalogueSlug) queryParams.append('catalogue', options.catalogueSlug);
  if (options?.sortBy) queryParams.append('sortBy', options.sortBy);
  if (options?.sortDirection) queryParams.append('sortDirection', options.sortDirection);
  if (options?.enStock) queryParams.append('enStock', 'true');
  // Filtres explicites
  if (options?.decorCategory) queryParams.append('decorCategory', options.decorCategory);
  if (options?.manufacturer) queryParams.append('manufacturer', options.manufacturer);
  if (options?.isHydrofuge) queryParams.append('isHydrofuge', 'true');
  if (options?.isIgnifuge) queryParams.append('isIgnifuge', 'true');
  if (options?.isPreglued) queryParams.append('isPreglued', 'true');

  const endpoint = `/api/catalogues/smart-search?${queryParams}`;

  const response = await apiCall<{
    panels: ApiPanel[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    parsed: SmartSearchParsed;
    facets: SmartSearchFacets;
  }>(endpoint);

  // Transformer les panels en produits
  const produits = (response.panels || []).map(transformPanel);

  return {
    produits,
    total: response.total || produits.length,
    page: response.page || 1,
    limit: response.limit || options?.limit || 100,
    hasMore: response.hasMore ?? false,
    parsed: response.parsed,
    facets: response.facets || { genres: [], dimensions: [], thicknesses: [] },
  };
}

// ═══════════════════════════════════════════════════════════════
// MATCHING CHANT (EDGE BANDING) - Auto-detect matching edge banding
// ═══════════════════════════════════════════════════════════════

/**
 * Find a matching edge banding (chant) for a panel based on manufacturerRef
 *
 * When user assigns a panel like "Egger H1180", this function searches for
 * a matching edge banding with the same manufacturer reference (e.g., "ABS H1180").
 *
 * @param manufacturerRef - The manufacturer reference (e.g., "H1180", "U999")
 * @param thickness - Optional: preferred edge banding thickness (e.g., 0.8, 1, 2)
 * @returns The best matching edge banding product, or null if not found
 */
export async function findMatchingChant(
  manufacturerRef: string,
  thickness?: number
): Promise<CatalogueProduit | null> {
  if (!manufacturerRef || manufacturerRef.trim() === '') {
    return null;
  }

  try {
    // Search for edge banding with the same manufacturer reference
    const result = await smartSearch(manufacturerRef, {
      limit: 10,
    });

    // Filter to only edge banding products
    const chants = result.produits.filter(p => p.productType === 'BANDE_DE_CHANT');

    if (chants.length === 0) {
      console.log(`[findMatchingChant] No chant found for ref: ${manufacturerRef}`);
      return null;
    }

    // If thickness preference, try to match it
    if (thickness) {
      const matchingThickness = chants.find(c => c.epaisseur === thickness);
      if (matchingThickness) {
        console.log(`[findMatchingChant] Found matching chant with thickness ${thickness}:`, matchingThickness.nom);
        return matchingThickness;
      }
    }

    // Return the first match (usually the most relevant based on search ranking)
    console.log(`[findMatchingChant] Found matching chant:`, chants[0].nom);
    return chants[0];
  } catch (error) {
    console.error('[findMatchingChant] Error searching for matching chant:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// SEARCH SUGGESTIONS - Correction de fautes de frappe
// ═══════════════════════════════════════════════════════════════

export interface SearchSuggestion {
  original: string;
  suggestion: string;
  confidence: number;
  type: 'wood' | 'color' | 'productType' | 'manufacturer' | 'other';
}

export interface SuggestResponse {
  originalQuery: string;
  suggestions: SearchSuggestion[];
  correctedQuery: string | null;
}

/**
 * Get spelling correction suggestions for a search query
 * Uses trigram similarity to find close matches
 *
 * @param query - The search query to check for typos
 * @returns Suggestions for corrections if any typos detected
 */
export async function getSearchSuggestions(
  query: string
): Promise<SuggestResponse> {
  if (!query || query.trim().length < 3) {
    return {
      originalQuery: query || '',
      suggestions: [],
      correctedQuery: null,
    };
  }

  try {
    const response = await apiCall<SuggestResponse>(
      `/api/catalogues/suggest?q=${encodeURIComponent(query)}`
    );
    return response;
  } catch (error) {
    console.warn('[getSearchSuggestions] Error:', error);
    return {
      originalQuery: query,
      suggestions: [],
      correctedQuery: null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS ADMIN (protégées - nécessitent authentification)
// ═══════════════════════════════════════════════════════════════

/**
 * Récupérer tous les produits (admin)
 */
export async function getAllProduitsAdmin(params: SearchParams = {}): Promise<SearchResult> {
  const queryParams = new URLSearchParams();

  if (params.q) queryParams.append('q', params.q);
  if (params.productType) queryParams.append('productType', params.productType);
  if (params.sousCategorie) queryParams.append('sousCategorie', params.sousCategorie);
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

  return apiCall<SearchResult>(`/api/catalogues/admin?${queryParams}`);
}

/**
 * Créer un nouveau produit (admin)
 */
export async function createProduit(data: Omit<CatalogueProduit, 'id' | 'createdAt' | 'updatedAt'>): Promise<CatalogueProduit> {
  return apiCall<CatalogueProduit>('/api/catalogues/admin', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Mettre à jour un produit (admin)
 */
export async function updateProduit(id: string, data: Partial<CatalogueProduit>): Promise<CatalogueProduit> {
  return apiCall<CatalogueProduit>(`/api/catalogues/admin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Supprimer un produit (admin)
 */
export async function deleteProduit(id: string): Promise<void> {
  return apiCall<void>(`/api/catalogues/admin/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Import en masse de produits (admin)
 */
export async function importProduits(produits: Omit<CatalogueProduit, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<{ count: number }> {
  return apiCall<{ count: number }>('/api/catalogues/admin/import', {
    method: 'POST',
    body: JSON.stringify({ produits }),
  });
}

/**
 * Mise à jour en masse (admin)
 */
export async function bulkUpdateProduits(updates: { codeArticle: string; data: Partial<CatalogueProduit> }[]): Promise<{ succeeded: number; failed: number; total: number }> {
  return apiCall<{ succeeded: number; failed: number; total: number }>('/api/catalogues/admin/bulk-update', {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
}
