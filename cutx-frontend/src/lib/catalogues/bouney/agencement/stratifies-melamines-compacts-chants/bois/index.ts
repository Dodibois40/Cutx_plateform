// Catalogue Bouney - Bois (décors bois)
// Stratifiés - Mélaminés - Compacts - Chants

export * from './types';
export * from './nebodesign';
export * from './pfleiderer';
export * from './polyrey';
export * from './egger';
export * from './unilin';
export * from './formica';

import type { MarqueData } from './types';
import { NEBODESIGN_BOIS } from './nebodesign';
import { PFLEIDERER_BOIS } from './pfleiderer';
import { POLYREY_BOIS } from './polyrey';
import { EGGER_BOIS } from './egger';
import { UNILIN_BOIS } from './unilin';
import { FORMICA_BOIS } from './formica';

// Toutes les marques Bois regroupées (6 marques)
export const CATALOGUE_BOIS: MarqueData[] = [
  NEBODESIGN_BOIS,
  PFLEIDERER_BOIS,
  POLYREY_BOIS,
  EGGER_BOIS,
  UNILIN_BOIS,
  FORMICA_BOIS,
];

// Accès par clé (legacy)
export const CATALOGUES_BOIS = {
  nebodesign: NEBODESIGN_BOIS,
  pfleiderer: PFLEIDERER_BOIS,
  polyrey: POLYREY_BOIS,
  egger: EGGER_BOIS,
  unilin: UNILIN_BOIS,
  formica: FORMICA_BOIS,
};

export const MARQUES_BOIS = [
  'Nebodesign',
  'Pfleiderer',
  'Polyrey',
  'Egger',
  'Unilin',
  'Formica',
] as const;

export type MarqueBois = typeof MARQUES_BOIS[number];

// Fonction helper pour obtenir l'image d'un coloris bois
export const getImageColorisBois = (marque: string, reference: string): string | null => {
  const marqueData = CATALOGUE_BOIS.find(m => m.marque === marque);
  if (marqueData?.images) {
    return marqueData.images[reference] || null;
  }
  return null;
};
