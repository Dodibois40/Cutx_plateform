export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  catalogueId: string;
  _count: { panels: number };
  children?: AdminCategory[];
  /** Compteur agrégé (somme des panneaux de cette catégorie + tous ses enfants) */
  aggregatedCount?: number;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  parentId: string | null;
}

export interface FlatCategory {
  id: string;
  name: string;
  level: number;
}
