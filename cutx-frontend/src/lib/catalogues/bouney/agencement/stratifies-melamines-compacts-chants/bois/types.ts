// Types pour le catalogue Bouney - Bois (décors bois)
// Stratifiés - Mélaminés - Compacts - Chants

export interface ProduitReference {
  nom: string;
  reference: string;
  longueur: number;
  largeur: number;
  epaisseur: number;
  type: string;
  codeArticle: string;
  stock: 'EN STOCK' | 'Sur commande';
  marque: string;
  prixAchatM2?: number;
  marge?: number;
  prixVenteM2?: number;
}

export interface MarqueData {
  marque: string;
  images: Record<string, string>;
  produits: ProduitReference[];
}
