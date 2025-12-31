/**
 * Calculs pour le Configurateur Multicouche
 */

import type { CoucheMulticouche, LigneMulticouche } from './types';
import { REGLES_MULTICOUCHE, TARIFS_MULTICOUCHE } from './constants';

// Calculer l'épaisseur totale des couches
export function calculerEpaisseurTotale(couches: CoucheMulticouche[]): number {
  return couches.reduce((total, couche) => total + couche.epaisseur, 0);
}

// Calculer la surface en m²
export function calculerSurfaceM2(longueur: number, largeur: number): number {
  return (longueur * largeur) / 1_000_000;
}

// Calculer les dimensions de découpe avec sur-cote
export function calculerDimensionsDecoupe(
  longueur: number,
  largeur: number,
  surcoteMm: number
): { longueur: number; largeur: number } {
  return {
    longueur: longueur + surcoteMm * 2,
    largeur: largeur + surcoteMm * 2,
  };
}

// Mettre à jour une couche
export function mettreAJourCouche(
  couche: CoucheMulticouche,
  surfaceM2: number
): CoucheMulticouche {
  return {
    ...couche,
    surfaceM2,
    prixCouche: surfaceM2 * couche.prixPanneauM2,
  };
}

// Mettre à jour tous les calculs d'une ligne
export function mettreAJourCalculsLigne(ligne: LigneMulticouche): LigneMulticouche {
  // Calculer épaisseur totale
  const epaisseurTotale = calculerEpaisseurTotale(ligne.couches);

  // Calculer dimensions avec sur-cote si nécessaire
  const dimensionsDecoupe =
    ligne.modeCollage === 'client' && ligne.avecSurcote
      ? calculerDimensionsDecoupe(
          ligne.dimensions.longueur,
          ligne.dimensions.largeur,
          ligne.surcoteMm
        )
      : { ...ligne.dimensions };

  // Surface de découpe (pour le prix)
  const surfaceM2 = calculerSurfaceM2(dimensionsDecoupe.longueur, dimensionsDecoupe.largeur);

  // Mettre à jour chaque couche
  const couches = ligne.couches.map((couche) => mettreAJourCouche(couche, surfaceM2));

  // Prix des couches
  const prixCouches = couches.reduce((total, couche) => total + couche.prixCouche, 0);

  // Prix du collage (si fournisseur)
  const prixCollage =
    ligne.modeCollage === 'fournisseur'
      ? surfaceM2 * TARIFS_MULTICOUCHE.COLLAGE_M2 * (couches.length - 1)
      : 0;

  // Prix total
  const prixTotal = prixCouches + prixCollage;

  return {
    ...ligne,
    couches,
    epaisseurTotale,
    dimensionsDecoupe,
    surfaceM2,
    prixCouches,
    prixCollage,
    prixTotal,
    updatedAt: new Date(),
  };
}

// Valider une ligne multicouche
export interface ValidationResult {
  isValid: boolean;
  erreurs: string[];
}

export function validerLigneMulticouche(ligne: LigneMulticouche): ValidationResult {
  const erreurs: string[] = [];

  // Vérifier le nombre de couches
  if (ligne.couches.length < REGLES_MULTICOUCHE.COUCHES_MIN) {
    erreurs.push(`Minimum ${REGLES_MULTICOUCHE.COUCHES_MIN} couches requises`);
  }
  if (ligne.couches.length > REGLES_MULTICOUCHE.COUCHES_MAX) {
    erreurs.push(`Maximum ${REGLES_MULTICOUCHE.COUCHES_MAX} couches autorisées`);
  }

  // Vérifier chaque couche
  ligne.couches.forEach((couche, i) => {
    if (!couche.panneauId && !couche.materiau) {
      erreurs.push(`Couche ${i + 1} : matériau non défini`);
    }
    if (couche.epaisseur <= 0) {
      erreurs.push(`Couche ${i + 1} : épaisseur invalide`);
    }
  });

  // Vérifier les dimensions
  if (ligne.dimensions.longueur <= 0 || ligne.dimensions.largeur <= 0) {
    erreurs.push('Dimensions invalides');
  }

  // Si collage client, vérifier qu'aucune option n'est activée
  if (ligne.modeCollage === 'client') {
    const hasChants = ligne.chants.A || ligne.chants.B || ligne.chants.C || ligne.chants.D;
    if (hasChants) {
      erreurs.push('Placage de chants impossible avec collage client');
    }
    if (ligne.percage) {
      erreurs.push('Perçage impossible avec collage client');
    }
    if (ligne.avecFinition) {
      erreurs.push('Finition impossible avec collage client');
    }
  }

  return {
    isValid: erreurs.length === 0,
    erreurs,
  };
}
