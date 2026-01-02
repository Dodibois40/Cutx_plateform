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
  category?: {
    name: string;
    slug: string;
    parent?: { name: string; slug: string } | null;
  };
  createdAt: string;
  updatedAt: string;
}

// Transformer un panel API en CatalogueProduit
function transformPanel(panel: ApiPanel): CatalogueProduit {
  // Épaisseur: priorité à defaultThickness, sinon premier élément du tableau
  const epaisseur = panel.defaultThickness || panel.thickness[0] || 19;

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
 * Structure actuelle du catalogue B comme Bois:
 * - "Panneaux Basiques & Techniques" → Agglomérés, MDF, Contreplaqués, OSB, Lattés
 * - "Stratifiés - Mélaminés - Compacts - Chants" → Unis, Bois, Fantaisies, Mélaminés, Chants
 * - "Essences Fine" → Agglomérés/MDF/Contreplaqués/Lattés replaqués, Stratifiés flex
 * - "Panneaux Déco" → Panneaux décoratifs
 */
export async function getSousCategories(): Promise<string[]> {
  // Catégories parentes principales du catalogue B comme Bois
  return [
    'Panneaux Basiques & Techniques',
    'Stratifiés - Mélaminés - Compacts - Chants',
    'Essences Fine',
    'Panneaux Déco',
  ];
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
