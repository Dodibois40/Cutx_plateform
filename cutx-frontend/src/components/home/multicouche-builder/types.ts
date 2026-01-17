/**
 * Types pour le Multicouche Builder
 * Construction de panneaux multicouches artisanaux depuis le moteur de recherche
 */

import type { SearchProduct } from '../types';
import type {
  TypeCouche,
  ModeCollage,
  CoucheMulticouche,
} from '@/lib/configurateur-multicouche/types';

// ============================================================================
// MODE SELECTION
// ============================================================================

/**
 * Mode de la colonne de droite sur la home page
 */
export type HomePanelMode = 'industriel' | 'multicouche';

// ============================================================================
// BUILDER LAYER
// ============================================================================

/**
 * Couche dans le builder (étend CoucheMulticouche avec le produit SearchProduct)
 */
export interface BuilderCouche extends CoucheMulticouche {
  /** Produit sélectionné depuis la recherche */
  produit: SearchProduct | null;
  /** UI: couche actuellement sélectionnée pour assignation */
  isActive: boolean;
}

// ============================================================================
// CHUTES (SCRAPS)
// ============================================================================

/**
 * Position de la chute par rapport à la découpe
 */
export type ChutePosition = 'longueur' | 'largeur';

/**
 * Chute générée quand les couches ont des dimensions différentes
 */
export interface ChutePreview {
  id: string;
  /** ID de la couche source */
  sourceCoucheId: string;
  /** Nom de la couche source pour affichage */
  sourceCoucheNom: string;
  /** Dimensions de la chute */
  dimensions: {
    longueur: number;
    largeur: number;
    epaisseur: number;
  };
  /** Surface en m² */
  surfaceM2: number;
  /** Valeur estimée en € */
  valeurEstimee: number;
  /** Position de la chute */
  position: ChutePosition;
}

// ============================================================================
// CHANT SELECTION
// ============================================================================

/**
 * Configuration des chants pour le panneau multicouche
 */
export interface ChantsConfig {
  /** Chant sélectionné (même chant sur tous les côtés actifs) */
  chant: SearchProduct | null;
  /** Côtés actifs */
  actifs: {
    A: boolean;
    B: boolean;
    C: boolean;
    D: boolean;
  };
}

// ============================================================================
// BUILDER STATE
// ============================================================================

/**
 * État complet du multicouche builder
 */
export interface MulticoucheBuilderState {
  // Mode de collage
  modeCollage: ModeCollage;

  // Couches (2-6)
  couches: BuilderCouche[];

  // Couche actuellement active (pour assignation de produit)
  activeCoucheId: string | null;

  // Options de collage artisan
  avecSurcote: boolean;
  surcoteMm: number;

  // Dimensions finales (MIN de toutes les couches)
  dimensionsFinales: {
    longueur: number;
    largeur: number;
  };

  // Chants
  chants: ChantsConfig;

  // Chutes générées
  chutes: ChutePreview[];

  // Valeurs calculées
  epaisseurTotale: number;
  prixTotalCouches: number;
  prixCollage: number;
  prixTotal: number;

  // Validation
  isValid: boolean;
  erreurs: string[];
}

// ============================================================================
// BUILDER ACTIONS
// ============================================================================

/**
 * Actions disponibles dans le builder
 */
export interface MulticoucheBuilderActions {
  // Mode
  setModeCollage: (mode: ModeCollage) => void;

  // Couches
  ajouterCouche: () => void;
  supprimerCouche: (coucheId: string) => void;
  setActiveCouche: (coucheId: string | null) => void;
  updateCoucheType: (coucheId: string, type: TypeCouche) => void;
  assignerProduit: (coucheId: string, produit: SearchProduct) => void;
  retirerProduit: (coucheId: string) => void;
  /** Réorganiser les couches (drag & drop) */
  reorderCouches: (fromIndex: number, toIndex: number) => void;

  // Surcote (collage artisan)
  toggleSurcote: () => void;
  setSurcoteMm: (mm: number) => void;

  // Chants
  assignerChant: (chant: SearchProduct) => void;
  retirerChant: () => void;
  toggleChantCote: (cote: 'A' | 'B' | 'C' | 'D') => void;

  // Navigation
  configurerDebit: () => void;
  reset: () => void;
}

// ============================================================================
// CONTEXT TYPE
// ============================================================================

/**
 * Type complet du context (state + actions)
 */
export interface MulticoucheBuilderContextType
  extends MulticoucheBuilderState,
    MulticoucheBuilderActions {}

// ============================================================================
// STORAGE
// ============================================================================

/**
 * Clé de stockage pour le passage au configurateur
 */
export const MULTICOUCHE_BUILDER_STORAGE_KEY = 'cutx_multicouche_builder';

/**
 * Données stockées pour le passage au configurateur
 */
export interface MulticoucheBuilderStorageData {
  modeCollage: ModeCollage;
  couches: BuilderCouche[];
  dimensionsFinales: {
    longueur: number;
    largeur: number;
  };
  chants: ChantsConfig;
  epaisseurTotale: number;
  prixTotal: number;
  chutes: ChutePreview[];
  avecSurcote: boolean;
  surcoteMm: number;
}
