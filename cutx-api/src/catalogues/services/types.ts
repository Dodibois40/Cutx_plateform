/**
 * Shared types for catalogue services
 */

/**
 * Result from full-text or trigram search queries
 * Includes panel data plus joined catalogue/category info
 */
export interface FullTextSearchResult {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  thickness: number[];
  defaultLength: number;
  defaultWidth: number;
  defaultThickness: number | null;
  isVariableLength: boolean;
  pricePerM2: number | null;
  pricePerMl: number | null;
  pricePerUnit: number | null;
  productType: string | null;
  material: string | null;
  finish: string | null;
  colorCode: string | null;
  imageUrl: string | null;
  isActive: boolean;
  stockStatus: string | null;
  manufacturerRef: string | null;
  createdAt: Date;
  updatedAt: Date;
  catalogueId: string;
  categoryId: string | null;
  catalogue_name: string | null;
  category_name: string | null;
  category_slug: string | null;
  parent_name: string | null;
  parent_slug: string | null;
  rank: number;
}

/**
 * Options for search methods
 */
export interface SearchOptions {
  catalogueSlug?: string;
  productType?: string;
  sousCategorie?: string;
  epaisseur?: number;
  enStock?: boolean;
  limit: number;
  offset: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Search result with panels and total count
 */
export interface SearchResult {
  panels: FullTextSearchResult[];
  total: number;
}
