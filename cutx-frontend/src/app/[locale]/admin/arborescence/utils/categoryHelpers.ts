import type { AdminCategory } from '@/components/admin/arborescence';

/**
 * Compte récursivement le nombre de catégories et de panneaux
 */
export function countAll(cats: AdminCategory[]): { cats: number; panels: number } {
  return (cats || []).reduce(
    (acc, c) => {
      const sub = countAll(c.children || []);
      return {
        cats: acc.cats + 1 + sub.cats,
        panels: acc.panels + (c._count?.panels || 0) + sub.panels,
      };
    },
    { cats: 0, panels: 0 }
  );
}

/**
 * Calcule le nombre de panneaux agrégé pour une catégorie (incluant ses enfants)
 */
export function computeAggregatedCount(cat: AdminCategory): number {
  const childCount = (cat.children || []).reduce(
    (sum, child) => sum + computeAggregatedCount(child),
    0
  );
  return (cat._count?.panels || 0) + childCount;
}

/**
 * Ajoute le compteur agrégé à chaque catégorie récursivement
 */
export function addAggregatedCounts(cats: AdminCategory[]): AdminCategory[] {
  return cats.map((cat) => ({
    ...cat,
    aggregatedCount: computeAggregatedCount(cat),
    children: cat.children ? addAggregatedCounts(cat.children) : undefined,
  }));
}
