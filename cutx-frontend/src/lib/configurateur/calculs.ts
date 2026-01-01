// lib/configurateur/calculs.ts
// Fonctions de calcul pour le Configurateur V3 - Découpe panneau + Finition optionnelle

import type {
  Dimensions,
  Chants,
  LignePrestationV3,
  PrixCalcule,
  EtatLigne,
  Brillance,
  Finition,
  FormePanneau,
  ChantsConfig,
  DimensionsLShape,
  FormeCustom,
  ChantsTriangle,
  ChantsPentagon,
  ChantsCurved,
} from './types';
import { BRILLANCES, REGLES } from './constants';
import type { ConfigurateurSettings, BrillanceSettings } from '@/lib/services/configurateur-settings';

// Interface pour les settings optionnels passés aux fonctions de calcul
export interface CalculSettings {
  brillances?: BrillanceSettings[];
  surfaceMinimum?: number;
  prixTeinteVernis?: number;
  prixPercageUnite?: number;
  prixChantMlLaque?: number;
  prixChantMlVernisTinte?: number;
  prixChantMlVernis?: number;
  tvaTaux?: number;
}

// Convertir ConfigurateurSettings en CalculSettings
export function toCalculSettings(settings?: ConfigurateurSettings | null): CalculSettings {
  if (!settings) return {};
  return {
    brillances: settings.brillances,
    surfaceMinimum: settings.surfaceMinimum,
    prixTeinteVernis: settings.prixTeinteVernis,
    prixPercageUnite: settings.prixPercageUnite ?? REGLES.PRIX_PERCAGE_UNITE,
    prixChantMlLaque: settings.prixChantMlLaque,
    prixChantMlVernisTinte: settings.prixChantMlVernisTinte,
    prixChantMlVernis: settings.prixChantMlVernis,
    tvaTaux: settings.tvaTaux,
  };
}

/**
 * Calcule la surface en m² à partir des dimensions en mm
 */
export function calculerSurface(longueur: number, largeur: number): number {
  if (longueur <= 0 || largeur <= 0) return 0;
  return (longueur / 1000) * (largeur / 1000);
}

/**
 * Calcule la surface développée d'un caisson (4 ou 5 panneaux)
 * - 2 côtés verticaux (gauche/droite) : hauteur × profondeur
 * - 1 dessus : longueur × profondeur
 * - 1 dessous : longueur × profondeur
 * - 1 fond (optionnel) : longueur × hauteur
 *
 * @param longueur - largeur façade en mm
 * @param largeur - profondeur en mm
 * @param hauteur - hauteur en mm
 * @param avecFond - true si le caisson a un fond (5ème panneau)
 */
export function calculerSurfaceCaisson(
  longueur: number,
  largeur: number,
  hauteur: number,
  avecFond: boolean
): number {
  if (longueur <= 0 || largeur <= 0 || hauteur <= 0) return 0;

  const L = longueur / 1000; // largeur façade en m
  const l = largeur / 1000;  // profondeur en m
  const H = hauteur / 1000;  // hauteur en m

  // 2 côtés verticaux
  const surfaceCotes = 2 * (H * l);

  // Dessus + Dessous
  const surfaceDessus = 2 * (L * l);

  // Fond (optionnel)
  const surfaceFond = avecFond ? (L * H) : 0;

  return surfaceCotes + surfaceDessus + surfaceFond;
}

/**
 * Calcule la surface développée d'un tiroir (5 panneaux)
 * - 1 façade avant : longueur × hauteur
 * - 2 côtés (gauche/droite) : hauteur × profondeur
 * - 1 fond (bas) : longueur × profondeur
 * - 1 dos (arrière) : longueur × hauteur
 *
 * @param longueur - largeur façade en mm
 * @param largeur - profondeur en mm
 * @param hauteur - hauteur en mm
 */
export function calculerSurfaceTiroir(
  longueur: number,
  largeur: number,
  hauteur: number
): number {
  if (longueur <= 0 || largeur <= 0 || hauteur <= 0) return 0;

  const L = longueur / 1000; // largeur façade en m
  const l = largeur / 1000;  // profondeur en m
  const H = hauteur / 1000;  // hauteur en m

  // Façade avant + Dos (2 panneaux identiques)
  const surfaceFacadeDos = 2 * (L * H);

  // 2 côtés (gauche + droite)
  const surfaceCotes = 2 * (H * l);

  // Fond (bas)
  const surfaceFond = L * l;

  return surfaceFacadeDos + surfaceCotes + surfaceFond;
}

// ============================================================================
// CALCULS DE SURFACE PAR FORME
// ============================================================================

/**
 * Calcule la surface d'un cercle (π × r²)
 * @param diametreMm - Diamètre en mm
 */
export function calculerSurfaceCercle(diametreMm: number): number {
  if (diametreMm <= 0) return 0;
  const rayonM = (diametreMm / 1000) / 2;
  return Math.PI * rayonM * rayonM;
}

/**
 * Calcule la surface d'une ellipse (π × a × b)
 * @param longueurMm - Grand axe en mm
 * @param largeurMm - Petit axe en mm
 */
export function calculerSurfaceEllipse(longueurMm: number, largeurMm: number): number {
  if (longueurMm <= 0 || largeurMm <= 0) return 0;
  const a = (longueurMm / 1000) / 2; // demi-grand axe
  const b = (largeurMm / 1000) / 2;  // demi-petit axe
  return Math.PI * a * b;
}

/**
 * Calcule la surface d'un triangle rectangle (base × hauteur / 2)
 * @param baseMm - Base en mm
 * @param hauteurMm - Hauteur en mm
 */
export function calculerSurfaceTriangle(baseMm: number, hauteurMm: number): number {
  if (baseMm <= 0 || hauteurMm <= 0) return 0;
  return ((baseMm / 1000) * (hauteurMm / 1000)) / 2;
}

/**
 * Calcule la surface d'un L-shape (rectangle total - encoche)
 * Surface = (L1 × W1) - (L2 × W2)
 */
export function calculerSurfaceLShape(dims: DimensionsLShape | null | undefined): number {
  if (!dims) return 0;
  const { longueurTotale, largeurTotale, longueurEncoche, largeurEncoche } = dims;

  if (longueurTotale <= 0 || largeurTotale <= 0) return 0;

  const surfaceTotale = (longueurTotale / 1000) * (largeurTotale / 1000);
  const surfaceEncoche = (longueurEncoche / 1000) * (largeurEncoche / 1000);

  return Math.max(0, surfaceTotale - surfaceEncoche);
}

/**
 * Calcule la surface selon la forme du panneau
 */
export function calculerSurfaceParForme(
  forme: FormePanneau | undefined,
  dimensions: Dimensions,
  dimensionsLShape?: DimensionsLShape | null,
  formeCustom?: FormeCustom | null
): number {
  const f = forme || 'rectangle';

  switch (f) {
    case 'rectangle':
      return calculerSurface(dimensions.longueur, dimensions.largeur);

    case 'pentagon':
      return calculerSurfaceLShape(dimensionsLShape);

    case 'circle':
      // Pour un cercle, on utilise longueur comme diamètre
      return calculerSurfaceCercle(dimensions.longueur);

    case 'ellipse':
      return calculerSurfaceEllipse(dimensions.longueur, dimensions.largeur);

    case 'triangle':
      return calculerSurfaceTriangle(dimensions.longueur, dimensions.largeur);

    case 'custom':
      return formeCustom?.surfaceM2 || 0;

    default:
      return calculerSurface(dimensions.longueur, dimensions.largeur);
  }
}

// ============================================================================
// CALCULS DE PÉRIMÈTRE (CHANTS) PAR FORME
// ============================================================================

/**
 * Calcule le périmètre d'un cercle (π × d)
 */
export function calculerPerimetreCercle(
  diametreMm: number,
  config: { type: 'curved'; edges: ChantsCurved }
): number {
  if (!config.edges.contour || diametreMm <= 0) return 0;
  return Math.PI * (diametreMm / 1000);
}

/**
 * Calcule le périmètre d'une ellipse (approximation de Ramanujan)
 * P ≈ π × (3(a+b) - √((3a+b)(a+3b)))
 */
export function calculerPerimetreEllipse(
  longueurMm: number,
  largeurMm: number,
  config: { type: 'curved'; edges: ChantsCurved }
): number {
  if (!config.edges.contour || longueurMm <= 0 || largeurMm <= 0) return 0;

  const a = (longueurMm / 1000) / 2; // demi-grand axe
  const b = (largeurMm / 1000) / 2;  // demi-petit axe

  // Approximation de Ramanujan
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/**
 * Calcule le périmètre d'un triangle rectangle
 * Côtés: base, hauteur, hypoténuse (Pythagore)
 */
export function calculerPerimetreTriangle(
  baseMm: number,
  hauteurMm: number,
  config: { type: 'triangle'; edges: ChantsTriangle }
): number {
  if (baseMm <= 0 || hauteurMm <= 0) return 0;

  const base = baseMm / 1000;
  const hauteur = hauteurMm / 1000;
  const hypotenuse = Math.sqrt(base * base + hauteur * hauteur);

  let total = 0;
  if (config.edges.A) total += base;       // Base
  if (config.edges.B) total += hauteur;    // Hauteur
  if (config.edges.C) total += hypotenuse; // Hypoténuse

  return total;
}

/**
 * Calcule le périmètre d'un L-shape (5 côtés)
 */
export function calculerPerimetreLShape(
  dims: DimensionsLShape | null | undefined,
  config: { type: 'pentagon'; edges: ChantsPentagon }
): number {
  if (!dims) return 0;

  const { longueurTotale, largeurTotale, longueurEncoche, largeurEncoche } = dims;

  // Longueurs des 5 côtés du L:
  // A: Bas complet (longueurTotale)
  // B: Droite complète (largeurTotale)
  // C: Haut partiel (longueurTotale - longueurEncoche)
  // D: Intérieur vertical (largeurTotale - largeurEncoche)
  // E: Intérieur horizontal (longueurEncoche)
  // Note: largeurEncoche ferme le L mais est comptée dans A ou E selon orientation

  const edgeLengths = {
    A: longueurTotale / 1000,
    B: largeurTotale / 1000,
    C: (longueurTotale - longueurEncoche) / 1000,
    D: (largeurTotale - largeurEncoche) / 1000,
    E: longueurEncoche / 1000,
  };

  let total = 0;
  if (config.edges.A) total += edgeLengths.A;
  if (config.edges.B) total += edgeLengths.B;
  if (config.edges.C) total += edgeLengths.C;
  if (config.edges.D) total += edgeLengths.D;
  if (config.edges.E) total += edgeLengths.E;

  return total;
}

/**
 * Calcule les mètres linéaires de chants selon la forme
 */
export function calculerMetresLineairesParForme(
  forme: FormePanneau | undefined,
  dimensions: Dimensions,
  chantsConfig: ChantsConfig | undefined,
  dimensionsLShape?: DimensionsLShape | null,
  formeCustom?: FormeCustom | null
): number {
  const f = forme || 'rectangle';

  // Si pas de config chants, retourner 0
  if (!chantsConfig) return 0;

  switch (f) {
    case 'rectangle':
      if (chantsConfig.type !== 'rectangle') return 0;
      return calculerMetresLineairesChants(dimensions, chantsConfig.edges);

    case 'pentagon':
      if (chantsConfig.type !== 'pentagon') return 0;
      return calculerPerimetreLShape(dimensionsLShape, chantsConfig);

    case 'circle':
      if (chantsConfig.type !== 'curved') return 0;
      return calculerPerimetreCercle(dimensions.longueur, chantsConfig);

    case 'ellipse':
      if (chantsConfig.type !== 'curved') return 0;
      return calculerPerimetreEllipse(dimensions.longueur, dimensions.largeur, chantsConfig);

    case 'triangle':
      if (chantsConfig.type !== 'triangle') return 0;
      return calculerPerimetreTriangle(dimensions.longueur, dimensions.largeur, chantsConfig);

    case 'custom':
      if (chantsConfig.type !== 'curved') return 0;
      if (chantsConfig.edges.contour && formeCustom) {
        return formeCustom.perimetreM;
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * Applique le minimum de surface facturable (0.25 m²)
 */
export function appliquerMinimumSurface(surface: number, settings?: CalculSettings): number {
  if (surface <= 0) return 0;
  const minSurface = settings?.surfaceMinimum ?? REGLES.SURFACE_MINIMUM;
  return Math.max(surface, minSurface);
}

/**
 * Calcule les mètres linéaires des chants sélectionnés
 * A et C = longueurs, B et D = largeurs
 */
export function calculerMetresLineairesChants(
  dimensions: Dimensions,
  chants: Chants
): number {
  const { longueur, largeur } = dimensions;
  if (longueur <= 0 && largeur <= 0) return 0;

  let total = 0;

  if (chants.A) total += longueur / 1000; // Longueur en mètres
  if (chants.B) total += largeur / 1000;  // Largeur en mètres
  if (chants.C) total += longueur / 1000; // Longueur opposée
  if (chants.D) total += largeur / 1000;  // Largeur opposée

  return total;
}

/**
 * Récupère le prix au m² selon la brillance et la finition
 */
export function getPrixM2(brillance: Brillance | null, finition: Finition | null, settings?: CalculSettings): number {
  if (!brillance || !finition) return 0;

  const brillances = settings?.brillances ?? BRILLANCES;
  const tarifBrillance = brillances.find(b => b.value === brillance);
  if (!tarifBrillance) return 0;

  const prix = finition === 'laque' ? tarifBrillance.prixLaque : tarifBrillance.prixVernis;
  return prix || 0;
}

/**
 * Récupère le prix des chants par mètre linéaire
 * - Laque : 8€/mL
 * - Vernis avec teinte : 6€/mL
 * - Vernis seul : 4€/mL
 */
export function getPrixChantParMetre(
  finition: Finition | null,
  teinte: string | null,
  settings?: CalculSettings
): number {
  if (!finition) return 0;

  if (finition === 'laque') {
    return settings?.prixChantMlLaque ?? REGLES.PRIX_CHANT_ML_LAQUE;
  }

  // Finition vernis
  if (teinte && teinte.trim() !== '') {
    return settings?.prixChantMlVernisTinte ?? REGLES.PRIX_CHANT_ML_VERNIS_TEINTE;
  }

  return settings?.prixChantMlVernis ?? REGLES.PRIX_CHANT_ML_VERNIS;
}

/**
 * Calcule le prix de fourniture du panneau
 */
export function calculerPrixPanneau(ligne: LignePrestationV3): number {
  if (!ligne.avecFourniture || !ligne.panneauId || ligne.prixPanneauM2 <= 0) {
    return 0;
  }

  // Surface brute du panneau (sans minimum, on facture la vraie surface)
  const surfaceBrute = calculerSurface(
    ligne.dimensions.longueur,
    ligne.dimensions.largeur
  );

  return surfaceBrute * ligne.prixPanneauM2;
}

/**
 * Calcule le prix complet d'une ligne (panneau ou finition)
 */
export function calculerPrixLigne(ligne: LignePrestationV3, settings?: CalculSettings): PrixCalcule & { prixPercage: number } {
  // Surface brute
  const surfaceBrute = calculerSurface(
    ligne.dimensions.longueur,
    ligne.dimensions.largeur
  );

  // Surface facturée (avec minimum)
  const surfaceFacturee = appliquerMinimumSurface(surfaceBrute, settings);

  // Mètres linéaires des chants
  const mlChants = calculerMetresLineairesChants(ligne.dimensions, ligne.chants);

  // === LIGNE PANNEAU : calcul fourniture + usinages + perçage ===
  if (ligne.typeLigne === 'panneau') {
    // Prix des usinages
    const prixUsinages = ligne.usinages.reduce(
      (total, usinage) => total + usinage.prixUnitaire * usinage.quantite,
      0
    );

    // Prix du perçage (forfait par ligne)
    const prixPercageUnite = settings?.prixPercageUnite ?? REGLES.PRIX_PERCAGE_UNITE;
    const prixPercage = ligne.percage ? prixPercageUnite : 0;

    // Prix chants pour panneau = pas de finition, donc 0
    const prixChants = 0;
    const prixFaces = 0;

    // Total ligne panneau = usinages + perçage (fourniture calculée séparément)
    const prixHT = prixUsinages + prixPercage;
    const tvaTaux = settings?.tvaTaux ?? REGLES.TVA_TAUX;
    const prixTVA = prixHT * tvaTaux;
    const prixTTC = prixHT + prixTVA;

    return {
      surfaceM2: surfaceBrute,
      surfaceFacturee,
      metresLineairesChants: mlChants,
      prixFaces,
      prixChants,
      prixPercage,
      prixUsinages,
      prixHT,
      prixTVA,
      prixTTC,
    };
  }

  // === LIGNE FINITION : calcul finition (faces + chants) ===
  // Prix au m² selon brillance et finition
  const prixM2 = getPrixM2(ligne.brillance, ligne.finition, settings);

  // Prix des faces
  let prixFaces = surfaceFacturee * prixM2;
  if (ligne.nombreFaces === 2) {
    prixFaces *= 2;
  }

  // Supplément teinte vernis (+10€/m²) si teinte_vernis
  const prixTeinteVernis = settings?.prixTeinteVernis ?? REGLES.PRIX_TEINTE_VERNIS;
  if (ligne.finition === 'vernis' && ligne.teinte && ligne.teinte.trim() !== '') {
    prixFaces += surfaceFacturee * prixTeinteVernis * ligne.nombreFaces;
  }

  // Prix des chants (varie selon finition et teinte)
  const prixChantMl = getPrixChantParMetre(ligne.finition, ligne.teinte, settings);
  const prixChants = mlChants * prixChantMl;

  // Pas d'usinages ni perçage sur ligne finition
  const prixUsinages = 0;
  const prixPercage = 0;

  // Totaux
  const tvaTaux = settings?.tvaTaux ?? REGLES.TVA_TAUX;
  const prixHT = prixFaces + prixChants;
  const prixTVA = prixHT * tvaTaux;
  const prixTTC = prixHT + prixTVA;

  return {
    surfaceM2: surfaceBrute,
    surfaceFacturee,
    metresLineairesChants: mlChants,
    prixFaces,
    prixChants,
    prixPercage,
    prixUsinages,
    prixHT,
    prixTVA,
    prixTTC,
  };
}

/**
 * Met à jour une ligne avec les calculs de prix (fourniture + prestation)
 */
export function mettreAJourCalculsLigne(ligne: LignePrestationV3, settings?: CalculSettings): LignePrestationV3 {
  const calculs = calculerPrixLigne(ligne, settings);

  // Calcul du prix fourniture (seulement pour lignes panneau)
  const prixPanneau = ligne.typeLigne === 'panneau' ? calculerPrixPanneau(ligne) : 0;
  const prixFournitureHT = prixPanneau;

  // Prix prestation = prix HT du calcul
  const prixPrestationHT = calculs.prixHT;

  // Total = fourniture + prestation
  const prixTotalHT = prixFournitureHT + prixPrestationHT;
  const tvaTaux = settings?.tvaTaux ?? REGLES.TVA_TAUX;
  const prixTotalTTC = prixTotalHT * (1 + tvaTaux);

  return {
    ...ligne,
    surfaceM2: calculs.surfaceM2,
    surfaceFacturee: calculs.surfaceFacturee,
    metresLineairesChants: calculs.metresLineairesChants,
    prixPanneau,
    prixFaces: calculs.prixFaces,
    prixChants: calculs.prixChants,
    prixPercage: calculs.prixPercage,
    prixUsinages: calculs.prixUsinages,
    prixFournitureHT,
    prixPrestationHT,
    prixHT: prixTotalHT,
    prixTTC: prixTotalTTC,
  };
}

/**
 * Calcule les totaux pour toutes les lignes
 * Note: TVA toujours à 20% (travail à façon en atelier)
 */
export function calculerTotaux(
  lignes: LignePrestationV3[],
  settings?: CalculSettings
): {
  totalFournitureHT: number;
  totalPrestationHT: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
} {
  const totalFournitureHT = lignes.reduce((sum, ligne) => sum + (ligne.prixFournitureHT || 0), 0);
  const totalPrestationHT = lignes.reduce((sum, ligne) => sum + (ligne.prixPrestationHT || 0), 0);
  const totalHT = totalFournitureHT + totalPrestationHT;
  const tvaTaux = settings?.tvaTaux ?? REGLES.TVA_TAUX;
  const totalTVA = totalHT * tvaTaux;
  const totalTTC = totalHT + totalTVA;

  return { totalFournitureHT, totalPrestationHT, totalHT, totalTVA, totalTTC };
}

/**
 * Détermine l'état d'une ligne (vide, en cours, complète, erreur)
 */
export function getEtatLigne(ligne: LignePrestationV3): EtatLigne {
  // === LIGNE PANNEAU ===
  if (ligne.typeLigne === 'panneau') {
    const champsObligatoires = [
      ligne.reference,
      ligne.dimensions.longueur,
      ligne.dimensions.largeur,
    ];

    const champsRemplis = champsObligatoires.filter(Boolean).length;
    const totalChamps = champsObligatoires.length;

    // Erreur : référence manquante mais autres champs remplis
    if (!ligne.reference && champsRemplis > 0) return 'erreur';

    // Erreur : dimensions invalides (négatives)
    if (ligne.dimensions.longueur < 0 || ligne.dimensions.largeur < 0) return 'erreur';

    // États normaux
    if (champsRemplis === 0) return 'vide';
    if (champsRemplis === totalChamps) return 'complete';
    return 'en_cours';
  }

  // === LIGNE FINITION ===
  const champsObligatoires = [
    ligne.reference,
    ligne.finition,
    ligne.brillance,
    ligne.dimensions.longueur,
    ligne.dimensions.largeur,
  ];

  // Ajouter couleur/teinte selon type de finition
  if (ligne.finition === 'laque') {
    champsObligatoires.push(ligne.codeCouleurLaque);
  } else if (ligne.typeFinition === 'teinte_vernis') {
    champsObligatoires.push(ligne.teinte);
  }

  const champsRemplis = champsObligatoires.filter(Boolean).length;
  const totalChamps = champsObligatoires.length;

  // Erreur : référence manquante mais autres champs remplis
  if (!ligne.reference && champsRemplis > 0) return 'erreur';

  // Erreur : finition laque sélectionnée mais brillance 0 Gloss Naturel (non disponible en laque)
  if (ligne.finition === 'laque' && ligne.brillance === 'gloss_naturel') return 'erreur';

  // États normaux
  if (champsRemplis === 0) return 'vide';
  if (champsRemplis === totalChamps) return 'complete';
  return 'en_cours';
}

/**
 * Récupère les champs manquants pour une ligne
 */
export function getChampsManquants(ligne: LignePrestationV3): string[] {
  const manquants: string[] = [];

  if (!ligne.reference) manquants.push('Référence');

  // === LIGNE PANNEAU ===
  if (ligne.typeLigne === 'panneau') {
    if (!ligne.dimensions.longueur) manquants.push('Longueur');
    if (!ligne.dimensions.largeur) manquants.push('Largeur');
  }

  // === LIGNE FINITION ===
  if (ligne.typeLigne === 'finition') {
    if (!ligne.finition) manquants.push('Finition');
    if (!ligne.brillance) manquants.push('Brillance');
    if (!ligne.dimensions.longueur) manquants.push('Longueur');
    if (!ligne.dimensions.largeur) manquants.push('Largeur');

    // Couleur/teinte selon type
    if (ligne.finition === 'laque' && !ligne.codeCouleurLaque) {
      manquants.push('Code couleur');
    }
    if (ligne.typeFinition === 'teinte_vernis' && !ligne.teinte) {
      manquants.push('Teinte');
    }
  }

  return manquants;
}

/**
 * Compte le nombre de champs remplis
 */
export function getNombreChampsRemplis(ligne: LignePrestationV3): { remplis: number; total: number } {
  // === LIGNE PANNEAU ===
  if (ligne.typeLigne === 'panneau') {
    const champsObligatoires = [
      ligne.reference,
      ligne.dimensions.longueur,
      ligne.dimensions.largeur,
    ];

    return {
      remplis: champsObligatoires.filter(Boolean).length,
      total: champsObligatoires.length,
    };
  }

  // === LIGNE FINITION ===
  const champsObligatoires = [
    ligne.reference,
    ligne.finition,
    ligne.brillance,
    ligne.dimensions.longueur,
    ligne.dimensions.largeur,
  ];

  return {
    remplis: champsObligatoires.filter(Boolean).length,
    total: champsObligatoires.length,
  };
}

/**
 * Formate un prix en euros
 */
export function formaterPrix(prix: number): string {
  return prix.toFixed(2).replace('.', ',') + ' €';
}
