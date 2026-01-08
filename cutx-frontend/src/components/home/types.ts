// Types for home search components

export interface SearchProduct {
  id: string;
  reference: string;
  nom: string;
  refFabricant?: string | null;
  marque?: string | null;
  categorie?: string | null;
  sousCategorie?: string | null;
  type?: string | null;
  productType?: string | null;
  longueur?: number | string;
  largeur?: number;
  epaisseur?: number | null;
  prixAchatM2?: number | null;
  prixMl?: number | null;
  prixUnit?: number | null;
  imageUrl?: string | null;
  stock?: string | null;
  isVariableLength?: boolean;
}

export interface SmartSearchFacets {
  genres: { label: string; count: number; searchTerm: string }[];
  dimensions: { label: string; count: number; length: number; width: number }[];
  thicknesses: { value: number; count: number }[];
}

export interface ParsedFilters {
  productTypes: string[];
  subcategories: string[];
  thickness: number | null;
  searchTerms: string[];
  originalQuery: string;
}
