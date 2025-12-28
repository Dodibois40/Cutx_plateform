import { apiCall } from './core';
import type { CategoriePanneau } from '../configurateur/types';

// Types pour le catalogue de panneaux
export interface PanneauCatalogue {
  id: string;
  nom: string;
  categorie: CategoriePanneau;
  essence: string | null;
  epaisseurs: number[];
  prixM2: Record<string, number>;
  fournisseur: string | null;
  disponible: boolean;
  description: string | null;
  ordre: number;
  createdAt: string;
  updatedAt: string;
  // Champ optionnel pour l'image (vient du catalogue produits)
  imageUrl?: string;
}

export interface CreatePanneauData {
  nom: string;
  categorie: CategoriePanneau;
  essence?: string | null;
  epaisseurs: number[];
  prixM2: Record<string, number>;
  fournisseur?: string | null;
  disponible?: boolean;
  description?: string | null;
  ordre?: number;
}

export interface UpdatePanneauData {
  nom?: string;
  categorie?: CategoriePanneau;
  essence?: string | null;
  epaisseurs?: number[];
  prixM2?: Record<string, number>;
  fournisseur?: string | null;
  disponible?: boolean;
  description?: string | null;
  ordre?: number;
}

/**
 * Récupère les panneaux disponibles (route publique)
 * Pour le configurateur client
 */
export async function getPanneauxDisponibles(): Promise<PanneauCatalogue[]> {
  return apiCall<PanneauCatalogue[]>('/api/panneaux-catalogue/disponibles');
}

/**
 * Récupère tous les panneaux (admin)
 * Y compris les panneaux non disponibles
 */
export async function getAllPanneaux(): Promise<PanneauCatalogue[]> {
  return apiCall<PanneauCatalogue[]>('/api/panneaux-catalogue');
}

/**
 * Récupère un panneau par son ID (admin)
 */
export async function getPanneauById(id: string): Promise<PanneauCatalogue> {
  return apiCall<PanneauCatalogue>(`/api/panneaux-catalogue/${id}`);
}

/**
 * Crée un nouveau panneau (admin)
 */
export async function createPanneau(data: CreatePanneauData): Promise<PanneauCatalogue> {
  return apiCall<PanneauCatalogue>('/api/panneaux-catalogue', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Met à jour un panneau (admin)
 */
export async function updatePanneau(id: string, data: UpdatePanneauData): Promise<PanneauCatalogue> {
  return apiCall<PanneauCatalogue>(`/api/panneaux-catalogue/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Supprime un panneau (admin)
 */
export async function deletePanneau(id: string): Promise<{ success: boolean; message: string }> {
  return apiCall(`/api/panneaux-catalogue/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Réinitialise le catalogue aux valeurs par défaut (admin)
 */
export async function resetPanneauxCatalogue(): Promise<{
  success: boolean;
  message: string;
  panneaux: PanneauCatalogue[];
}> {
  return apiCall('/api/panneaux-catalogue/reset', {
    method: 'POST',
  });
}

/**
 * Met à jour l'ordre des panneaux (admin)
 */
export async function reorderPanneaux(ordres: { id: string; ordre: number }[]): Promise<{ success: boolean; message: string }> {
  return apiCall('/api/panneaux-catalogue/reorder', {
    method: 'PUT',
    body: JSON.stringify({ ordres }),
  });
}

// Catégories de panneaux (pour l'UI)
export const CATEGORIES_PANNEAUX_LABELS: Record<CategoriePanneau, string> = {
  mdf: 'MDF Standard',
  mdf_hydro: 'MDF Hydrofuge',
  agglo_brut: 'Aggloméré brut',
  agglo_plaque: 'Aggloméré plaqué',
  cp: 'Contreplaqué',
  bois_massif: 'Bois massif',
};
