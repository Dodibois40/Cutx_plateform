// Types pour le catalogue Bouney - Stratifiés/Mélaminés/Compacts/Chants - Unis

export interface ProduitReference {
  nom: string;
  reference: string;      // Code fabricant (ex: 0029, R20006)
  longueur: number;       // en mm
  largeur: number;        // en mm
  epaisseur: number;      // en mm (ou 0.8, 0.9 pour HPL)
  type: string;           // Mélaminé, Stratifié HPL, Compact, Chant ABS
  codeArticle: string;    // Code B comme Bois
  stock: 'EN STOCK' | 'Sur commande';
  marque: string;
  prixAchatM2?: number;   // Prix d'achat au m² (€)
  marge?: number;         // Marge en %
  prixVenteM2?: number;   // Prix de vente au m² (€)
}

export interface MarqueData {
  marque: string;
  produits: ProduitReference[];
  images?: Record<string, string>; // reference -> URL image
}
