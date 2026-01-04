// Types pour l'import Excel et DXF
import type { Materiau } from '../types';

// ═══════════════════════════════════════════════════════════════
// TYPES DXF IMPORT
// ═══════════════════════════════════════════════════════════════

export interface DxfCircleInfo {
  x: number;
  y: number;
  radius: number;
  diameter: number;
  layer: string;
}

export interface DxfPolylineInfo {
  vertices: Array<{ x: number; y: number }>;
  closed: boolean;
  layer: string;
}

export interface DxfPanelGeometry {
  polylines: DxfPolylineInfo[];
  circles: DxfCircleInfo[];
  arcsCount: number;
  splinesCount: number;
}

export interface DxfTitleBlockData {
  projet: string;
  corpsMeuble: string;
  quantite: number;
  designation: string;
  createur: string;
  numeroPlan: string;
}

export interface DxfPanelExtracted {
  reference: string;              // Depuis "Désignation" dans TitleBlock
  layerPrefix: string;            // Ex: "Nouveau projet_Nouveau meuble_Panneau supérieur"
  dimensions: {
    longueur: number;             // mm
    largeur: number;              // mm
    epaisseur: number;            // mm (default 19 si non trouvé)
  };
  quantite: number;
  geometry: DxfPanelGeometry;
  titleBlockData: DxfTitleBlockData | null;
  dxfData: string;                // Base64 encoded DXF section
  surfaceM2: number;
  perimetreM: number;
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface DxfDonneesImportees {
  sourceFileName: string;
  panels: DxfPanelExtracted[];
  projet: string;
  corpsMeuble: string;
}

export interface DxfResultatImport {
  success: boolean;
  donnees?: DxfDonneesImportees;
  erreur?: string;
  avertissements: string[];
}

// ═══════════════════════════════════════════════════════════════
// TYPES EXCEL IMPORT
// ═══════════════════════════════════════════════════════════════

export interface DonneesImportees {
  referenceChantier: string;
  epaisseur: number;
  materiau: Materiau | null;
  lignes: LigneImportee[];
}

export interface LigneImportee {
  reference: string;
  longueur: number;
  largeur: number;
  quantite: number;
  materiau?: Materiau | null;
  chants: {
    A: boolean; // Longueur côté 1
    B: boolean; // Largeur côté 1
    C: boolean; // Longueur côté 2
    D: boolean; // Largeur côté 2
  };
}

export interface ResultatImport {
  success: boolean;
  donnees?: DonneesImportees;
  erreur?: string;
  avertissements: string[];
}

// Type pour identifier le format du fichier Excel
export type FormatExcel = 'bouney' | 'ideabois' | 'debit' | 'inconnu';

// Mapping des colonnes Excel Bouney
export const BOUNEY_COLUMNS = {
  // Header
  REFERENCE_CHANTIER: 'AU11',
  EPAISSEUR: 'N17',

  // Tableau (colonnes, ligne de départ = 27)
  PREMIERE_LIGNE_DONNEES: 27,
  COL_REFERENCE: 'B',
  COL_LONGUEUR: 'O',
  COL_LARGEUR: 'T',
  COL_QUANTITE: 'Y',
  COL_CHANT_A: 'AB', // Longueur côté 1
  COL_CHANT_C: 'AF', // Longueur côté 2
  COL_CHANT_B: 'AJ', // Largeur côté 1
  COL_CHANT_D: 'AN', // Largeur côté 2
} as const;

// Mapping des colonnes Excel IDEA BOIS
export const IDEABOIS_COLUMNS = {
  // Header
  REFERENCE_CHANTIER: 'S10', // Contient "Observation / référence chantier : XXX"
  MATERIAU: 'K7', // Ex: "Agglo chêne"
  EPAISSEUR: 'Y7', // Ex: "Epaisseur : 19"

  // Marqueur de détection du format
  TITRE_FICHE: 'H1', // Contient "FICHE DE DEBIT PANNEAUX"

  // Tableau (colonnes, ligne de départ = 18)
  PREMIERE_LIGNE_DONNEES: 18,
  COL_REFERENCE: 'B',
  COL_LONGUEUR: 'F',
  COL_LARGEUR: 'I',
  COL_QUANTITE: 'L',
  // Chants: on vérifie plusieurs colonnes car le format peut varier
  COL_CHANT_A1: ['N', 'O', 'P'], // A1 = Longueur côté 1
  COL_CHANT_A2: ['Q', 'R', 'S'], // A2 = Longueur côté 2
  COL_CHANT_B1: ['T', 'U', 'V'], // B1 = Largeur côté 1
  COL_CHANT_B2: ['W', 'X', 'Y'], // B2 = Largeur côté 2
} as const;
