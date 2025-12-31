/**
 * Service API pour les templates de panneaux multicouches
 * Permet de sauvegarder et récupérer les configurations multicouches
 */

import type { PanneauMulticouche, CoucheMulticouche } from '../configurateur-multicouche/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface MulticoucheTemplate {
  id: string;
  nom: string;
  description: string | null;
  modeCollage: 'fournisseur' | 'client';
  couches: CoucheMulticouche[];
  epaisseurTotale: number;
  prixEstimeM2: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateData {
  nom: string;
  description?: string;
  modeCollage: 'fournisseur' | 'client';
  couches: CoucheMulticouche[];
  epaisseurTotale: number;
  prixEstimeM2: number;
}

/**
 * Récupérer le token Clerk pour l'authentification
 */
async function getAuthToken(): Promise<string | null> {
  // Clerk expose le token via window.Clerk si disponible
  if (typeof window !== 'undefined' && (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk?.session) {
    try {
      const token = await (window as unknown as { Clerk: { session: { getToken: () => Promise<string> } } }).Clerk.session.getToken();
      return token;
    } catch {
      console.error('Failed to get Clerk token');
      return null;
    }
  }
  return null;
}

/**
 * Créer les headers avec authentification
 */
async function createHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Créer un nouveau template
 */
export async function createTemplate(data: CreateTemplateData): Promise<MulticoucheTemplate> {
  const headers = await createHeaders();

  const response = await fetch(`${API_URL}/api/multicouche-templates`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
    throw new Error(error.message || 'Erreur lors de la création du template');
  }

  return response.json();
}

/**
 * Récupérer tous les templates de l'utilisateur
 */
export async function getTemplates(): Promise<MulticoucheTemplate[]> {
  const headers = await createHeaders();

  const response = await fetch(`${API_URL}/api/multicouche-templates`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      return []; // Non authentifié, retourner liste vide
    }
    const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
    throw new Error(error.message || 'Erreur lors de la récupération des templates');
  }

  return response.json();
}

/**
 * Récupérer un template par son ID
 */
export async function getTemplate(id: string): Promise<MulticoucheTemplate> {
  const headers = await createHeaders();

  const response = await fetch(`${API_URL}/api/multicouche-templates/${id}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
    throw new Error(error.message || 'Erreur lors de la récupération du template');
  }

  return response.json();
}

/**
 * Supprimer un template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const headers = await createHeaders();

  const response = await fetch(`${API_URL}/api/multicouche-templates/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
    throw new Error(error.message || 'Erreur lors de la suppression du template');
  }
}

/**
 * Convertir un PanneauMulticouche en données de template
 */
export function panneauToTemplateData(
  panneau: PanneauMulticouche,
  nom: string,
  description?: string
): CreateTemplateData {
  return {
    nom,
    description,
    modeCollage: panneau.modeCollage,
    couches: panneau.couches,
    epaisseurTotale: panneau.epaisseurTotale,
    prixEstimeM2: panneau.prixEstimeM2,
  };
}

/**
 * Convertir un template en PanneauMulticouche
 */
export function templateToPanneau(template: MulticoucheTemplate): PanneauMulticouche {
  return {
    id: crypto.randomUUID(), // Nouveau ID pour cette instance
    modeCollage: template.modeCollage,
    couches: template.couches.map((c, i) => ({
      ...c,
      id: crypto.randomUUID(), // Nouveaux IDs pour les couches
      ordre: i + 1,
    })),
    epaisseurTotale: template.epaisseurTotale,
    prixEstimeM2: template.prixEstimeM2,
  };
}
