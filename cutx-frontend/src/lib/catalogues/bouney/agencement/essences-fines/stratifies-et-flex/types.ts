// Types pour Stratifiés et flex
// Source: B comme Bois (bcommebois.fr)

import type { EssenceData, ProduitEssenceFine } from '../types';

export type { EssenceData, ProduitEssenceFine };

export interface StratifiesFlexData {
  categorie: 'Stratifiés et flex';
  essences: EssenceData[];
}
