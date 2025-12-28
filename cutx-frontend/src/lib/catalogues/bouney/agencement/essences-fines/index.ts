// Index principal - Essences Fines
// Catalogue Bouney - Agencement - B comme Bois
//
// Structure:
// - Agglomérés replaqués (7 essences)
// - MDF replaqués (10 essences incluant Querkus, Shinnoki, Nuxe)
// - Contreplaqués replaqués (7 essences)
// - Stratifiés et flex (7 essences)
// - Lattés replaqués (7 essences)

export * from './types';

// Export des catégories
export { AGGLOMERES_REPLAQUES } from './agglomeres-replaques';
export { MDF_REPLAQUES } from './mdf-replaques';
export { CONTREPLAQUES_REPLAQUES } from './contreplaques-replaques';
export { STRATIFIES_FLEX } from './stratifies-et-flex';
export { LATTES_REPLAQUES } from './lattes-replaques';

// Re-export des sous-modules pour accès granulaire
export * as AgglomeresReplaques from './agglomeres-replaques';
export * as MDFReplaques from './mdf-replaques';
export * as ContreplaqueReplaques from './contreplaques-replaques';
export * as StratifiesFlex from './stratifies-et-flex';
export * as LattesReplaques from './lattes-replaques';

// Import pour le catalogue complet
import { AGGLOMERES_REPLAQUES } from './agglomeres-replaques';
import { MDF_REPLAQUES } from './mdf-replaques';
import { CONTREPLAQUES_REPLAQUES } from './contreplaques-replaques';
import { STRATIFIES_FLEX } from './stratifies-et-flex';
import { LATTES_REPLAQUES } from './lattes-replaques';
import type { CategorieEssencesFines, EssenceData, ProduitEssenceFine } from './types';

// Catalogue complet des essences fines
export const ESSENCES_FINES = {
  nom: 'Essences fines',
  description: 'Panneaux replaqués avec placage bois naturel - Différents supports disponibles',
  categories: [
    {
      nom: 'Agglomérés replaqués',
      slug: 'agglomeres-replaques',
      description: 'Placage bois sur support aggloméré',
      essences: AGGLOMERES_REPLAQUES.essences,
    },
    {
      nom: 'MDF replaqués',
      slug: 'mdf-replaques',
      description: 'Placage bois sur support MDF',
      essences: MDF_REPLAQUES.essences,
    },
    {
      nom: 'Contreplaqués replaqués',
      slug: 'contreplaques-replaques',
      description: 'Placage bois sur support contreplaqué',
      essences: CONTREPLAQUES_REPLAQUES.essences,
    },
    {
      nom: 'Stratifiés et flex',
      slug: 'stratifies-et-flex',
      description: 'Placages souples pour surfaces courbes et chants',
      essences: STRATIFIES_FLEX.essences,
    },
    {
      nom: 'Lattés replaqués',
      slug: 'lattes-replaques',
      description: 'Placage bois sur support latté',
      essences: LATTES_REPLAQUES.essences,
    },
  ] as CategorieEssencesFines[],
};

// Helper pour récupérer tous les produits
export function getAllEssencesFinesProduits(): ProduitEssenceFine[] {
  const produits: ProduitEssenceFine[] = [];

  for (const categorie of ESSENCES_FINES.categories) {
    for (const essence of categorie.essences) {
      produits.push(...essence.produits);
    }
  }

  return produits;
}

// Helper pour trouver une essence par son nom
export function findEssenceByName(essenceName: string): EssenceData | undefined {
  for (const categorie of ESSENCES_FINES.categories) {
    const found = categorie.essences.find(
      (e) => e.essence.toLowerCase() === essenceName.toLowerCase()
    );
    if (found) return found;
  }
  return undefined;
}

// Helper pour trouver une catégorie par son slug
export function findCategorieBySlug(slug: string): CategorieEssencesFines | undefined {
  return ESSENCES_FINES.categories.find((c) => c.slug === slug);
}
