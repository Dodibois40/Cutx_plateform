/**
 * CutX Cutting Optimization - Type Definitions
 * Based on industry-standard cutting optimization concepts
 */

// =============================================================================
// BASIC TYPES
// =============================================================================

export interface Dimensions {
  length: number; // mm (sens du fil si applicable)
  width: number;  // mm
}

export interface Position {
  x: number; // mm depuis le bord gauche
  y: number; // mm depuis le bord bas
}

export interface Rectangle {
  position: Position;
  dimensions: Dimensions;
}

// =============================================================================
// PIECE A DECOUPER
// =============================================================================

export interface CuttingPiece {
  id: string;
  name: string;
  reference?: string;

  // Dimensions finies (sans surcotes)
  dimensions: Dimensions;
  quantity: number;

  // Contraintes de grain/fil
  hasGrain: boolean;
  grainDirection?: 'length' | 'width'; // Direction du fil sur la piece

  // Rotation
  canRotate: boolean; // Peut-on pivoter la piece de 90 deg ?

  // Surcotes pour usinage
  expansion: {
    length: number; // Surcote sur la longueur (mm)
    width: number;  // Surcote sur la largeur (mm)
  };

  // Chants (pour groupement et affichage)
  edging?: {
    top?: string | null;    // Reference chant haut
    bottom?: string | null; // Reference chant bas
    left?: string | null;   // Reference chant gauche
    right?: string | null;  // Reference chant droite
  };

  // Metadata
  groupId?: string;    // ID du groupe (caisson, meuble...)
  priority?: number;   // Priorite de placement (plus haut = place en premier)
}

// =============================================================================
// PANNEAU SOURCE
// =============================================================================

export interface SourceSheet {
  id: string;
  materialRef: string;
  materialName: string;

  // Dimensions brutes du panneau
  dimensions: Dimensions;
  thickness: number; // Epaisseur (mm)

  // Marges a retirer (bords endommages, placage...)
  trim: {
    top: number;
    left: number;
    bottom: number;
    right: number;
  };

  // Contraintes de grain
  hasGrain: boolean;
  grainDirection?: 'length' | 'width'; // Direction du fil sur le panneau

  // Prix
  pricePerSheet?: number;  // Prix par panneau
  pricePerM2?: number;     // Prix au m2

  // Stock
  availableQuantity?: number; // Nombre de panneaux disponibles

  // Chutes existantes (panneaux partiellement utilises)
  isOffcut?: boolean;
  parentSheetId?: string;
}

// =============================================================================
// PARAMETRES D'OPTIMISATION
// =============================================================================

export type OptimizationType =
  | 'minimize_waste'   // Minimiser les chutes
  | 'minimize_sheets'  // Minimiser le nombre de panneaux
  | 'minimize_cuts';   // Minimiser le nombre de coupes

export type SortingStrategy =
  | 'area_desc'        // Par surface decroissante (FFD)
  | 'perimeter_desc'   // Par perimetre decroissant
  | 'max_side_desc'    // Par plus grand cote decroissant
  | 'width_desc'       // Par largeur decroissante
  | 'height_desc';     // Par hauteur decroissante

export type PlacementHeuristic =
  | 'best_area_fit'       // Minimiser l'aire perdue
  | 'best_short_side_fit' // Minimiser le plus petit cote restant
  | 'best_long_side_fit'  // Minimiser le plus grand cote restant
  | 'bottom_left'         // Placer en bas a gauche
  | 'contact_point';      // Maximiser les points de contact

export type SplitStrategy =
  | 'horizontal_first'    // Coupe horizontale d'abord
  | 'vertical_first'      // Coupe verticale d'abord
  | 'shorter_leftover'    // Minimiser le plus petit reste
  | 'longer_leftover'     // Maximiser le plus grand reste
  | 'min_area';           // Minimiser l'aire totale des restes

export interface OptimizationParams {
  // Trait de scie
  bladeWidth: number; // mm (typiquement 3-4mm)

  // Type d'optimisation
  optimizationType: OptimizationType;

  // Strategies
  sortingStrategy: SortingStrategy;
  placementHeuristic: PlacementHeuristic;
  splitStrategy: SplitStrategy;

  // Iterations
  maxIterations: number;      // Nombre d'essais avec rotations differentes
  timeoutMs?: number;         // Timeout en ms

  // Gestion des chutes
  reuseOffcuts: boolean;      // Reutiliser les chutes existantes
  minOffcutLength: number;    // Longueur min pour garder une chute (mm)
  minOffcutWidth: number;     // Largeur min pour garder une chute (mm)

  // Contraintes supplementaires
  forceGrainMatch: boolean;   // Forcer le respect du sens du fil
  allowRotation: boolean;     // Autoriser la rotation globalement

  // Groupement
  groupByMaterial: boolean;   // Grouper par materiau
  groupByThickness: boolean;  // Grouper par epaisseur
  groupByEdging: boolean;     // Grouper par chants
}

export const DEFAULT_OPTIMIZATION_PARAMS: OptimizationParams = {
  bladeWidth: 4,
  optimizationType: 'minimize_waste',
  sortingStrategy: 'area_desc',
  placementHeuristic: 'best_area_fit',
  splitStrategy: 'shorter_leftover',
  maxIterations: 3,
  timeoutMs: 30000,
  reuseOffcuts: false,
  minOffcutLength: 300,
  minOffcutWidth: 100,
  forceGrainMatch: true,
  allowRotation: true,
  groupByMaterial: true,
  groupByThickness: true,
  groupByEdging: false,
};

// =============================================================================
// RESULTAT DE PLACEMENT
// =============================================================================

export interface Placement {
  pieceId: string;
  pieceIndex: number;         // Index dans la liste des pieces
  sheetIndex: number;         // Index du panneau utilise

  position: Position;         // Position sur le panneau
  rotated: boolean;           // Piece pivotee de 90 deg ?

  // Dimensions finales (avec surcotes)
  finalDimensions: Dimensions;

  // Dimensions de decoupe (avec trait de scie si applicable)
  cutDimensions: Dimensions;
}

// =============================================================================
// ESPACE LIBRE (pour l'algorithme)
// =============================================================================

export interface FreeSpace extends Rectangle {
  id: string;

  // Pour le debug
  createdBy?: string;         // ID du placement qui a cree cet espace
  splitType?: 'horizontal' | 'vertical';
}

// =============================================================================
// COUPE
// =============================================================================

export type CutDirection = 'horizontal' | 'vertical';

export interface Cut {
  sheetIndex: number;
  direction: CutDirection;

  // Position de la coupe
  position: number;           // mm depuis le bord (gauche ou bas)

  // Etendue de la coupe
  startPosition: number;      // Debut de la coupe
  endPosition: number;        // Fin de la coupe
  length: number;             // Longueur totale

  // Pour l'ordre des coupes
  level: number;              // Niveau de decoupe (0 = coupe principale)
  sequence: number;           // Ordre dans le niveau
}

// =============================================================================
// PANNEAU UTILISE (avec placements)
// =============================================================================

export interface UsedSheet {
  index: number;
  sheet: SourceSheet;

  // Placements sur ce panneau
  placements: Placement[];

  // Espaces libres restants (chutes)
  freeSpaces: FreeSpace[];

  // Coupes a effectuer
  cuts: Cut[];

  // Statistiques
  usedArea: number;           // mm2
  wasteArea: number;          // mm2
  efficiency: number;         // % (0-100)

  // Surface utilisable (apres trim)
  usableArea: number;         // mm2
  usableDimensions: Dimensions;

  // Algorithme utilise (si smartOptimize)
  algorithmUsed?: string;     // ex: "maxrects/bssf/area_desc"
}

// =============================================================================
// PLAN DE DECOUPE COMPLET
// =============================================================================

export interface CuttingPlan {
  id: string;
  createdAt: Date;

  // Parametres utilises
  params: OptimizationParams;

  // Panneaux utilises
  sheets: UsedSheet[];

  // Pieces non placees (si manque de panneaux)
  unplacedPieces: CuttingPiece[];

  // Statistiques globales
  stats: CuttingPlanStats;
}

export interface CuttingPlanStats {
  // Quantites
  totalPieces: number;
  placedPieces: number;
  unplacedPieces: number;

  totalSheets: number;

  // Surfaces (mm2)
  totalSheetArea: number;     // Surface totale des panneaux
  totalUsableArea: number;    // Surface utilisable (apres trim)
  totalUsedArea: number;      // Surface des pieces placees
  totalWasteArea: number;     // Surface perdue

  // Efficacite
  globalEfficiency: number;   // % (pieces / utilisable)

  // Coupes
  totalCuts: number;
  horizontalCuts: number;
  verticalCuts: number;
  totalCutLength: number;     // mm

  // Chutes reutilisables
  reusableOffcuts: FreeSpace[];
  reusableOffcutsArea: number;

  // Prix (si disponible)
  totalSheetCost?: number;
  costPerPiece?: number;
}

// =============================================================================
// ERRORS
// =============================================================================

export class OptimizationError extends Error {
  constructor(
    message: string,
    public code: OptimizationErrorCode,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'OptimizationError';
  }
}

export type OptimizationErrorCode =
  | 'NO_PIECES'
  | 'NO_SHEETS'
  | 'PIECE_TOO_LARGE'
  | 'GRAIN_MISMATCH'
  | 'TIMEOUT'
  | 'INVALID_PARAMS';
