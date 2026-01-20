export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  catalogueId: string;
  _count: { panels: number };
  children?: AdminCategory[];
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
