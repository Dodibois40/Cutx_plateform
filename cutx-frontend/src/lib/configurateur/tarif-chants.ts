// lib/configurateur/tarif-chants.ts
// Calcul du placage de chants et fourniture pour panneaux

import type { Chants } from './types';

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
  metresLineairesChants: number;          // ml total de chants à plaquer
  detailChants: {
    A: number;  // ml du chant A (longueur)
    B: number;  // ml du chant B (largeur)
    C: number;  // ml du chant C (longueur)
    D: number;  // ml du chant D (largeur)
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
 */
export function calculerMlChantsDebit(
  debitId: string,
  reference: string,
  dimensions: { longueur: number; largeur: number },
  chants: Chants
): CalculChantDebit {
  const { longueur, largeur } = dimensions;

  // A et C = longueurs, B et D = largeurs
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
    metresLineairesChants,
    detailChants,
  };
}

/**
 * Calcule le prix de placage et fourniture pour un panneau avec ses débits
 */
export function calculerChantsPanneau(
  panneauId: string,
  panneauNom: string,
  debits: Array<{
    id: string;
    reference: string;
    dimensions: { longueur: number; largeur: number };
    chants: Chants;
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

  // Calculer les ml pour chaque débit
  const debitsCalcules = debits.map(d =>
    calculerMlChantsDebit(d.id, d.reference, d.dimensions, d.chants)
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
 */
export function estimerPrixChants(
  debits: Array<{
    dimensions: { longueur: number; largeur: number };
    chants: Chants;
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

  // Calculer le total de ml
  let metresLineaires = 0;
  for (const debit of debits) {
    const { longueur, largeur } = debit.dimensions;
    const { A, B, C, D } = debit.chants;

    if (A) metresLineaires += longueur / 1000;
    if (B) metresLineaires += largeur / 1000;
    if (C) metresLineaires += longueur / 1000;
    if (D) metresLineaires += largeur / 1000;
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
