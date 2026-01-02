// lib/configurateur/tarif-chants.ts
// Calcul du placage de chants et fourniture pour panneaux

import type { Chants, FormePanneau, ChantsConfig, DimensionsLShape, FormeCustom } from './types';
import { calculerMetresLineairesParForme } from './calculs';

/**
 * Tarifs de placage de chants
 */
export const TARIF_CHANTS = {
  PRIX_ML_PLACAGE: 5,           // €/mètre linéaire de placage de chant
  MINIMUM_PLACAGE_PANNEAU: 10,  // € minimum par panneau (placage)
} as const;

/**
 * Information sur un chant du catalogue
 */
export interface ChantCatalogue {
  id: string;
  reference: string;
  nom: string;
  type: string;              // 'Chant ABS', 'Chant PVC', etc.
  epaisseur: number;         // mm (0.4, 0.8, 1, 2, etc.)
  largeur: number;           // mm (généralement = épaisseur du panneau + 1-2mm)
  prixMl: number;            // €/mètre linéaire (fourniture)
  couleur?: string;          // Code couleur pour matching avec panneau
  marque?: string;
  enStock: boolean;
}

/**
 * Résultat du calcul de chants pour un débit
 */
export interface CalculChantDebit {
  debitId: string;
  reference: string;
  dimensions: { longueur: number; largeur: number };
  chants: Chants;
  forme?: FormePanneau;
  chantsConfig?: ChantsConfig;
  metresLineairesChants: number;          // ml total de chants à plaquer
  detailChants: {
    A: number;  // ml du chant A (longueur)
    B: number;  // ml du chant B (largeur)
    C: number;  // ml du chant C (longueur)
    D: number;  // ml du chant D (largeur)
    E?: number; // ml du chant E (pour pentagon)
  };
}

/**
 * Résultat du calcul de chants pour un panneau complet
 */
export interface CalculChantsPanneau {
  panneauId: string;
  panneauNom: string;
  debits: CalculChantDebit[];
  totalMetresLineaires: number;           // ml total
  // Prix placage
  prixPlacage: number;                    // € (main d'oeuvre placage)
  prixPlacageAvantMinimum: number;
  minimumPlacageApplique: boolean;
  // Prix fourniture chant
  chantAssocie?: ChantCatalogue;          // Chant correspondant trouvé
  prixFournitureChantMl: number;          // €/ml du chant
  prixFournitureTotal: number;            // € total fourniture
  // Total
  prixTotalHT: number;                    // placage + fourniture
}

/**
 * Résultat global
 */
export interface ResultatCalculChants {
  panneaux: CalculChantsPanneau[];
  totalMetresLineaires: number;
  totalPrixPlacage: number;
  totalPrixFourniture: number;
  totalPrixHT: number;
}

/**
 * Calcule les mètres linéaires de chants pour un débit
 * Supporte toutes les formes: rectangle, pentagon, circle, ellipse, triangle, custom
 */
export function calculerMlChantsDebit(
  debitId: string,
  reference: string,
  dimensions: { longueur: number; largeur: number },
  chants: Chants,
  options?: {
    forme?: FormePanneau;
    chantsConfig?: ChantsConfig;
    dimensionsLShape?: DimensionsLShape | null;
    formeCustom?: FormeCustom | null;
  }
): CalculChantDebit {
  const { longueur, largeur } = dimensions;
  const forme = options?.forme || 'rectangle';
  const chantsConfig = options?.chantsConfig;

  // Si on a une forme non-rectangle avec chantsConfig, utiliser le calcul par forme
  if (forme !== 'rectangle' && chantsConfig) {
    const metresLineairesChants = calculerMetresLineairesParForme(
      forme,
      { longueur, largeur, epaisseur: 0 },
      chantsConfig,
      options?.dimensionsLShape,
      options?.formeCustom
    );

    // Créer le détail selon la forme
    const detailChants = buildDetailChantsForShape(
      forme,
      dimensions,
      chantsConfig,
      options?.dimensionsLShape
    );

    return {
      debitId,
      reference,
      dimensions,
      chants,
      forme,
      chantsConfig,
      metresLineairesChants,
      detailChants,
    };
  }

  // Rectangle classique: A et C = longueurs, B et D = largeurs
  const detailChants = {
    A: chants.A ? longueur / 1000 : 0,
    B: chants.B ? largeur / 1000 : 0,
    C: chants.C ? longueur / 1000 : 0,
    D: chants.D ? largeur / 1000 : 0,
  };

  const metresLineairesChants = detailChants.A + detailChants.B + detailChants.C + detailChants.D;

  return {
    debitId,
    reference,
    dimensions,
    chants,
    forme: 'rectangle',
    metresLineairesChants,
    detailChants,
  };
}

/**
 * Construit le détail des chants selon la forme
 */
function buildDetailChantsForShape(
  forme: FormePanneau,
  dimensions: { longueur: number; largeur: number },
  chantsConfig: ChantsConfig,
  dimensionsLShape?: DimensionsLShape | null
): { A: number; B: number; C: number; D: number; E?: number } {
  const { longueur, largeur } = dimensions;

  switch (forme) {
    case 'pentagon':
      if (chantsConfig.type === 'pentagon' && dimensionsLShape) {
        const edges = chantsConfig.edges;
        const { longueurTotale, largeurTotale, longueurEncoche, largeurEncoche } = dimensionsLShape;
        return {
          A: edges.A ? longueurTotale / 1000 : 0,
          B: edges.B ? largeurTotale / 1000 : 0,
          C: edges.C ? (longueurTotale - longueurEncoche) / 1000 : 0,
          D: edges.D ? (largeurTotale - largeurEncoche) / 1000 : 0,
          E: edges.E ? longueurEncoche / 1000 : 0,
        };
      }
      break;

    case 'triangle':
      if (chantsConfig.type === 'triangle') {
        const edges = chantsConfig.edges;
        const base = longueur / 1000;
        const hauteur = largeur / 1000;
        const hypotenuse = Math.sqrt(base * base + hauteur * hauteur);
        return {
          A: edges.A ? base : 0,
          B: edges.B ? hauteur : 0,
          C: edges.C ? hypotenuse : 0,
          D: 0,
        };
      }
      break;

    case 'circle':
      if (chantsConfig.type === 'curved') {
        const contour = chantsConfig.edges.contour ? Math.PI * (longueur / 1000) : 0;
        return { A: contour, B: 0, C: 0, D: 0 };
      }
      break;

    case 'ellipse':
      if (chantsConfig.type === 'curved') {
        // Approximation de Ramanujan pour le périmètre de l'ellipse
        const a = (longueur / 1000) / 2;
        const b = (largeur / 1000) / 2;
        const contour = chantsConfig.edges.contour
          ? Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
          : 0;
        return { A: contour, B: 0, C: 0, D: 0 };
      }
      break;

    case 'custom':
      // Pour custom, le périmètre est stocké dans formeCustom (géré en amont)
      if (chantsConfig.type === 'curved') {
        return { A: 0, B: 0, C: 0, D: 0 }; // Sera calculé via formeCustom.perimetreM
      }
      break;
  }

  // Fallback rectangle
  return { A: 0, B: 0, C: 0, D: 0 };
}

/**
 * Calcule le prix de placage et fourniture pour un panneau avec ses débits
 * Supporte toutes les formes: rectangle, pentagon, circle, ellipse, triangle, custom
 */
export function calculerChantsPanneau(
  panneauId: string,
  panneauNom: string,
  debits: Array<{
    id: string;
    reference: string;
    dimensions: { longueur: number; largeur: number };
    chants: Chants;
    forme?: FormePanneau;
    chantsConfig?: ChantsConfig;
    dimensionsLShape?: DimensionsLShape | null;
    formeCustom?: FormeCustom | null;
  }>,
  options?: {
    prixMlPlacage?: number;
    minimumPlacage?: number;
    chantAssocie?: ChantCatalogue;
  }
): CalculChantsPanneau {
  const prixMlPlacage = options?.prixMlPlacage ?? TARIF_CHANTS.PRIX_ML_PLACAGE;
  const minimumPlacage = options?.minimumPlacage ?? TARIF_CHANTS.MINIMUM_PLACAGE_PANNEAU;
  const chantAssocie = options?.chantAssocie;

  // Calculer les ml pour chaque débit (avec support des formes)
  const debitsCalcules = debits.map(d =>
    calculerMlChantsDebit(d.id, d.reference, d.dimensions, d.chants, {
      forme: d.forme,
      chantsConfig: d.chantsConfig,
      dimensionsLShape: d.dimensionsLShape,
      formeCustom: d.formeCustom,
    })
  );

  // Total ml
  const totalMetresLineaires = debitsCalcules.reduce((sum, d) => sum + d.metresLineairesChants, 0);

  // Prix placage (main d'oeuvre)
  const prixPlacageAvantMinimum = totalMetresLineaires * prixMlPlacage;
  const prixPlacage = totalMetresLineaires > 0
    ? Math.max(prixPlacageAvantMinimum, minimumPlacage)
    : 0;
  const minimumPlacageApplique = prixPlacageAvantMinimum < minimumPlacage && totalMetresLineaires > 0;

  // Prix fourniture chant
  const prixFournitureChantMl = chantAssocie?.prixMl ?? 0;
  const prixFournitureTotal = totalMetresLineaires * prixFournitureChantMl;

  // Total
  const prixTotalHT = prixPlacage + prixFournitureTotal;

  return {
    panneauId,
    panneauNom,
    debits: debitsCalcules,
    totalMetresLineaires,
    prixPlacage,
    prixPlacageAvantMinimum,
    minimumPlacageApplique,
    chantAssocie,
    prixFournitureChantMl,
    prixFournitureTotal,
    prixTotalHT,
  };
}

/**
 * Trouve le chant correspondant à un panneau dans le catalogue
 *
 * Règles de matching :
 * 1. Même marque (si disponible)
 * 2. Même couleur/référence
 * 3. Largeur du chant >= épaisseur du panneau
 * 4. Type = 'Chant ABS' pour panneaux mélaminés
 */
export function trouverChantCorrespondant(
  panneau: {
    marque?: string;
    reference?: string;
    couleur?: string;
    epaisseur: number;
  },
  chantsCatalogue: ChantCatalogue[]
): ChantCatalogue | undefined {
  if (chantsCatalogue.length === 0) return undefined;

  // Filtrer les chants compatibles
  const chantsCompatibles = chantsCatalogue.filter(chant => {
    // La largeur du chant doit couvrir l'épaisseur du panneau
    if (chant.largeur < panneau.epaisseur) return false;

    // Si on a une couleur, elle doit correspondre
    if (panneau.couleur && chant.couleur) {
      const couleurMatch = chant.couleur.toLowerCase().includes(panneau.couleur.toLowerCase()) ||
        panneau.couleur.toLowerCase().includes(chant.couleur.toLowerCase());
      if (!couleurMatch) return false;
    }

    // Si on a une marque, préférer la même marque
    // (mais ne pas exclure les autres)

    return true;
  });

  if (chantsCompatibles.length === 0) return undefined;

  // Trier par pertinence :
  // 1. Même marque en premier
  // 2. En stock en priorité
  // 3. Prix le plus bas
  chantsCompatibles.sort((a, b) => {
    // Même marque
    if (panneau.marque) {
      const aMarque = a.marque === panneau.marque ? 0 : 1;
      const bMarque = b.marque === panneau.marque ? 0 : 1;
      if (aMarque !== bMarque) return aMarque - bMarque;
    }

    // En stock
    const aStock = a.enStock ? 0 : 1;
    const bStock = b.enStock ? 0 : 1;
    if (aStock !== bStock) return aStock - bStock;

    // Prix
    return a.prixMl - b.prixMl;
  });

  return chantsCompatibles[0];
}

/**
 * Calcul global pour plusieurs panneaux
 * Supporte toutes les formes: rectangle, pentagon, circle, ellipse, triangle, custom
 */
export function calculerTousLesChants(
  panneaux: Array<{
    panneauId: string;
    panneauNom: string;
    debits: Array<{
      id: string;
      reference: string;
      dimensions: { longueur: number; largeur: number };
      chants: Chants;
      forme?: FormePanneau;
      chantsConfig?: ChantsConfig;
      dimensionsLShape?: DimensionsLShape | null;
      formeCustom?: FormeCustom | null;
    }>;
    chantAssocie?: ChantCatalogue;
  }>,
  options?: {
    prixMlPlacage?: number;
    minimumPlacage?: number;
  }
): ResultatCalculChants {
  const panneauxCalcules = panneaux.map(p =>
    calculerChantsPanneau(p.panneauId, p.panneauNom, p.debits, {
      ...options,
      chantAssocie: p.chantAssocie,
    })
  );

  const totalMetresLineaires = panneauxCalcules.reduce((sum, p) => sum + p.totalMetresLineaires, 0);
  const totalPrixPlacage = panneauxCalcules.reduce((sum, p) => sum + p.prixPlacage, 0);
  const totalPrixFourniture = panneauxCalcules.reduce((sum, p) => sum + p.prixFournitureTotal, 0);
  const totalPrixHT = totalPrixPlacage + totalPrixFourniture;

  return {
    panneaux: panneauxCalcules,
    totalMetresLineaires,
    totalPrixPlacage,
    totalPrixFourniture,
    totalPrixHT,
  };
}

/**
 * Calcul simplifié pour une liste de débits (sans groupement par panneau)
 * Supporte toutes les formes: rectangle, pentagon, circle, ellipse, triangle, custom
 */
export function estimerPrixChants(
  debits: Array<{
    dimensions: { longueur: number; largeur: number };
    chants: Chants;
    forme?: FormePanneau;
    chantsConfig?: ChantsConfig;
    dimensionsLShape?: DimensionsLShape | null;
    formeCustom?: FormeCustom | null;
  }>,
  options?: {
    prixMlPlacage?: number;
    minimumPlacage?: number;
    prixMlChant?: number;  // Prix du chant au ml (fourniture)
  }
): {
  metresLineaires: number;
  prixPlacage: number;
  prixFourniture: number;
  prixTotalHT: number;
  minimumApplique: boolean;
} {
  const prixMlPlacage = options?.prixMlPlacage ?? TARIF_CHANTS.PRIX_ML_PLACAGE;
  const minimumPlacage = options?.minimumPlacage ?? TARIF_CHANTS.MINIMUM_PLACAGE_PANNEAU;
  const prixMlChant = options?.prixMlChant ?? 0;

  if (debits.length === 0) {
    return {
      metresLineaires: 0,
      prixPlacage: 0,
      prixFourniture: 0,
      prixTotalHT: 0,
      minimumApplique: false,
    };
  }

  // Calculer le total de ml (avec support des formes)
  let metresLineaires = 0;
  for (const debit of debits) {
    const { longueur, largeur } = debit.dimensions;
    const forme = debit.forme || 'rectangle';

    // Si on a une forme non-rectangle avec chantsConfig, utiliser le calcul par forme
    if (forme !== 'rectangle' && debit.chantsConfig) {
      metresLineaires += calculerMetresLineairesParForme(
        forme,
        { longueur, largeur, epaisseur: 0 },
        debit.chantsConfig,
        debit.dimensionsLShape,
        debit.formeCustom
      );
    } else {
      // Rectangle classique
      const { A, B, C, D } = debit.chants;
      if (A) metresLineaires += longueur / 1000;
      if (B) metresLineaires += largeur / 1000;
      if (C) metresLineaires += longueur / 1000;
      if (D) metresLineaires += largeur / 1000;
    }
  }

  // Prix placage
  const prixPlacageAvantMinimum = metresLineaires * prixMlPlacage;
  const prixPlacage = metresLineaires > 0
    ? Math.max(prixPlacageAvantMinimum, minimumPlacage)
    : 0;

  // Prix fourniture
  const prixFourniture = metresLineaires * prixMlChant;

  // Total
  const prixTotalHT = prixPlacage + prixFourniture;

  return {
    metresLineaires,
    prixPlacage,
    prixFourniture,
    prixTotalHT,
    minimumApplique: prixPlacageAvantMinimum < minimumPlacage && metresLineaires > 0,
  };
}

/**
 * Épaisseurs de chants standards selon l'épaisseur du panneau
 * Les chants ABS sont généralement disponibles en plusieurs épaisseurs :
 * - 0.4mm, 0.8mm, 1mm pour chants légers
 * - 2mm, 3mm pour chants épais (plus résistants)
 */
export const EPAISSEURS_CHANTS_RECOMMANDEES: Record<number, number[]> = {
  8: [0.4, 0.8],
  10: [0.4, 0.8],
  12: [0.4, 0.8, 1],
  16: [0.8, 1, 2],
  18: [0.8, 1, 2],
  19: [1, 2],
  22: [1, 2],
  25: [1, 2, 3],
  28: [2, 3],
  30: [2, 3],
  38: [2, 3],
};

/**
 * Retourne les épaisseurs de chant recommandées pour une épaisseur de panneau
 */
export function getEpaisseursChantRecommandees(epaisseurPanneau: number): number[] {
  return EPAISSEURS_CHANTS_RECOMMANDEES[epaisseurPanneau] ?? [1, 2];
}
