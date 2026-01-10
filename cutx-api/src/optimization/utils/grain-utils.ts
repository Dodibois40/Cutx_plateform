/**
 * CutX Grain Direction Utilities
 *
 * Gestion du sens du fil (veinage) pour l'optimisation de decoupe.
 * Le sens du fil doit etre respecte pour les materiaux comme le bois
 * ou les melamine avec motifs directionnels.
 */

import { CuttingPiece, SourceSheet, Dimensions } from '../types/cutting.types';

// =============================================================================
// TYPES
// =============================================================================

export type GrainAlignment =
  | 'aligned'           // Grain aligns without rotation
  | 'aligned_rotated'   // Grain aligns WITH rotation
  | 'no_grain'          // No grain constraint (either piece or sheet has no grain)
  | 'incompatible';     // Grains cannot be aligned

export interface GrainCheckResult {
  alignment: GrainAlignment;
  mustRotate: boolean;
  canPlace: boolean;
  reason?: string;
}

export interface OrientationResult {
  dimensions: Dimensions;
  rotated: boolean;
  grainAligned: boolean;
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Check grain compatibility between a piece and a sheet
 *
 * Grain directions:
 * - 'length': Le fil suit la longueur (L) du panneau/piece
 * - 'width': Le fil suit la largeur (l) du panneau/piece
 *
 * For alignment, the piece's grain direction (relative to its own L/l)
 * must match the sheet's grain direction (relative to its own L/l).
 * If piece is rotated, its L becomes aligned with sheet's l and vice versa.
 */
export function checkGrainAlignment(
  piece: CuttingPiece,
  sheet: SourceSheet,
  forceGrainMatch: boolean,
): GrainCheckResult {
  // If grain matching is not forced, everything is allowed
  if (!forceGrainMatch) {
    return {
      alignment: 'no_grain',
      mustRotate: false,
      canPlace: true,
      reason: 'Grain matching not enforced',
    };
  }

  // If piece has no grain, it can be placed anywhere
  if (!piece.hasGrain) {
    return {
      alignment: 'no_grain',
      mustRotate: false,
      canPlace: true,
      reason: 'Piece has no grain constraint',
    };
  }

  // If sheet has no grain, piece with grain can be placed in any orientation
  if (!sheet.hasGrain) {
    return {
      alignment: 'no_grain',
      mustRotate: false,
      canPlace: true,
      reason: 'Sheet has no grain - piece can be placed freely',
    };
  }

  // Both have grain - check alignment
  const pieceGrain = piece.grainDirection || 'length'; // Default to length
  const sheetGrain = sheet.grainDirection || 'length';

  // Check if grains align naturally (without rotation)
  // If piece.grainDirection == sheet.grainDirection, they align without rotation
  // because piece's length maps to sheet's horizontal (length) axis
  if (pieceGrain === sheetGrain) {
    return {
      alignment: 'aligned',
      mustRotate: false,
      canPlace: true,
      reason: `Grain aligned: piece ${pieceGrain} matches sheet ${sheetGrain}`,
    };
  }

  // Grains differ - check if rotation would align them
  // When rotated, piece's length axis becomes aligned with sheet's width axis
  // So if piece.grain='length' and we rotate, piece's grain now points along sheet's width
  // This aligns if sheet.grain='width'
  // In other words: after rotation, alignment happens if pieceGrain != sheetGrain
  // which is our case here (we already checked equality above)

  // Can we rotate?
  if (piece.canRotate) {
    return {
      alignment: 'aligned_rotated',
      mustRotate: true,
      canPlace: true,
      reason: `Grain aligned with rotation: piece ${pieceGrain} rotated to match sheet ${sheetGrain}`,
    };
  }

  // Cannot rotate but grains don't match
  return {
    alignment: 'incompatible',
    mustRotate: false,
    canPlace: false,
    reason: `Grain incompatible: piece ${pieceGrain} cannot match sheet ${sheetGrain} (rotation not allowed)`,
  };
}

/**
 * Get all valid orientations for a piece on a sheet, considering grain
 *
 * Returns orientations in order of preference:
 * 1. Non-rotated (if valid)
 * 2. Rotated (if valid)
 */
export function getValidOrientations(
  piece: CuttingPiece,
  sheet: SourceSheet,
  forceGrainMatch: boolean,
): OrientationResult[] {
  const grainCheck = checkGrainAlignment(piece, sheet, forceGrainMatch);
  const orientations: OrientationResult[] = [];

  // Get piece dimensions with expansion
  const baseDimensions: Dimensions = {
    length: piece.dimensions.length + (piece.expansion?.length || 0),
    width: piece.dimensions.width + (piece.expansion?.width || 0),
  };

  if (!grainCheck.canPlace) {
    // No valid orientations
    return [];
  }

  if (grainCheck.alignment === 'no_grain') {
    // No grain constraint - both orientations are valid
    orientations.push({
      dimensions: baseDimensions,
      rotated: false,
      grainAligned: true,
    });

    if (piece.canRotate) {
      orientations.push({
        dimensions: {
          length: baseDimensions.width,
          width: baseDimensions.length,
        },
        rotated: true,
        grainAligned: true,
      });
    }
  } else if (grainCheck.alignment === 'aligned') {
    // Grain aligns without rotation - only non-rotated is valid for grain
    orientations.push({
      dimensions: baseDimensions,
      rotated: false,
      grainAligned: true,
    });

    // If rotation is allowed AND grain is not forced, we could add rotated too
    // But since we're here with grain matching, only the aligned orientation is valid
  } else if (grainCheck.alignment === 'aligned_rotated') {
    // Grain only aligns with rotation - only rotated is valid
    orientations.push({
      dimensions: {
        length: baseDimensions.width,
        width: baseDimensions.length,
      },
      rotated: true,
      grainAligned: true,
    });
  }

  return orientations;
}

/**
 * Check if a piece can be placed on a sheet considering grain constraints only
 * (does not check size)
 */
export function canPlaceWithGrain(
  piece: CuttingPiece,
  sheet: SourceSheet,
  forceGrainMatch: boolean,
): boolean {
  const grainCheck = checkGrainAlignment(piece, sheet, forceGrainMatch);
  return grainCheck.canPlace;
}

/**
 * Filter pieces that can be placed on a specific sheet based on grain
 */
export function filterPiecesByGrain(
  pieces: CuttingPiece[],
  sheet: SourceSheet,
  forceGrainMatch: boolean,
): { compatible: CuttingPiece[]; incompatible: CuttingPiece[] } {
  const compatible: CuttingPiece[] = [];
  const incompatible: CuttingPiece[] = [];

  for (const piece of pieces) {
    if (canPlaceWithGrain(piece, sheet, forceGrainMatch)) {
      compatible.push(piece);
    } else {
      incompatible.push(piece);
    }
  }

  return { compatible, incompatible };
}

/**
 * Group pieces by their grain requirement for optimal sheet assignment
 */
export function groupPiecesByGrain(
  pieces: CuttingPiece[],
): Map<string, CuttingPiece[]> {
  const groups = new Map<string, CuttingPiece[]>();

  for (const piece of pieces) {
    const key = piece.hasGrain
      ? `grain_${piece.grainDirection || 'length'}`
      : 'no_grain';

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(piece);
  }

  return groups;
}
