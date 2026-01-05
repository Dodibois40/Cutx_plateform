// lib/configurateur/groupes/helpers.ts
// Helpers et type guards pour la gestion des panneaux de groupe

import type { PanneauGroupe } from './types';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { PanneauMulticouche, ModeCollage } from '@/lib/configurateur-multicouche/types';

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Vérifie si le panneau est un panneau catalogue
 */
export function isPanneauCatalogue(
  p: PanneauGroupe
): p is { type: 'catalogue'; panneau: PanneauCatalogue } {
  return p.type === 'catalogue';
}

/**
 * Vérifie si le panneau est un panneau multicouche
 */
export function isPanneauMulticouche(
  p: PanneauGroupe
): p is { type: 'multicouche'; panneau: PanneauMulticouche } {
  return p.type === 'multicouche';
}

// ============================================================================
// DISPLAY INFO
// ============================================================================

/**
 * Extrait les dimensions (longueur × largeur) du nom d'un panneau
 * Format attendu: "Nom du panneau XX mm 2850 × 2100 mm"
 * Retourne null si le pattern n'est pas trouvé
 */
function extractDimensionsFromName(nom: string): { longueur: number; largeur: number } | null {
  // Pattern: 4 chiffres × 4 chiffres mm (ex: "2850 × 2100 mm" ou "2850×2100mm")
  const match = nom.match(/(\d{3,4})\s*[×x]\s*(\d{3,4})\s*mm/i);
  if (match) {
    return {
      longueur: parseInt(match[1], 10),
      largeur: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Interface unifiée pour l'affichage des panneaux
 */
export interface PanneauDisplayInfo {
  nom: string;
  nomSansDimensions: string; // Nom sans les dimensions (pour éviter la redondance)
  imageUrl: string | null;
  epaisseur: number | null; // Épaisseur unique (multicouche) ou null si plusieurs
  epaisseurs: number[]; // Toutes les épaisseurs disponibles
  longueur: number | null; // Longueur du panneau brut (mm)
  largeur: number | null; // Largeur du panneau brut (mm)
  prixM2: number | null; // Prix estimé par m²
  isMulticouche: boolean;
  modeCollage: ModeCollage | null;
  nbCouches: number | null;
}

/**
 * Extrait les informations d'affichage d'un panneau (catalogue ou multicouche)
 */
export function getPanneauDisplayInfo(p: PanneauGroupe | null): PanneauDisplayInfo | null {
  if (!p) return null;

  if (isPanneauCatalogue(p)) {
    const { panneau } = p;
    const prixValues = Object.values(panneau.prixM2);

    // Récupérer dimensions depuis les champs ou extraire du nom (fallback)
    let longueur = panneau.longueur || null;
    let largeur = panneau.largeur || null;

    // Fallback: extraire du nom si les champs ne sont pas présents (données en cache)
    if (!longueur || !largeur) {
      const extracted = extractDimensionsFromName(panneau.nom);
      if (extracted) {
        longueur = extracted.longueur;
        largeur = extracted.largeur;
      }
    }

    // Supprimer les dimensions du nom pour éviter la redondance
    const nomSansDimensions = panneau.nom
      .replace(/\s*\d{3,4}\s*[×x]\s*\d{3,4}\s*mm/i, '')
      .trim();

    return {
      nom: panneau.nom,
      nomSansDimensions,
      imageUrl: panneau.imageUrl || null,
      epaisseur: null,
      epaisseurs: panneau.epaisseurs,
      longueur,
      largeur,
      prixM2: prixValues.length > 0 ? prixValues[0] : null,
      isMulticouche: false,
      modeCollage: null,
      nbCouches: null,
    };
  }

  // Multicouche
  const { panneau } = p;
  // Trouver le parement (couche visible) pour le nom et l'image
  const parement = panneau.couches.find(c => c.type === 'parement');
  const nomMulticouche = parement?.panneauNom || `Multicouche ${panneau.couches.length} couches`;

  return {
    nom: nomMulticouche,
    nomSansDimensions: nomMulticouche, // Pas de dimensions dans le nom pour multicouche
    imageUrl: parement?.panneauImageUrl || null,
    epaisseur: panneau.epaisseurTotale,
    epaisseurs: [panneau.epaisseurTotale], // Une seule épaisseur pour multicouche
    longueur: null, // Pas de dimensions brutes pour multicouche (dépend des découpes)
    largeur: null,
    prixM2: panneau.prixEstimeM2,
    isMulticouche: true,
    modeCollage: panneau.modeCollage,
    nbCouches: panneau.couches.length,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Vérifie si une épaisseur de ligne est compatible avec le panneau
 */
export function isEpaisseurCompatible(
  panneauGroupe: PanneauGroupe,
  epaisseur: number
): boolean {
  if (isPanneauCatalogue(panneauGroupe)) {
    return panneauGroupe.panneau.epaisseurs.includes(epaisseur);
  }
  // Pour multicouche, doit correspondre exactement à l'épaisseur totale
  return panneauGroupe.panneau.epaisseurTotale === epaisseur;
}

/**
 * Retourne la première épaisseur disponible du panneau
 */
export function getFirstEpaisseur(panneauGroupe: PanneauGroupe): number {
  if (isPanneauCatalogue(panneauGroupe)) {
    return panneauGroupe.panneau.epaisseurs[0] ?? 0;
  }
  return panneauGroupe.panneau.epaisseurTotale;
}

/**
 * Vérifie si les options (chants, perçage, finition) sont restreintes
 * C'est le cas pour les multicouches en mode "collage client"
 */
export function areOptionsRestricted(panneauGroupe: PanneauGroupe | null): boolean {
  if (!panneauGroupe) return false;
  if (isPanneauCatalogue(panneauGroupe)) return false;
  return panneauGroupe.panneau.modeCollage === 'client';
}

/**
 * Retourne l'ID du panneau (pour la persistence)
 */
export function getPanneauId(panneauGroupe: PanneauGroupe): string {
  if (isPanneauCatalogue(panneauGroupe)) {
    return panneauGroupe.panneau.id;
  }
  return panneauGroupe.panneau.id;
}
