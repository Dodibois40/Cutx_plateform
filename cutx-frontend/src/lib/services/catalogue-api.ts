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
  longueur: number;
  largeur: number;
  epaisseur: number;
  stock: 'EN STOCK' | 'Sur commande';
  prixAchatM2?: number;
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
  pricePerM2: number;
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
  const epaisseur = panel.thickness[0] || 19;

  // Déterminer la sous-catégorie pour le filtrage:
  // - Si la catégorie a un parent, utiliser le nom du parent (ex: "Panneaux Basiques & Techniques")
  // - Sinon, utiliser le nom de la catégorie directement (ex: "Panneaux Déco")
  const sousCategorie = panel.category?.parent?.name
    || panel.category?.name
    || 'Matières';

  // Pour la catégorie détaillée (affichage), utiliser le nom exact
  const categorie = panel.category?.name || 'Panneaux';

  return {
    id: panel.id,
    nom: panel.name,
    reference: panel.reference,
    codeArticle: panel.reference,
    marque: panel.finish || 'Bouney',
    categorie,
    sousCategorie,
    type: panel.material,
    longueur: panel.defaultLength,
    largeur: panel.defaultWidth,
    epaisseur,
    stock: panel.stockStatus === 'EN STOCK' ? 'EN STOCK' : 'Sur commande',
    prixAchatM2: panel.pricePerM2,
    prixVenteM2: panel.pricePerM2,
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
  type?: string;
  categorie?: string;
  sousCategorie?: string;
  epaisseurMin?: number;
  epaisseurMax?: number;
  enStock?: boolean;
  sortBy?: 'nom' | 'marque' | 'prix' | 'epaisseur' | 'stock' | 'reference';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
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
  if (params.marque) queryParams.append('marque', params.marque);
  if (params.epaisseurMin) queryParams.append('epaisseur', params.epaisseurMin.toString());
  if (params.enStock) queryParams.append('enStock', 'true');

  // Utiliser l'endpoint unifié /panels qui retourne tous les catalogues
  const endpoint = `/api/catalogues/panels?${queryParams}`;

  const response = await apiCall<{ panels: ApiPanel[]; total: number }>(endpoint);

  // Transformer les panels en produits
  const produits = (response.panels || []).map(transformPanel);

  return {
    produits,
    total: response.total || produits.length,
    page: 1,
    limit: params.limit || 100,
    hasMore: false,
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
 * Récupérer toutes les marques disponibles
 */
export async function getMarquesDisponibles(): Promise<string[]> {
  // Marques réelles du catalogue Bouney
  return ['B comme Bois', 'Egger', 'Fenix', 'Formica', 'Nebodesign', 'Pfleiderer', 'Polyrey', 'Rehau Rauvisio', 'Unilin'];
}

/**
 * Récupérer tous les types disponibles
 */
export async function getTypesDisponibles(): Promise<string[]> {
  // Route n'existe pas encore - retourner les types connus
  return [
    'Mélaminé P2',
    'Mélaminé P5',
    'Stratifié HPL',
    'Stratifié CPL',
    'Compact',
    'Chant ABS',
    'Chant PVC',
  ];
}

/**
 * Récupérer toutes les catégories disponibles depuis l'API
 * Déduplique automatiquement car les catégories peuvent exister dans plusieurs catalogues
 */
export async function getSousCategories(): Promise<string[]> {
  try {
    const response = await apiCall<{
      categories: { name: string; slug: string; catalogueName: string }[]
    }>('/api/catalogues/categories');

    // Dédupliquer les noms de catégories (peuvent exister dans plusieurs catalogues)
    return [...new Set(response.categories.map(cat => cat.name))];
  } catch (error) {
    console.error('Erreur chargement catégories:', error);
    // Fallback vers les catégories connues
    return ['Unis', 'Bois', 'Matières', 'Panneaux Déco', 'Panneaux Basiques & Techniques'];
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
  if (params.marque) queryParams.append('marque', params.marque);
  if (params.type) queryParams.append('type', params.type);
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
