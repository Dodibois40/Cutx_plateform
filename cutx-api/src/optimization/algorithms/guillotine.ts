/**
 * CutX Guillotine Cutting Algorithm
 *
 * Algorithme de decoupe guillotine : chaque coupe traverse le panneau
 * de part en part, comme une scie sur rail industrielle.
 *
 * Basé sur :
 * - "A Thousand Ways to Pack the Bin" - Jukka Jylänki (2010)
 * - Algorithmes FFD (First Fit Decreasing) classiques
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CuttingPiece,
  SourceSheet,
  OptimizationParams,
  Placement,
  FreeSpace,
  UsedSheet,
  Cut,
  Dimensions,
  Position,
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../types/cutting.types';
import { getValidOrientations, OrientationResult } from '../utils/grain-utils';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calcule l'aire d'un rectangle
 */
function area(dim: Dimensions): number {
  return dim.length * dim.width;
}

/**
 * Calcule les dimensions finales d'une piece (avec surcotes)
 */
function getFinalDimensions(piece: CuttingPiece): Dimensions {
  return {
    length: piece.dimensions.length + (piece.expansion?.length || 0),
    width: piece.dimensions.width + (piece.expansion?.width || 0),
  };
}

/**
 * Verifie si une piece peut etre placee dans un espace
 */
function canFit(
  piece: Dimensions,
  space: Dimensions,
  bladeWidth: number,
): boolean {
  // La piece + trait de scie doit rentrer dans l'espace
  return piece.length <= space.length && piece.width <= space.width;
}

/**
 * Get orientations that fit in a space, considering grain constraints
 * Uses the grain utilities for proper grain direction handling
 */
function getOrientationsThatFit(
  piece: CuttingPiece,
  sheet: SourceSheet,
  space: Dimensions,
  forceGrainMatch: boolean,
): OrientationResult[] {
  // Get valid orientations based on grain constraints
  const validOrientations = getValidOrientations(piece, sheet, forceGrainMatch);

  // Filter to only those that fit in the space
  return validOrientations.filter(orientation =>
    canFit(orientation.dimensions, space, 0)
  );
}

/**
 * Genere un ID unique pour les espaces libres
 */
function generateSpaceId(): string {
  return `space-${uuidv4().slice(0, 8)}`;
}

// =============================================================================
// SCORING FUNCTIONS (Heuristiques de placement)
// =============================================================================

/**
 * Best Area Fit (BAF) - Minimise l'aire perdue
 */
function scoreBestAreaFit(space: Dimensions, piece: Dimensions): number {
  return area(space) - area(piece);
}

/**
 * Best Short Side Fit (BSSF) - Minimise le plus petit côté restant
 */
function scoreBestShortSideFit(space: Dimensions, piece: Dimensions): number {
  const leftoverX = space.length - piece.length;
  const leftoverY = space.width - piece.width;
  return Math.min(leftoverX, leftoverY);
}

/**
 * Best Long Side Fit (BLSF) - Minimise le plus grand côté restant
 */
function scoreBestLongSideFit(space: Dimensions, piece: Dimensions): number {
  const leftoverX = space.length - piece.length;
  const leftoverY = space.width - piece.width;
  return Math.max(leftoverX, leftoverY);
}

/**
 * Bottom-Left - Priorite aux positions en bas à gauche
 */
function scoreBottomLeft(space: FreeSpace): number {
  return space.position.x + space.position.y;
}

/**
 * Calcule le score selon l'heuristique choisie
 */
function calculateScore(
  space: FreeSpace,
  pieceDim: Dimensions,
  heuristic: string,
): number {
  switch (heuristic) {
    case 'best_area_fit':
      return scoreBestAreaFit(space.dimensions, pieceDim);
    case 'best_short_side_fit':
      return scoreBestShortSideFit(space.dimensions, pieceDim);
    case 'best_long_side_fit':
      return scoreBestLongSideFit(space.dimensions, pieceDim);
    case 'bottom_left':
      return scoreBottomLeft(space);
    default:
      return scoreBestAreaFit(space.dimensions, pieceDim);
  }
}

// =============================================================================
// SPLIT STRATEGIES (Decoupe guillotine)
// =============================================================================

/**
 * Divise un espace apres placement d'une piece
 *
 * Quand on place une piece, on cree 2 nouveaux espaces :
 *
 * HORIZONTAL FIRST:
 * +--------+------------------+
 * | PIECE  |                  |
 * |        |   ESPACE DROITE  |
 * +--------+------------------+
 * |      ESPACE BAS           |
 * +---------------------------+
 *
 * VERTICAL FIRST:
 * +--------+------------------+
 * | PIECE  |                  |
 * +--------+   ESPACE DROITE  |
 * |   E.   |                  |
 * |  BAS   +------------------+
 * +--------+
 */
function splitSpace(
  space: FreeSpace,
  pieceDim: Dimensions,
  bladeWidth: number,
  strategy: string,
  placementId: string,
): FreeSpace[] {
  const newSpaces: FreeSpace[] = [];

  // Dimensions restantes (avec trait de scie)
  const rightWidth = space.dimensions.length - pieceDim.length - bladeWidth;
  const topHeight = space.dimensions.width - pieceDim.width - bladeWidth;

  // Determiner la strategie de split
  let splitHorizontalFirst: boolean;

  switch (strategy) {
    case 'horizontal_first':
      splitHorizontalFirst = true;
      break;
    case 'vertical_first':
      splitHorizontalFirst = false;
      break;
    case 'shorter_leftover':
      // Choisir le split qui minimise le plus petit reste
      splitHorizontalFirst = rightWidth <= topHeight;
      break;
    case 'longer_leftover':
      // Choisir le split qui maximise le plus grand reste
      splitHorizontalFirst = rightWidth > topHeight;
      break;
    case 'min_area':
      // Choisir le split qui minimise l'aire totale des restes
      const areaHorizontal =
        rightWidth * space.dimensions.width +
        (space.dimensions.length - bladeWidth) * topHeight;
      const areaVertical =
        rightWidth * pieceDim.width +
        space.dimensions.length * topHeight;
      splitHorizontalFirst = areaHorizontal <= areaVertical;
      break;
    default:
      splitHorizontalFirst = true;
  }

  if (splitHorizontalFirst) {
    // Espace a droite (toute la hauteur)
    if (rightWidth > 0) {
      newSpaces.push({
        id: generateSpaceId(),
        position: {
          x: space.position.x + pieceDim.length + bladeWidth,
          y: space.position.y,
        },
        dimensions: {
          length: rightWidth,
          width: space.dimensions.width,
        },
        createdBy: placementId,
        splitType: 'vertical',
      });
    }

    // Espace en bas (sous la piece seulement)
    if (topHeight > 0) {
      newSpaces.push({
        id: generateSpaceId(),
        position: {
          x: space.position.x,
          y: space.position.y + pieceDim.width + bladeWidth,
        },
        dimensions: {
          length: pieceDim.length,
          width: topHeight,
        },
        createdBy: placementId,
        splitType: 'horizontal',
      });
    }
  } else {
    // Espace en haut (toute la largeur)
    if (topHeight > 0) {
      newSpaces.push({
        id: generateSpaceId(),
        position: {
          x: space.position.x,
          y: space.position.y + pieceDim.width + bladeWidth,
        },
        dimensions: {
          length: space.dimensions.length,
          width: topHeight,
        },
        createdBy: placementId,
        splitType: 'horizontal',
      });
    }

    // Espace a droite (hauteur de la piece)
    if (rightWidth > 0) {
      newSpaces.push({
        id: generateSpaceId(),
        position: {
          x: space.position.x + pieceDim.length + bladeWidth,
          y: space.position.y,
        },
        dimensions: {
          length: rightWidth,
          width: pieceDim.width,
        },
        createdBy: placementId,
        splitType: 'vertical',
      });
    }
  }

  return newSpaces;
}

// =============================================================================
// SORTING STRATEGIES
// =============================================================================

/**
 * Trie les pieces selon la strategie choisie
 */
export function sortPieces(
  pieces: CuttingPiece[],
  strategy: string,
): CuttingPiece[] {
  const sorted = [...pieces];

  switch (strategy) {
    case 'area_desc':
      sorted.sort((a, b) => {
        const areaA = area(getFinalDimensions(a)) * a.quantity;
        const areaB = area(getFinalDimensions(b)) * b.quantity;
        return areaB - areaA;
      });
      break;

    case 'perimeter_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        const perimA = 2 * (dimA.length + dimA.width);
        const perimB = 2 * (dimB.length + dimB.width);
        return perimB - perimA;
      });
      break;

    case 'max_side_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        const maxA = Math.max(dimA.length, dimA.width);
        const maxB = Math.max(dimB.length, dimB.width);
        return maxB - maxA;
      });
      break;

    case 'width_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        return dimB.width - dimA.width;
      });
      break;

    case 'height_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        return dimB.length - dimA.length;
      });
      break;

    default:
      // Par defaut: aire decroissante
      sorted.sort((a, b) => {
        const areaA = area(getFinalDimensions(a));
        const areaB = area(getFinalDimensions(b));
        return areaB - areaA;
      });
  }

  return sorted;
}

// =============================================================================
// MAIN GUILLOTINE ALGORITHM
// =============================================================================

export interface GuillotineResult {
  placements: Placement[];
  freeSpaces: FreeSpace[];
  cuts: Cut[];
  unplacedPieces: Array<{ piece: CuttingPiece; index: number }>;
}

/**
 * Algorithme de placement guillotine pour un seul panneau
 */
export function guillotinePlacement(
  pieces: Array<{ piece: CuttingPiece; originalIndex: number; originalId: string }>,
  sheet: SourceSheet,
  params: OptimizationParams = DEFAULT_OPTIMIZATION_PARAMS,
): GuillotineResult {
  const placements: Placement[] = [];
  const cuts: Cut[] = [];

  // Calculer les dimensions utilisables (apres trim)
  const usableDimensions: Dimensions = {
    length: sheet.dimensions.length - sheet.trim.left - sheet.trim.right,
    width: sheet.dimensions.width - sheet.trim.top - sheet.trim.bottom,
  };

  // Initialiser avec l'espace total utilisable
  let freeSpaces: FreeSpace[] = [
    {
      id: generateSpaceId(),
      position: {
        x: sheet.trim.left,
        y: sheet.trim.bottom,
      },
      dimensions: usableDimensions,
    },
  ];

  const unplacedPieces: Array<{ piece: CuttingPiece; index: number }> = [];

  // Placer chaque piece
  for (const { piece, originalIndex, originalId } of pieces) {
    // Trouver le meilleur espace pour cette piece
    let bestSpace: FreeSpace | null = null;
    let bestScore = Infinity;
    let bestOrientation: OrientationResult | null = null;
    let bestSpaceIndex = -1;

    for (let i = 0; i < freeSpaces.length; i++) {
      const space = freeSpaces[i];

      // Get orientations that fit in this space (considering grain constraints)
      const fittingOrientations = getOrientationsThatFit(
        piece,
        sheet,
        space.dimensions,
        params.forceGrainMatch,
      );

      // Try each fitting orientation and find the best one
      for (const orientation of fittingOrientations) {
        const score = calculateScore(
          space,
          orientation.dimensions,
          params.placementHeuristic,
        );

        if (score < bestScore) {
          bestScore = score;
          bestSpace = space;
          bestOrientation = orientation;
          bestSpaceIndex = i;
        }
      }
    }

    if (bestSpace && bestSpaceIndex >= 0 && bestOrientation) {
      // Placer la piece avec l'orientation choisie
      const finalDim = bestOrientation.dimensions;
      const placementId = `placement-${originalIndex}`;

      const placement: Placement = {
        pieceId: originalId, // Use original ID for filtering in multi-sheet optimizer
        pieceIndex: originalIndex,
        sheetIndex: 0, // Sera mis a jour plus tard
        position: { ...bestSpace.position },
        rotated: bestOrientation.rotated,
        finalDimensions: finalDim,
        cutDimensions: finalDim, // Pour l'instant identique
      };

      placements.push(placement);

      // Diviser l'espace utilise en nouveaux espaces
      const newSpaces = splitSpace(
        bestSpace,
        finalDim,
        params.bladeWidth,
        params.splitStrategy,
        placementId,
      );

      // Mettre a jour la liste des espaces libres
      freeSpaces.splice(bestSpaceIndex, 1, ...newSpaces);

      // Supprimer les espaces trop petits
      freeSpaces = freeSpaces.filter(
        (space) =>
          space.dimensions.length >= params.minOffcutLength ||
          space.dimensions.width >= params.minOffcutWidth,
      );
    } else {
      // Piece non placee
      unplacedPieces.push({ piece, index: originalIndex });
    }
  }

  // Generer les coupes
  const generatedCuts = generateCuts(placements, sheet, params.bladeWidth);
  cuts.push(...generatedCuts);

  return {
    placements,
    freeSpaces,
    cuts,
    unplacedPieces,
  };
}

// =============================================================================
// CUT GENERATION
// =============================================================================

/**
 * Genere la liste des coupes a partir des placements
 */
function generateCuts(
  placements: Placement[],
  sheet: SourceSheet,
  bladeWidth: number,
): Cut[] {
  const cuts: Cut[] = [];

  if (placements.length === 0) return cuts;

  // Collecter toutes les lignes de coupe uniques
  const horizontalCuts = new Set<number>();
  const verticalCuts = new Set<number>();

  for (const placement of placements) {
    // Coupe verticale a droite de la piece
    const rightEdge = placement.position.x + placement.finalDimensions.length;
    verticalCuts.add(rightEdge);

    // Coupe horizontale au-dessus de la piece
    const topEdge = placement.position.y + placement.finalDimensions.width;
    horizontalCuts.add(topEdge);
  }

  // Convertir en objets Cut
  let sequence = 0;

  for (const pos of Array.from(verticalCuts).sort((a, b) => a - b)) {
    cuts.push({
      sheetIndex: 0,
      direction: 'vertical',
      position: pos,
      startPosition: sheet.trim.bottom,
      endPosition: sheet.dimensions.width - sheet.trim.top,
      length: sheet.dimensions.width - sheet.trim.top - sheet.trim.bottom,
      level: 0,
      sequence: sequence++,
    });
  }

  for (const pos of Array.from(horizontalCuts).sort((a, b) => a - b)) {
    cuts.push({
      sheetIndex: 0,
      direction: 'horizontal',
      position: pos,
      startPosition: sheet.trim.left,
      endPosition: sheet.dimensions.length - sheet.trim.right,
      length: sheet.dimensions.length - sheet.trim.left - sheet.trim.right,
      level: 0,
      sequence: sequence++,
    });
  }

  return cuts;
}

// =============================================================================
// EXPAND QUANTITIES
// =============================================================================

/**
 * Expanse les pieces avec quantite > 1 en pieces individuelles
 */
export interface ExpandedPieceWrapper {
  piece: CuttingPiece;
  originalIndex: number;
  originalId: string; // ID original pour le filtrage
}

export function expandPieceQuantities(
  pieces: CuttingPiece[],
): ExpandedPieceWrapper[] {
  const expanded: ExpandedPieceWrapper[] = [];

  pieces.forEach((piece, index) => {
    for (let i = 0; i < piece.quantity; i++) {
      expanded.push({
        piece: {
          ...piece,
          // Add suffix for quantity > 1 to make IDs unique
          id: piece.quantity > 1 ? `${piece.id}-${i}` : piece.id,
          quantity: 1,
        },
        originalIndex: index,
        originalId: piece.id, // Always store original ID for filtering
      });
    }
  });

  return expanded;
}
