/* ================================================
   CONFIG - Configuration globale de l'application
   ================================================ */

import { DEFAULT_DIMENSIONS, DEFAULT_COLORS } from './constants.js';

/**
 * Configuration globale de l'application
 */
export const appConfig = {
  // Mode vue éclatée
  isExploded: false,

  // Grille d'aimantation activée
  snapToGrid: true,

  // Détection de collision activée
  collisionEnabled: true,

  // Mode debug (afficher les bounding boxes)
  debugMode: false
};

/**
 * Configuration par défaut pour un nouveau caisson
 * Cette fonction retourne un nouvel objet à chaque appel
 * pour éviter les références partagées
 */
export function getDefaultCaissonConfig() {
  return {
    ...DEFAULT_DIMENSIONS,
    colorCaisson: DEFAULT_COLORS.caisson,
    colorDoor: DEFAULT_COLORS.door,
    showDoor: true,
    shelves: []
  };
}

/**
 * Met à jour la configuration globale
 */
export function updateAppConfig(key, value) {
  if (key in appConfig) {
    appConfig[key] = value;
  }
}
