// Types pour le catalogue Bouney - Agencement - Essences Fines
// Source: B comme Bois (bcommebois.fr)

export interface ProduitEssenceFine {
  nom: string;
  reference: string;      // Code fabricant/produit
  longueur: number;       // en mm
  largeur: number;        // en mm
  epaisseur: number;      // en mm
  type: string;           // Type de support (Aggloméré, MDF, Contreplaqué, etc.)
  essence: string;        // Essence du placage (Chêne, Frêne, etc.)
  finition?: string;      // Type de finition (Brut, Verni, etc.)
  codeArticle: string;    // Code B comme Bois
  stock: 'EN STOCK' | 'Sur commande';
  marque: string;
  prixAchatM2?: number;   // Prix d'achat au m² (€)
  marge?: number;         // Marge en %
  prixVenteM2?: number;   // Prix de vente au m² (€)
}

export interface EssenceData {
  essence: string;
  description?: string;
  produits: ProduitEssenceFine[];
  images?: Record<string, string>; // reference -> URL image Firebase
}

export interface CategorieEssencesFines {
  nom: string;
  slug: string;
  description: string;
  essences: EssenceData[];
}

// Types de supports disponibles
export type TypeSupport =
  | 'Aggloméré replaqué'
  | 'MDF replaqué'
  | 'Contreplaqué replaqué'
  | 'Stratifié flex'
  | 'Latté replaqué';

// Essences de bois disponibles
export type EssenceBois =
  | 'Chêne'
  | 'Châtaignier'
  | 'Frêne'
  | 'Hêtre'
  | 'Noyer US'
  | 'Sapelli'
  | 'Querkus'
  | 'Shinnoki'
  | 'Nuxe'
  | 'Autres essences';
