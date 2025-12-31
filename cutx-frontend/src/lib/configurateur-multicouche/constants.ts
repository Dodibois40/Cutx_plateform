/**
 * Constantes pour le Configurateur Multicouche
 */

import type { CoucheMulticouche, LigneMulticouche, TypeCouche } from './types';

// Règles métier
export const REGLES_MULTICOUCHE = {
  COUCHES_MIN: 2,
  COUCHES_MAX: 5,
  SURCOTE_DEFAUT: 50, // mm
  SURCOTE_MIN: 20, // mm
  SURCOTE_MAX: 100, // mm
};

// Tarifs (à définir plus tard)
export const TARIFS_MULTICOUCHE = {
  COLLAGE_M2: 0, // À définir
  DECOUPE_PAR_COUCHE: 0, // À définir
};

// Créer une nouvelle couche vide
export function creerNouvelleCouche(ordre: number, type: TypeCouche = 'ame'): CoucheMulticouche {
  return {
    id: crypto.randomUUID(),
    ordre,
    type,
    materiau: '',
    epaisseur: 0,
    sensDuFil: type === 'parement' ? 'longueur' : undefined,
    panneauId: null,
    panneauNom: null,
    panneauReference: null,
    panneauImageUrl: null,
    prixPanneauM2: 0,
    surfaceM2: 0,
    prixCouche: 0,
  };
}

// Créer une nouvelle ligne multicouche
export function creerNouvelleLigneMulticouche(): LigneMulticouche {
  return {
    id: crypto.randomUUID(),
    reference: '',
    couches: [
      creerNouvelleCouche(1, 'parement'),
      creerNouvelleCouche(2, 'ame'),
      creerNouvelleCouche(3, 'contrebalancement'),
    ],
    modeCollage: 'fournisseur',
    dimensions: { longueur: 0, largeur: 0 },
    avecSurcote: false,
    surcoteMm: REGLES_MULTICOUCHE.SURCOTE_DEFAUT,
    dimensionsDecoupe: { longueur: 0, largeur: 0 },
    epaisseurTotale: 0,
    surfaceM2: 0,
    chants: { A: false, B: false, C: false, D: false },
    percage: false,
    avecFinition: false,
    prixCouches: 0,
    prixCollage: 0,
    prixTotal: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Suggestions de matériaux par type
export const MATERIAUX_SUGGERES: Record<TypeCouche, string[]> = {
  parement: ['Placage bois', 'Décoflex', 'HPL décoratif', 'Stratifié décor'],
  ame: ['MDF', 'Contreplaqué', 'Lattés', 'Aggloméré'],
  contrebalancement: ['Stratifié kraft', 'Stratifié blanc mat', 'Papier kraft'],
  autre: ['MDF', 'Contreplaqué'],
};
