// lib/configurateur/tarif-decoupe.ts
// Calcul des traits de scie pour découpe de panneaux avec scie numérique à plat

import type { PanneauOptimise, ResultatOptimisation, DebitPlace } from './optimiseur/types';
import type { FormePanneau, ChantsConfig, DimensionsLShape, FormeCustom, Dimensions } from './types';
import { calculerMetresLineairesParForme } from './calculs';

/**
 * Tarifs de découpe
 */
export const TARIF_DECOUPE = {
  PRIX_ML_TRAIT_SCIE: 4,      // €/mètre linéaire de trait de scie
  MINIMUM_DECOUPE: 20,         // € minimum par panneau brut
  MARGE_COUPE: 4,              // mm entre les pièces (trait de scie)
} as const;

/**
 * Résultat du calcul des traits de scie pour un panneau
 */
export interface TraitsSciePanneau {
  panneauIndex: number;
  panneauNom: string;
  nombreTraitsHorizontaux: number;
  nombreTraitsVerticaux: number;
  totalTraits: number;
  longueurTraitsHorizontaux: number;  // mm
  longueurTraitsVerticaux: number;    // mm
  totalMetresLineaires: number;       // mètres
  prixDecoupe: number;                // € (avec minimum appliqué)
  prixAvantMinimum: number;           // € (sans minimum)
  minimumApplique: boolean;
}

/**
 * Résultat global des traits de scie
 */
export interface ResultatTraitsScie {
  panneaux: TraitsSciePanneau[];
  totalMetresLineaires: number;
  totalPrixDecoupe: number;
  nombrePanneaux: number;
}

/**
 * Calcule les traits de scie nécessaires pour découper les pièces d'un panneau
 *
 * Méthode : Guillotine (coupes traversantes)
 * - Chaque coupe traverse le panneau de part en part
 * - On calcule le nombre de coupes horizontales et verticales distinctes
 * - La longueur de chaque coupe = dimension du panneau (ou de la bande restante)
 *
 * Pour simplifier, on utilise une approximation réaliste :
 * - Les traits horizontaux traversent toute la largeur du panneau
 * - Les traits verticaux traversent toute la longueur du panneau
 * - Le nombre de traits = nombre de lignes de coupe distinctes
 */
export function calculerTraitsSciePanneau(
  panneau: PanneauOptimise,
  options?: { prixMl?: number; minimum?: number }
): TraitsSciePanneau {
  const prixMl = options?.prixMl ?? TARIF_DECOUPE.PRIX_ML_TRAIT_SCIE;
  const minimum = options?.minimum ?? TARIF_DECOUPE.MINIMUM_DECOUPE;

  const { longueur, largeur } = panneau.dimensions;
  const debits = panneau.debitsPlaces;

  if (debits.length === 0) {
    return {
      panneauIndex: panneau.index,
      panneauNom: panneau.panneauNom,
      nombreTraitsHorizontaux: 0,
      nombreTraitsVerticaux: 0,
      totalTraits: 0,
      longueurTraitsHorizontaux: 0,
      longueurTraitsVerticaux: 0,
      totalMetresLineaires: 0,
      prixDecoupe: 0,
      prixAvantMinimum: 0,
      minimumApplique: false,
    };
  }

  // Trouver toutes les positions Y distinctes (coupes horizontales)
  // Une coupe horizontale est nécessaire au-dessus et en-dessous de chaque rangée de pièces
  const positionsY = new Set<number>();
  for (const debit of debits) {
    positionsY.add(debit.y); // Bord supérieur
    positionsY.add(debit.y + debit.largeur + TARIF_DECOUPE.MARGE_COUPE); // Bord inférieur + marge
  }

  // Trouver toutes les positions X distinctes (coupes verticales)
  const positionsX = new Set<number>();
  for (const debit of debits) {
    positionsX.add(debit.x); // Bord gauche
    positionsX.add(debit.x + debit.longueur + TARIF_DECOUPE.MARGE_COUPE); // Bord droit + marge
  }

  // Filtrer les positions qui sont à l'intérieur du panneau (pas sur les bords)
  const traitsH = Array.from(positionsY).filter(y => y > 0 && y < largeur);
  const traitsV = Array.from(positionsX).filter(x => x > 0 && x < longueur);

  // Calcul des longueurs de traits
  // Pour une coupe guillotine, chaque trait horizontal traverse toute la largeur
  // et chaque trait vertical traverse toute la longueur
  const longueurTraitsH = traitsH.length * largeur; // mm
  const longueurTraitsV = traitsV.length * longueur; // mm

  // Convertir en mètres
  const totalMl = (longueurTraitsH + longueurTraitsV) / 1000;

  // Calcul du prix
  const prixAvantMinimum = totalMl * prixMl;
  const prixDecoupe = Math.max(prixAvantMinimum, minimum);

  return {
    panneauIndex: panneau.index,
    panneauNom: panneau.panneauNom,
    nombreTraitsHorizontaux: traitsH.length,
    nombreTraitsVerticaux: traitsV.length,
    totalTraits: traitsH.length + traitsV.length,
    longueurTraitsHorizontaux: longueurTraitsH,
    longueurTraitsVerticaux: longueurTraitsV,
    totalMetresLineaires: totalMl,
    prixDecoupe,
    prixAvantMinimum,
    minimumApplique: prixAvantMinimum < minimum,
  };
}

/**
 * Méthode alternative : calcul basé sur le périmètre des pièces
 *
 * Cette méthode est plus simple et souvent utilisée :
 * - Chaque pièce génère 4 traits de scie (son périmètre)
 * - On divise par 2 car les traits sont partagés entre pièces adjacentes
 * - On ajoute le périmètre du panneau pour les premières coupes
 */
export function calculerTraitsSciePanneau_Perimetre(
  panneau: PanneauOptimise,
  options?: { prixMl?: number; minimum?: number }
): TraitsSciePanneau {
  const prixMl = options?.prixMl ?? TARIF_DECOUPE.PRIX_ML_TRAIT_SCIE;
  const minimum = options?.minimum ?? TARIF_DECOUPE.MINIMUM_DECOUPE;

  const debits = panneau.debitsPlaces;

  if (debits.length === 0) {
    return {
      panneauIndex: panneau.index,
      panneauNom: panneau.panneauNom,
      nombreTraitsHorizontaux: 0,
      nombreTraitsVerticaux: 0,
      totalTraits: 0,
      longueurTraitsHorizontaux: 0,
      longueurTraitsVerticaux: 0,
      totalMetresLineaires: 0,
      prixDecoupe: 0,
      prixAvantMinimum: 0,
      minimumApplique: false,
    };
  }

  // Calculer le périmètre total de toutes les pièces
  let perimetrePiecesH = 0; // Côtés horizontaux (largeurs)
  let perimetrePiecesV = 0; // Côtés verticaux (longueurs)

  for (const debit of debits) {
    perimetrePiecesH += 2 * debit.largeur;  // 2 côtés horizontaux
    perimetrePiecesV += 2 * debit.longueur; // 2 côtés verticaux
  }

  // Les traits partagés : on ne compte que la moitié du périmètre
  // (approximation car les bords du panneau ne sont pas partagés)
  const longueurTraitsH = perimetrePiecesH / 2;
  const longueurTraitsV = perimetrePiecesV / 2;

  // Convertir en mètres
  const totalMl = (longueurTraitsH + longueurTraitsV) / 1000;

  // Calcul du prix
  const prixAvantMinimum = totalMl * prixMl;
  const prixDecoupe = Math.max(prixAvantMinimum, minimum);

  return {
    panneauIndex: panneau.index,
    panneauNom: panneau.panneauNom,
    nombreTraitsHorizontaux: debits.length, // Approximation
    nombreTraitsVerticaux: debits.length,   // Approximation
    totalTraits: debits.length * 2,
    longueurTraitsHorizontaux: longueurTraitsH,
    longueurTraitsVerticaux: longueurTraitsV,
    totalMetresLineaires: totalMl,
    prixDecoupe,
    prixAvantMinimum,
    minimumApplique: prixAvantMinimum < minimum,
  };
}

/**
 * Calcule les traits de scie pour tous les panneaux d'une optimisation
 */
export function calculerTraitsScie(
  resultatOptimisation: ResultatOptimisation,
  options?: { prixMl?: number; minimum?: number; methode?: 'guillotine' | 'perimetre' }
): ResultatTraitsScie {
  const methode = options?.methode ?? 'guillotine';
  const calculFn = methode === 'perimetre'
    ? calculerTraitsSciePanneau_Perimetre
    : calculerTraitsSciePanneau;

  const panneaux = resultatOptimisation.panneaux.map(p => calculFn(p, options));

  const totalMetresLineaires = panneaux.reduce((sum, p) => sum + p.totalMetresLineaires, 0);
  const totalPrixDecoupe = panneaux.reduce((sum, p) => sum + p.prixDecoupe, 0);

  return {
    panneaux,
    totalMetresLineaires,
    totalPrixDecoupe,
    nombrePanneaux: panneaux.length,
  };
}

/**
 * Calcul simplifié pour une liste de débits sans optimisation préalable
 * Utile pour une estimation rapide avant optimisation
 *
 * Formule : (périmètre total des pièces) / 2 = mètres linéaires de trait
 */
export function estimerTraitsScie(
  debits: Array<{ longueur: number; largeur: number }>,
  options?: { prixMl?: number; minimum?: number }
): { metresLineaires: number; prixDecoupe: number; minimumApplique: boolean } {
  const prixMl = options?.prixMl ?? TARIF_DECOUPE.PRIX_ML_TRAIT_SCIE;
  const minimum = options?.minimum ?? TARIF_DECOUPE.MINIMUM_DECOUPE;

  if (debits.length === 0) {
    return { metresLineaires: 0, prixDecoupe: 0, minimumApplique: false };
  }

  // Périmètre total / 2
  let perimetreTotal = 0;
  for (const debit of debits) {
    perimetreTotal += 2 * (debit.longueur + debit.largeur);
  }

  const metresLineaires = (perimetreTotal / 2) / 1000;
  const prixAvantMinimum = metresLineaires * prixMl;
  const prixDecoupe = Math.max(prixAvantMinimum, minimum);

  return {
    metresLineaires,
    prixDecoupe,
    minimumApplique: prixAvantMinimum < minimum,
  };
}

/**
 * Interface pour un débit avec informations de forme
 */
export interface DebitAvecForme {
  longueur: number;
  largeur: number;
  forme?: FormePanneau;
  chantsConfig?: ChantsConfig;
  dimensionsLShape?: DimensionsLShape | null;
  formeCustom?: FormeCustom | null;
}

/**
 * Calcul simplifié pour une liste de débits avec support des formes
 * Utilise calculerMetresLineairesParForme pour les formes non-rectangulaires
 *
 * Formule : périmètre total des pièces / 2 = mètres linéaires de trait
 */
export function estimerTraitsScieAvecFormes(
  debits: DebitAvecForme[],
  options?: { prixMl?: number; minimum?: number }
): { metresLineaires: number; prixDecoupe: number; minimumApplique: boolean } {
  const prixMl = options?.prixMl ?? TARIF_DECOUPE.PRIX_ML_TRAIT_SCIE;
  const minimum = options?.minimum ?? TARIF_DECOUPE.MINIMUM_DECOUPE;

  if (debits.length === 0) {
    return { metresLineaires: 0, prixDecoupe: 0, minimumApplique: false };
  }

  // Calculer le périmètre total selon la forme de chaque pièce
  let perimetreTotalM = 0;
  for (const debit of debits) {
    const forme = debit.forme || 'rectangle';
    const dimensions: Dimensions = {
      longueur: debit.longueur,
      largeur: debit.largeur,
      epaisseur: 0, // Pas utilisé pour le périmètre
    };

    // Pour le calcul découpe, on considère le périmètre complet (tous les côtés)
    // Créer une config avec tous les chants actifs pour calculer le périmètre complet
    let chantsConfigComplet: ChantsConfig;

    switch (forme) {
      case 'rectangle':
        chantsConfigComplet = { type: 'rectangle', edges: { A: true, B: true, C: true, D: true } };
        break;
      case 'pentagon':
        chantsConfigComplet = { type: 'pentagon', edges: { A: true, B: true, C: true, D: true, E: true } };
        break;
      case 'triangle':
        chantsConfigComplet = { type: 'triangle', edges: { A: true, B: true, C: true } };
        break;
      case 'circle':
      case 'ellipse':
      case 'custom':
        chantsConfigComplet = { type: 'curved', edges: { contour: true } };
        break;
      default:
        chantsConfigComplet = { type: 'rectangle', edges: { A: true, B: true, C: true, D: true } };
    }

    const perimetreM = calculerMetresLineairesParForme(
      forme,
      dimensions,
      chantsConfigComplet,
      debit.dimensionsLShape,
      debit.formeCustom
    );

    perimetreTotalM += perimetreM;
  }

  // Périmètre / 2 car traits partagés entre pièces
  const metresLineaires = perimetreTotalM / 2;
  const prixAvantMinimum = metresLineaires * prixMl;
  const prixDecoupe = Math.max(prixAvantMinimum, minimum);

  return {
    metresLineaires,
    prixDecoupe,
    minimumApplique: prixAvantMinimum < minimum,
  };
}
