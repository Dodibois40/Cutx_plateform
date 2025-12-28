import { apiCall } from './core';

// Types pour les paramètres du configurateur
export interface BrillanceSettings {
  value: string;
  label: string;
  prixVernis: number | null;
  prixLaque: number | null;
}

export interface UsinageSettings {
  type: string;
  label: string;
  prix: number;
  unite: string;
}

export interface ConfigurateurSettings {
  id: string;
  brillances: BrillanceSettings[];
  surfaceMinimum: number;
  minimumCommandeHT: number;
  prixTeinteVernis: number;
  prixPoncageM2: number;       // Pour V2 (ponçage)
  prixPercageUnite?: number;   // Pour V3 (perçage - forfait par pièce)
  prixChantMlLaque: number;
  prixChantMlVernisTinte: number;
  prixChantMlVernis: number;
  tvaTaux: number;
  usinages: UsinageSettings[];
  updatedAt: string;
  updatedBy: string | null;
}

export interface UpdateConfigurateurSettingsData {
  brillances?: BrillanceSettings[];
  surfaceMinimum?: number;
  minimumCommandeHT?: number;
  prixTeinteVernis?: number;
  prixPoncageM2?: number;
  prixPercageUnite?: number;
  prixChantMlLaque?: number;
  prixChantMlVernisTinte?: number;
  prixChantMlVernis?: number;
  tvaTaux?: number;
  usinages?: UsinageSettings[];
}

/**
 * Récupère les paramètres du configurateur
 * Route publique (pas besoin d'auth)
 */
export async function getConfigurateurSettings(): Promise<ConfigurateurSettings> {
  return apiCall<ConfigurateurSettings>('/api/configurateur-settings');
}

/**
 * Met à jour les paramètres du configurateur
 * Route admin uniquement
 */
export async function updateConfigurateurSettings(
  data: UpdateConfigurateurSettingsData
): Promise<ConfigurateurSettings> {
  return apiCall<ConfigurateurSettings>('/api/configurateur-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Réinitialise les paramètres aux valeurs par défaut
 * Route admin uniquement
 */
export async function resetConfigurateurSettings(): Promise<{
  success: boolean;
  message: string;
  settings: ConfigurateurSettings;
}> {
  return apiCall('/api/configurateur-settings/reset', {
    method: 'POST',
  });
}
