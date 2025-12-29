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
  category?: { name: string; slug: string };
  createdAt: string;
  updatedAt: string;
}

// Transformer un panel API en CatalogueProduit
function transformPanel(panel: ApiPanel): CatalogueProduit {
  const epaisseur = panel.thickness[0] || 19;
  return {
    id: panel.id,
    nom: panel.name,
    reference: panel.reference,
    codeArticle: panel.reference,
    marque: panel.finish || 'Bouney',
    categorie: panel.category?.name || 'Panneaux',
    sousCategorie: panel.category?.slug?.includes('bois') ? 'Bois' :
                   panel.category?.slug?.includes('unis') ? 'Unis' : 'Matières',
    type: panel.material,
    longueur: panel.defaultLength,
    largeur: panel.defaultWidth,
    epaisseur,
    stock: panel.isActive ? 'EN STOCK' : 'Sur commande',
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
 */
export async function searchCatalogues(params: SearchParams = {}): Promise<SearchResult> {
  const queryParams = new URLSearchParams();

  if (params.q) queryParams.append('q', params.q);
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

  // Utiliser l'endpoint bouney/panels (search ne fonctionne pas sans query)
  // Si on a un terme de recherche, utiliser search, sinon panels
  const endpoint = params.q
    ? `/api/catalogues/search?${queryParams}`
    : `/api/catalogues/bouney/panels?${queryParams}`;

  const response = await apiCall<{ panels: ApiPanel[] }>(endpoint);

  // Transformer les panels en produits
  const produits = (response.panels || []).map(transformPanel);

  return {
    produits,
    total: produits.length,
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
  // Route n'existe pas encore - retourner les marques connues
  return ['Egger', 'Finsa', 'Kronospan', 'Pfleiderer', 'Sonae'];
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
 * Récupérer toutes les sous-catégories disponibles
 */
export async function getSousCategories(): Promise<string[]> {
  // Route n'existe pas encore - retourner les catégories connues
  return ['Unis', 'Bois', 'Matières'];
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
