/**
 * Types pour le Configurateur Multicouche
 * Un panneau multicouche = plusieurs couches collées ensemble
 */

// Type de couche dans le panneau
export type TypeCouche = 'parement' | 'ame' | 'contrebalancement' | 'autre';

// Mode de collage
export type ModeCollage = 'fournisseur' | 'client';

// Une couche du panneau multicouche
export interface CoucheMulticouche {
  id: string;
  ordre: number; // 1 = face visible (parement), N = dos
  type: TypeCouche;

  // Matériau
  materiau: string;
  epaisseur: number; // mm

  // Sens du fil (uniquement pour parement)
  sensDuFil?: 'longueur' | 'largeur';

  // Panneau du catalogue (optionnel)
  panneauId: string | null;
  panneauNom: string | null;
  panneauReference: string | null;
  panneauImageUrl: string | null;
  panneauLongueur: number | null; // mm - dimensions du panneau brut
  panneauLargeur: number | null; // mm
  prixPanneauM2: number;

  // Calculé
  surfaceM2: number;
  prixCouche: number;
}

// Ligne de prestation multicouche
export interface LigneMulticouche {
  id: string;
  reference: string;

  // Couches
  couches: CoucheMulticouche[];

  // Mode de collage
  modeCollage: ModeCollage;

  // Dimensions finales souhaitées
  dimensions: {
    longueur: number; // mm
    largeur: number; // mm
  };

  // Sur-cote (si collage client)
  avecSurcote: boolean;
  surcoteMm: number; // Défaut: 50mm
  dimensionsDecoupe: {
    longueur: number;
    largeur: number;
  };

  // Calculés
  epaisseurTotale: number; // Σ couches
  surfaceM2: number;

  // Options (désactivées si collage client)
  chants: { A: boolean; B: boolean; C: boolean; D: boolean };
  percage: boolean;
  avecFinition: boolean;

  // Prix
  prixCouches: number;
  prixCollage: number;
  prixTotal: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// État du configurateur multicouche
export interface ConfigurateurMulticoucheState {
  referenceChantier: string;
  lignes: LigneMulticouche[];
  modeCollageGlobal: ModeCollage | null; // Défini au début
}

// Labels pour l'UI
export const LABELS_COUCHE: Record<TypeCouche, string> = {
  parement: 'Face parement (visible)',
  ame: 'Âme du panneau',
  contrebalancement: 'Contrebalancement (dos)',
  autre: 'Couche intermédiaire',
};

// Constantes
export const SURCOTE_DEFAUT = 50; // mm
export const COUCHES_MIN = 2;
export const COUCHES_MAX = 5;

// Panneau multicouche configuré (pour le header)
export interface PanneauMulticouche {
  id: string;
  couches: CoucheMulticouche[];
  modeCollage: ModeCollage;
  epaisseurTotale: number;
  prixEstimeM2: number;
}
