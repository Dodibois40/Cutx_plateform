// Catalogue Bouney - Stratifiés/Mélaminés/Compacts/Chants - Unis
// Export centralisé de toutes les marques

export * from './types';

// Marques disponibles
export { NEBODESIGN_UNIS } from './nebodesign';
export { PFLEIDERER_UNIS } from './pfleiderer';
export { POLYREY_UNIS } from './polyrey';
export { EGGER_UNIS } from './egger';
export { FENIX_UNIS } from './fenix';
export { FORMICA_UNIS } from './formica';
export { UNILIN_UNIS } from './unilin';
export { REHAU_RAUVISIO_UNIS } from './rehau-rauvisio';

import type { MarqueData } from './types';
import { NEBODESIGN_UNIS } from './nebodesign';
import { PFLEIDERER_UNIS } from './pfleiderer';
import { POLYREY_UNIS } from './polyrey';
import { EGGER_UNIS } from './egger';
import { FENIX_UNIS } from './fenix';
import { FORMICA_UNIS } from './formica';
import { UNILIN_UNIS } from './unilin';
import { REHAU_RAUVISIO_UNIS } from './rehau-rauvisio';

// Toutes les marques Unis regroupées (8 marques)
export const CATALOGUE_UNIS: MarqueData[] = [
  NEBODESIGN_UNIS,
  PFLEIDERER_UNIS,
  POLYREY_UNIS,
  EGGER_UNIS,
  FENIX_UNIS,
  FORMICA_UNIS,
  UNILIN_UNIS,
  REHAU_RAUVISIO_UNIS,
];

// Fonction helper pour obtenir l'image d'un coloris
export const getImageColoris = (marque: string, reference: string): string | null => {
  const marqueData = CATALOGUE_UNIS.find(m => m.marque === marque);
  if (marqueData?.images) {
    return marqueData.images[reference] || null;
  }
  return null;
};

// Statistiques
export const getStatsUnis = () => {
  const totalProduits = CATALOGUE_UNIS.reduce((acc, m) => acc + m.produits.length, 0);
  const totalMarques = CATALOGUE_UNIS.length;
  const parMarque = CATALOGUE_UNIS.map(m => ({
    marque: m.marque,
    nbProduits: m.produits.length,
    nbColoris: new Set(m.produits.map(p => p.reference)).size,
  }));

  return { totalProduits, totalMarques, parMarque };
};
