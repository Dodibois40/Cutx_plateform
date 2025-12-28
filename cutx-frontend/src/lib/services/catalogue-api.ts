// ═══════════════════════════════════════════════════════════════
// CLIENT API CATALOGUE BOUNEY
// Service pour communiquer avec l'API backend PostgreSQL
// ═══════════════════════════════════════════════════════════════

import { apiCall } from './core';

// Types correspondant au backend
export interface CatalogueProduit {
  id: string;
  nom: string;
  reference: string;
  codeArticle: string;
  marque: string;
  categorie: string;
  sousCategorie: string;
  type: string;
  qualiteSupport?: string;  // Qualité du support (âme du panneau) pour Essences fines
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
  if (params.marque) queryParams.append('marque', params.marque);
  if (params.type) queryParams.append('type', params.type);
  if (params.categorie) queryParams.append('categorie', params.categorie);
  if (params.sousCategorie) queryParams.append('sousCategorie', params.sousCategorie);
  if (params.epaisseurMin !== undefined) queryParams.append('epaisseurMin', params.epaisseurMin.toString());
  if (params.epaisseurMax !== undefined) queryParams.append('epaisseurMax', params.epaisseurMax.toString());
  if (params.enStock !== undefined) queryParams.append('enStock', params.enStock.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
  if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

  return apiCall<SearchResult>(`/api/catalogues/search?${queryParams}`);
}

/**
 * Récupérer les statistiques du catalogue
 */
export async function getCatalogueStats(): Promise<CatalogueStats> {
  return apiCall<CatalogueStats>('/api/catalogues/stats');
}

/**
 * Récupérer toutes les marques disponibles
 */
export async function getMarquesDisponibles(): Promise<string[]> {
  const data = await apiCall<{ marques: string[] }>('/api/catalogues/marques');
  return data.marques;
}

/**
 * Récupérer tous les types disponibles
 */
export async function getTypesDisponibles(): Promise<string[]> {
  const data = await apiCall<{ types: string[] }>('/api/catalogues/types');
  return data.types;
}

/**
 * Récupérer toutes les sous-catégories disponibles
 */
export async function getSousCategories(): Promise<string[]> {
  const data = await apiCall<{ sousCategories: string[] }>('/api/catalogues/sous-categories');
  return data.sousCategories;
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
