/**
 * Types for AI Assistant module
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClassificationResult {
  needsAI: boolean;
  confidence: number;
  reason:
    | 'simple_product_search'
    | 'project_description'
    | 'recommendation_request'
    | 'complex_quantity'
    | 'question';
  extractedIntent?: string;
}

export interface ParsedPanel {
  role: string;
  productType: string;
  criteria: {
    keywords: string[];
    thickness?: number;
    hydro?: boolean;
    dimensions?: { length: number; width: number };
  };
  quantity?: number;
  reasoning?: string;
}

export interface ParsedDebit {
  panelRole: string;
  reference: string;
  longueur: number;
  largeur: number;
  quantity: number;
  chants: { A: boolean; B: boolean; C: boolean; D: boolean };
  description?: string;
}

export interface ParsedEdgeBand {
  matchPanel: string;
  type: string;
  thickness: string;
  color?: string;
}

export interface ClaudeRecommendation {
  understood: boolean;
  recap: string;
  questions?: string[];
  recommendation?: {
    panels: ParsedPanel[];
    debits: ParsedDebit[];
    edgeBands?: ParsedEdgeBand[];
  };
}

export interface GenerateConfigInput {
  recommendation: ClaudeRecommendation['recommendation'];
  conversationId?: string;
}

// InitialGroupeData compatible with frontend
export interface InitialGroupeData {
  panneau: {
    type: 'catalogue';
    panneau: PanneauCatalogue;
  };
  lignes?: LignePrestationV3[];
}

// Simplified types matching frontend expectations
export interface PanneauCatalogue {
  id: string;
  nom: string;
  categorie: string;
  essence?: string | null;
  epaisseurs: number[];
  prixM2: Record<string, number>;
  fournisseur?: string | null;
  disponible: boolean;
  description?: string | null;
  ordre: number;
  longueur?: number | null;
  largeur?: number | null;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface LignePrestationV3 {
  id: string;
  reference: string;
  typeLigne: 'panneau' | 'finition';
  ligneParentId: string | null;
  materiau: string | null;
  dimensions: {
    longueur: number;
    largeur: number;
    epaisseur: number;
  };
  chants: { A: boolean; B: boolean; C: boolean; D: boolean };
  sensDuFil: 'longueur' | 'largeur';
  forme: 'rectangle' | 'pentagon' | 'circle' | 'ellipse' | 'triangle' | 'custom';
  chantsConfig: { type: string; edges: Record<string, boolean> };
  dimensionsLShape: null;
  dimensionsTriangle: null;
  formeCustom: null;
  usinages: unknown[];
  percage: boolean;
  avecFourniture: boolean;
  panneauId: string | null;
  panneauNom: string | null;
  panneauImageUrl: string | null;
  prixPanneauM2: number;
  avecFinition: boolean;
  typeFinition: 'vernis' | 'teinte_vernis' | 'laque' | null;
  finition: 'laque' | 'vernis' | null;
  teinte: string | null;
  codeCouleurLaque: string | null;
  brillance: string | null;
  nombreFaces: 1 | 2;
  // Calculated fields (will be recalculated by frontend)
  surfaceM2: number;
  surfaceFacturee: number;
  metresLineairesChants: number;
  prixPanneau: number;
  prixFaces: number;
  prixChants: number;
  prixUsinages: number;
  prixPercage: number;
  prixFournitureHT: number;
  prixPrestationHT: number;
  prixHT: number;
  prixTTC: number;
}
