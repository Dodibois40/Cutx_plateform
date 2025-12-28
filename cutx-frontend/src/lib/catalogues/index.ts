// ==============================================
// CATALOGUES PANNEAUX - STUB POUR NETLIFY BUILD
// Les vraies données viennent de l'API PostgreSQL
// Ce fichier fournit les types et exports vides pour la compilation
// ==============================================

// Type unifié pour la recherche
export interface ProduitReference {
  nom: string;
  reference: string;
  codeArticle: string;
  marque: string;
  type: string;
  longueur: number;
  largeur: number;
  epaisseur: number;
  stock: 'EN STOCK' | 'Sur commande';
  prixAchatM2?: number;
  marge?: number;
  prixVenteM2?: number;
  imageUrl?: string;
}

export interface MarqueData {
  marque: string;
  produits: ProduitReference[];
}

export interface ProduitCatalogue extends ProduitReference {
  categorie: string;
  sousCategorie: string;
}

// ==============================================
// CATALOGUES VIDES (données via API PostgreSQL)
// ==============================================

export const CATALOGUE_UNIS: MarqueData[] = [];
export const CATALOGUE_BOIS: MarqueData[] = [];
export const CATALOGUE_MATIERES: Record<string, MarqueData> = {};

// Catalogue complet vide - les données viennent de l'API
export const CATALOGUE_COMPLET: ProduitCatalogue[] = [];

// ==============================================
// FONCTIONS STUB (retournent vide - utiliser API)
// ==============================================

export const getTotalReferences = () => 0;

export const getMarquesDisponibles = (): string[] => [];

export const getTypesDisponibles = (): string[] => [];

export const getImageColoris = (_nom: string): string | null => null;

export const getImageColorisBois = (_nom: string): string | null => null;

export const getStatsUnis = () => ({
  totalReferences: 0,
  marques: 0,
  enStock: 0,
  surCommande: 0,
});

// ==============================================
// FONCTION DE RECHERCHE (retourne vide - utiliser API)
// ==============================================

export function searchCatalogue(_query: string, _maxResults: number = 25): ProduitCatalogue[] {
  console.warn('⚠️ searchCatalogue() appelé sur données statiques vides - utiliser searchCataloguesAPI()');
  return [];
}

export interface FiltresCatalogue {
  marque?: string;
  type?: string;
  epaisseurMin?: number;
  epaisseurMax?: number;
  enStockUniquement?: boolean;
}

export function filtrerCatalogue(
  _query: string = '',
  _filtres: FiltresCatalogue = {},
  _maxResults: number = 50
): ProduitCatalogue[] {
  console.warn('⚠️ filtrerCatalogue() appelé sur données statiques vides - utiliser API');
  return [];
}
