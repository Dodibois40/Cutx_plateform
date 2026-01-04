/**
 * Service API pour les templates d'usinage
 */

import type { UsinageTemplate, UsinageConfigParam } from '@/lib/configurateur/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://cutxplateform-production.up.railway.app';

// =============================================
// TYPES
// =============================================

export interface CreateUsinageTemplateDto {
  nom: string;
  description?: string;
  iconSvg: string;
  configSchema: UsinageConfigParam[];
  technicalSvg?: string;
  pricingType: 'PER_UNIT' | 'PER_METER' | 'PER_M2' | 'FIXED';
  priceHT: number;
  category?: 'RAINURE' | 'PERCAGE' | 'USINAGE_CN' | 'DEFONCEUSE' | 'PASSE_MAIN' | 'AUTRE';
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateUsinageTemplateDto = Partial<CreateUsinageTemplateDto>;

// =============================================
// PUBLIC ENDPOINTS (no auth required)
// =============================================

/**
 * Recuperer tous les templates d'usinage actifs
 */
export async function fetchUsinageTemplates(): Promise<UsinageTemplate[]> {
  const res = await fetch(`${API_URL}/api/usinages/templates`);

  if (!res.ok) {
    throw new Error('Erreur lors du chargement des templates d\'usinage');
  }

  const data = await res.json();
  return data.templates || [];
}

/**
 * Recuperer un template par son ID
 */
export async function fetchUsinageTemplate(id: string): Promise<UsinageTemplate> {
  const res = await fetch(`${API_URL}/api/usinages/templates/${id}`);

  if (!res.ok) {
    throw new Error(`Template d'usinage non trouve: ${id}`);
  }

  return res.json();
}

/**
 * Recuperer un template par son slug
 */
export async function fetchUsinageTemplateBySlug(slug: string): Promise<UsinageTemplate> {
  const res = await fetch(`${API_URL}/api/usinages/templates/slug/${slug}`);

  if (!res.ok) {
    throw new Error(`Template d'usinage non trouve: ${slug}`);
  }

  return res.json();
}

// =============================================
// ADMIN ENDPOINTS (auth required)
// =============================================

/**
 * Recuperer tous les templates (inclut les inactifs) - Admin seulement
 */
export async function fetchAllUsinageTemplates(token: string): Promise<UsinageTemplate[]> {
  const res = await fetch(`${API_URL}/api/usinages/admin/templates`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('Acces reserve aux administrateurs');
    }
    throw new Error('Erreur lors du chargement des templates');
  }

  const data = await res.json();
  return data.templates || [];
}

/**
 * Creer un nouveau template - Admin seulement
 */
export async function createUsinageTemplate(
  dto: CreateUsinageTemplateDto,
  token: string
): Promise<UsinageTemplate> {
  const res = await fetch(`${API_URL}/api/usinages/admin/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la creation');
  }

  return res.json();
}

/**
 * Modifier un template - Admin seulement
 */
export async function updateUsinageTemplate(
  id: string,
  dto: UpdateUsinageTemplateDto,
  token: string
): Promise<UsinageTemplate> {
  const res = await fetch(`${API_URL}/api/usinages/admin/templates/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la modification');
  }

  return res.json();
}

/**
 * Supprimer un template - Admin seulement
 */
export async function deleteUsinageTemplate(id: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/usinages/admin/templates/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Erreur lors de la suppression');
  }
}

/**
 * Activer/Desactiver un template - Admin seulement
 */
export async function toggleUsinageTemplate(id: string, token: string): Promise<UsinageTemplate> {
  const res = await fetch(`${API_URL}/api/usinages/admin/templates/${id}/toggle`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Erreur lors du changement de statut');
  }

  return res.json();
}

/**
 * Reordonner les templates - Admin seulement
 */
export async function reorderUsinageTemplates(ids: string[], token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/usinages/admin/templates/reorder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    throw new Error('Erreur lors de la reordonnancement');
  }
}

// =============================================
// CALCULS
// =============================================

/**
 * Calculer le prix d'un usinage
 */
export function calculerPrixUsinage(
  template: UsinageTemplate,
  configValues: Record<string, number>,
  quantite: number
): number {
  let prixBase = template.priceHT;

  switch (template.pricingType) {
    case 'PER_METER':
      // Prix par metre lineaire
      const longueur = configValues['longueur'] || configValues['L'] || 0;
      prixBase = template.priceHT * (longueur / 1000); // mm -> m
      break;

    case 'PER_M2':
      // Prix par metre carre
      const l = configValues['longueur'] || configValues['L'] || 0;
      const w = configValues['largeur'] || configValues['W'] || 0;
      const surface = (l * w) / 1000000; // mm2 -> m2
      prixBase = template.priceHT * surface;
      break;

    case 'PER_UNIT':
    case 'FIXED':
    default:
      // Prix fixe ou par unite
      prixBase = template.priceHT;
      break;
  }

  return Math.round(prixBase * quantite * 100) / 100;
}
