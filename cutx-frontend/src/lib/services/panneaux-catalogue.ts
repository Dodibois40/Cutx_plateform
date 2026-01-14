import { apiCall } from './core';
import type { CategoriePanneau } from '../configurateur/types';

// Types pour le catalogue de panneaux (format frontend)
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
  // Dimensions du panneau brut (en mm)
  longueur: number;
  largeur: number;
  // Champ optionnel pour l'image (vient du catalogue produits)
  imageUrl?: string;
  // Référence fabricant (ex: "H1180" pour Egger) - pour suggestion de chant
  refFabricant?: string | null;
}

// Type retourné par l'API backend (format PostgreSQL)
interface ApiPanel {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  thickness: number[];
  defaultLength: number;
  defaultWidth: number;
  pricePerM2: number;
  pricePerPanel: number | null;
  material: string;
  finish: string;
  colorCode: string | null;
  imageUrl: string | null;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Mapping material -> categorie
function mapMaterialToCategorie(material: string | null | undefined): CategoriePanneau {
  if (!material) return 'agglo_plaque'; // Défaut si material est null/undefined

  const materialLower = material.toLowerCase();

  // MDF (standard ou hydrofuge)
  if (materialLower.includes('mdf') && materialLower.includes('hydro')) return 'mdf_hydro';
  if (materialLower.includes('mdf')) return 'mdf';

  // Contreplaqué (y compris replaqués)
  if (materialLower.includes('contreplaqué') || materialLower.includes('cp')) return 'cp';

  // Aggloméré (brut, plaqué ou replaqué)
  if (materialLower.includes('aggloméré') || materialLower.includes('agglo')) {
    if (materialLower.includes('plaqué') || materialLower.includes('replaqué')) return 'agglo_plaque';
    return 'agglo_brut';
  }

  // Replaqués génériques (Essences Fine) - mapper selon le support
  if (materialLower.includes('replaqué')) {
    if (materialLower.includes('latté')) return 'bois_massif';
    return 'agglo_plaque'; // Par défaut pour replaqués
  }

  // Bois massif et lattés
  if (materialLower.includes('massif') || materialLower.includes('latté')) return 'bois_massif';

  // Par défaut pour mélaminé, stratifié, placage, etc.
  return 'agglo_plaque';
}

// Transformer un panel API en PanneauCatalogue frontend
function transformApiPanel(panel: ApiPanel): PanneauCatalogue {
  // Créer prixM2 par épaisseur
  // Inclure le prix même s'il est 0, pour éviter de tomber sur le default de 50€/m²
  // Seul null est exclu (prix non défini)
  const prixM2: Record<string, number> = {};
  if (panel.pricePerM2 != null) {
    for (const ep of panel.thickness) {
      prixM2[ep.toString()] = panel.pricePerM2;
    }
  }

  return {
    id: panel.id,
    nom: panel.name,
    categorie: mapMaterialToCategorie(panel.material),
    essence: panel.colorCode || panel.finish || null,
    epaisseurs: panel.thickness,
    prixM2,
    fournisseur: panel.finish || null,
    disponible: panel.isActive,
    description: panel.description,
    ordre: 0,
    createdAt: panel.createdAt,
    updatedAt: panel.updatedAt,
    longueur: panel.defaultLength,
    largeur: panel.defaultWidth,
    imageUrl: panel.imageUrl || undefined,
  };
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
 * Récupère les panneaux disponibles depuis le catalogue Bouney
 * Pour le configurateur client
 */
export async function getPanneauxDisponibles(): Promise<PanneauCatalogue[]> {
  // Appeler l'API catalogues (nouvelle route PostgreSQL)
  const response = await apiCall<{ panels: ApiPanel[]; total: number }>(
    '/api/catalogues/bouney/panels?limit=500'
  );

  // Transformer les données au format attendu par le frontend
  return response.panels.map(transformApiPanel);
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
