/**
 * CutX MaxRects Algorithm
 *
 * Algorithme MaxRects : maintient une liste de rectangles libres maximaux
 * et place chaque piece dans le meilleur rectangle disponible.
 *
 * C'est generalement l'algorithme le plus efficace pour le bin packing 2D.
 *
 * Reference: "A Thousand Ways to Pack the Bin" - Jukka Jylänki (2010)
 *
 * Heuristiques disponibles:
 * - BSSF (Best Short Side Fit): minimise le plus petit cote restant
 * - BLSF (Best Long Side Fit): minimise le plus grand cote restant
 * - BAF (Best Area Fit): minimise l'aire perdue
 * - BL (Bottom-Left): privilegie les positions en bas a gauche
 * - CP (Contact Point): maximise le perimetre de contact
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CuttingPiece,
  SourceSheet,
  OptimizationParams,
  Placement,
  FreeSpace,
  Cut,
  Dimensions,
  Position,
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../types/cutting.types';
import { getValidOrientations, OrientationResult } from '../utils/grain-utils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Rectangle libre (free rectangle)
 */
interface FreeRect {
  x: number;
  y: number;
  width: number;  // Dimension horizontale (length dans notre systeme)
  height: number; // Dimension verticale (width dans notre systeme)
}

/**
 * Resultat d'un placement potentiel
 */
interface PlacementCandidate {
  rect: FreeRect;
  rectIndex: number;
  rotated: boolean;
  score1: number;
  score2: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function getFinalDimensions(piece: CuttingPiece): Dimensions {
  return {
    length: piece.dimensions.length + (piece.expansion?.length || 0),
    width: piece.dimensions.width + (piece.expansion?.width || 0),
  };
}

function generateId(): string {
  return `maxrects-${uuidv4().slice(0, 8)}`;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Best Short Side Fit (BSSF)
 * Minimise le plus petit cote restant apres placement
 */
function scoreBSSF(rect: FreeRect, pieceWidth: number, pieceHeight: number): [number, number] {
  const leftoverHoriz = rect.width - pieceWidth;
  const leftoverVert = rect.height - pieceHeight;
  const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
  const longSideFit = Math.max(leftoverHoriz, leftoverVert);
  return [shortSideFit, longSideFit];
}

/**
 * Best Long Side Fit (BLSF)
 * Minimise le plus grand cote restant apres placement
 */
function scoreBLSF(rect: FreeRect, pieceWidth: number, pieceHeight: number): [number, number] {
  const leftoverHoriz = rect.width - pieceWidth;
  const leftoverVert = rect.height - pieceHeight;
  const longSideFit = Math.max(leftoverHoriz, leftoverVert);
  const shortSideFit = Math.min(leftoverHoriz, leftoverVert);
  return [longSideFit, shortSideFit];
}

/**
 * Best Area Fit (BAF)
 * Minimise l'aire perdue apres placement
 */
function scoreBAF(rect: FreeRect, pieceWidth: number, pieceHeight: number): [number, number] {
  const areaFit = rect.width * rect.height - pieceWidth * pieceHeight;
  const shortSideFit = Math.min(rect.width - pieceWidth, rect.height - pieceHeight);
  return [areaFit, shortSideFit];
}

/**
 * Bottom-Left (BL)
 * Privilegie les positions en bas a gauche
 */
function scoreBL(rect: FreeRect, pieceHeight: number): [number, number] {
  return [rect.y + pieceHeight, rect.x];
}

/**
 * Contact Point (CP)
 * Maximise le perimetre de contact avec les bords ou autres pieces
 * (simplifie: on utilise la position pour approximer)
 */
function scoreCP(
  rect: FreeRect,
  pieceWidth: number,
  pieceHeight: number,
  sheetWidth: number,
  sheetHeight: number,
): [number, number] {
  let score = 0;
  // Contact avec le bord gauche
  if (rect.x === 0) score += pieceHeight;
  // Contact avec le bord bas
  if (rect.y === 0) score += pieceWidth;
  // Contact avec le bord droit
  if (rect.x + pieceWidth === sheetWidth) score += pieceHeight;
  // Contact avec le bord haut
  if (rect.y + pieceHeight === sheetHeight) score += pieceWidth;

  return [-score, rect.y]; // Negatif car on veut maximiser
}

// =============================================================================
// MAXRECTS ALGORITHM
// =============================================================================

export interface MaxRectsResult {
  placements: Placement[];
  freeRects: FreeRect[];
  freeSpaces: FreeSpace[];
  cuts: Cut[];
  unplacedPieces: Array<{ piece: CuttingPiece; index: number }>;
}

/**
 * Algorithme MaxRects
 */
export function maxRectsPlacement(
  pieces: Array<{ piece: CuttingPiece; originalIndex: number; originalId: string }>,
  sheet: SourceSheet,
  params: OptimizationParams = DEFAULT_OPTIMIZATION_PARAMS,
  heuristic: 'bssf' | 'blsf' | 'baf' | 'bl' | 'cp' = 'bssf',
): MaxRectsResult {
  const placements: Placement[] = [];
  const cuts: Cut[] = [];
  const unplacedPieces: Array<{ piece: CuttingPiece; index: number }> = [];

  // Calculer les dimensions utilisables (apres trim)
  const usableWidth = sheet.dimensions.length - sheet.trim.left - sheet.trim.right;
  const usableHeight = sheet.dimensions.width - sheet.trim.top - sheet.trim.bottom;

  // Initialiser avec un seul grand rectangle libre
  let freeRects: FreeRect[] = [{
    x: sheet.trim.left,
    y: sheet.trim.bottom,
    width: usableWidth,
    height: usableHeight,
  }];

  // Placer chaque piece
  for (const { piece, originalIndex, originalId } of pieces) {
    // Get valid orientations based on grain constraints
    const validOrientations = getValidOrientations(piece, sheet, params.forceGrainMatch);

    // Skip piece if no valid orientations (grain incompatibility)
    if (validOrientations.length === 0) {
      unplacedPieces.push({ piece, index: originalIndex });
      continue;
    }

    // Trouver le meilleur placement parmi les orientations valides
    const candidate = findBestPlacementWithOrientations(
      freeRects,
      validOrientations,
      params.bladeWidth,
      heuristic,
      usableWidth,
      usableHeight,
    );

    if (candidate) {
      // Placer la piece
      const placement: Placement = {
        pieceId: originalId, // Use original ID for filtering
        pieceIndex: originalIndex,
        sheetIndex: 0,
        position: { x: candidate.rect.x, y: candidate.rect.y },
        rotated: candidate.rotated,
        finalDimensions: {
          length: candidate.dimensions.length,
          width: candidate.dimensions.width,
        },
        cutDimensions: {
          length: candidate.dimensions.length,
          width: candidate.dimensions.width,
        },
      };

      placements.push(placement);

      // Diviser les rectangles libres
      freeRects = splitFreeRects(
        freeRects,
        candidate.rect.x,
        candidate.rect.y,
        candidate.dimensions.length + params.bladeWidth,
        candidate.dimensions.width + params.bladeWidth,
      );

      // Supprimer les rectangles trop petits
      freeRects = freeRects.filter(
        r => r.width >= params.minOffcutLength || r.height >= params.minOffcutWidth,
      );
    } else {
      unplacedPieces.push({ piece, index: originalIndex });
    }
  }

  // Convertir freeRects en FreeSpace
  // NOTE: On retourne TOUTES les chutes ici (même les petites) pour l'affichage visuel
  // Le filtrage des chutes "réutilisables" se fait plus tard dans multi-sheet-optimizer
  const freeSpaces: FreeSpace[] = freeRects.map(r => ({
    id: generateId(),
    position: { x: r.x, y: r.y },
    dimensions: { length: r.width, width: r.height },
  }));

  // Generer les coupes
  const generatedCuts = generateCuts(placements, sheet, params.bladeWidth);
  cuts.push(...generatedCuts);

  return {
    placements,
    freeRects,
    freeSpaces,
    cuts,
    unplacedPieces,
  };
}

/**
 * Extended placement candidate with dimensions
 */
interface PlacementCandidateWithDimensions extends PlacementCandidate {
  dimensions: Dimensions;
}

/**
 * Trouve le meilleur emplacement pour une piece parmi les orientations valides
 * Utilise les orientations pre-calculees par les grain utilities
 */
function findBestPlacementWithOrientations(
  freeRects: FreeRect[],
  orientations: OrientationResult[],
  bladeWidth: number,
  heuristic: string,
  sheetWidth: number,
  sheetHeight: number,
): PlacementCandidateWithDimensions | null {
  let bestCandidate: PlacementCandidateWithDimensions | null = null;
  let bestScore1 = Infinity;
  let bestScore2 = Infinity;

  for (let i = 0; i < freeRects.length; i++) {
    const rect = freeRects[i];

    // Try each valid orientation
    for (const orientation of orientations) {
      const pieceWidth = orientation.dimensions.length;
      const pieceHeight = orientation.dimensions.width;

      // Check if this orientation fits in this rect
      if (pieceWidth <= rect.width && pieceHeight <= rect.height) {
        const [score1, score2] = calculateScore(
          rect, pieceWidth, pieceHeight, heuristic, sheetWidth, sheetHeight,
        );

        if (score1 < bestScore1 || (score1 === bestScore1 && score2 < bestScore2)) {
          bestScore1 = score1;
          bestScore2 = score2;
          bestCandidate = {
            rect,
            rectIndex: i,
            rotated: orientation.rotated,
            score1,
            score2,
            dimensions: orientation.dimensions,
          };
        }
      }
    }
  }

  return bestCandidate;
}

/**
 * Trouve le meilleur emplacement pour une piece (version originale)
 * @deprecated Use findBestPlacementWithOrientations for grain-aware placement
 */
function findBestPlacement(
  freeRects: FreeRect[],
  pieceWidth: number,
  pieceHeight: number,
  canRotate: boolean,
  bladeWidth: number,
  heuristic: string,
  sheetWidth: number,
  sheetHeight: number,
): PlacementCandidate | null {
  let bestCandidate: PlacementCandidate | null = null;
  let bestScore1 = Infinity;
  let bestScore2 = Infinity;

  for (let i = 0; i < freeRects.length; i++) {
    const rect = freeRects[i];

    // Essayer sans rotation
    if (pieceWidth <= rect.width && pieceHeight <= rect.height) {
      const [score1, score2] = calculateScore(
        rect, pieceWidth, pieceHeight, heuristic, sheetWidth, sheetHeight,
      );

      if (score1 < bestScore1 || (score1 === bestScore1 && score2 < bestScore2)) {
        bestScore1 = score1;
        bestScore2 = score2;
        bestCandidate = { rect, rectIndex: i, rotated: false, score1, score2 };
      }
    }

    // Essayer avec rotation
    if (canRotate && pieceHeight <= rect.width && pieceWidth <= rect.height) {
      const [score1, score2] = calculateScore(
        rect, pieceHeight, pieceWidth, heuristic, sheetWidth, sheetHeight,
      );

      if (score1 < bestScore1 || (score1 === bestScore1 && score2 < bestScore2)) {
        bestScore1 = score1;
        bestScore2 = score2;
        bestCandidate = { rect, rectIndex: i, rotated: true, score1, score2 };
      }
    }
  }

  return bestCandidate;
}

/**
 * Calcule le score selon l'heuristique
 */
function calculateScore(
  rect: FreeRect,
  pieceWidth: number,
  pieceHeight: number,
  heuristic: string,
  sheetWidth: number,
  sheetHeight: number,
): [number, number] {
  switch (heuristic) {
    case 'bssf':
      return scoreBSSF(rect, pieceWidth, pieceHeight);
    case 'blsf':
      return scoreBLSF(rect, pieceWidth, pieceHeight);
    case 'baf':
      return scoreBAF(rect, pieceWidth, pieceHeight);
    case 'bl':
      return scoreBL(rect, pieceHeight);
    case 'cp':
      return scoreCP(rect, pieceWidth, pieceHeight, sheetWidth, sheetHeight);
    default:
      return scoreBSSF(rect, pieceWidth, pieceHeight);
  }
}

/**
 * Divise les rectangles libres apres placement d'une piece
 *
 * Principe MaxRects: quand on place une piece, on genere de nouveaux
 * rectangles maximaux qui ne chevauchent pas la piece.
 */
function splitFreeRects(
  freeRects: FreeRect[],
  placedX: number,
  placedY: number,
  placedWidth: number,
  placedHeight: number,
): FreeRect[] {
  const newRects: FreeRect[] = [];

  for (const rect of freeRects) {
    // Verifier si le rectangle chevauche la piece placee
    if (!intersects(rect, placedX, placedY, placedWidth, placedHeight)) {
      newRects.push(rect);
      continue;
    }

    // Generer jusqu'a 4 nouveaux rectangles maximaux

    // Rectangle a gauche
    if (placedX > rect.x) {
      newRects.push({
        x: rect.x,
        y: rect.y,
        width: placedX - rect.x,
        height: rect.height,
      });
    }

    // Rectangle a droite
    if (placedX + placedWidth < rect.x + rect.width) {
      newRects.push({
        x: placedX + placedWidth,
        y: rect.y,
        width: rect.x + rect.width - (placedX + placedWidth),
        height: rect.height,
      });
    }

    // Rectangle en bas
    if (placedY > rect.y) {
      newRects.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: placedY - rect.y,
      });
    }

    // Rectangle en haut
    if (placedY + placedHeight < rect.y + rect.height) {
      newRects.push({
        x: rect.x,
        y: placedY + placedHeight,
        width: rect.width,
        height: rect.y + rect.height - (placedY + placedHeight),
      });
    }
  }

  // Supprimer les rectangles contenus dans d'autres (garder seulement les maximaux)
  return pruneContainedRects(newRects);
}

/**
 * Verifie si un rectangle chevauche une zone
 */
function intersects(
  rect: FreeRect,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return !(
    rect.x >= x + width ||
    rect.x + rect.width <= x ||
    rect.y >= y + height ||
    rect.y + rect.height <= y
  );
}

/**
 * Supprime les rectangles contenus dans d'autres
 * (optimisation importante pour MaxRects)
 */
function pruneContainedRects(rects: FreeRect[]): FreeRect[] {
  const result: FreeRect[] = [];

  for (let i = 0; i < rects.length; i++) {
    let isContained = false;

    for (let j = 0; j < rects.length; j++) {
      if (i === j) continue;

      if (isContainedIn(rects[i], rects[j])) {
        isContained = true;
        break;
      }
    }

    if (!isContained) {
      result.push(rects[i]);
    }
  }

  return result;
}

/**
 * Verifie si rect1 est contenu dans rect2
 */
function isContainedIn(rect1: FreeRect, rect2: FreeRect): boolean {
  return (
    rect1.x >= rect2.x &&
    rect1.y >= rect2.y &&
    rect1.x + rect1.width <= rect2.x + rect2.width &&
    rect1.y + rect1.height <= rect2.y + rect2.height
  );
}

// =============================================================================
// CUT GENERATION
// =============================================================================

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
    verticalCuts.add(placement.position.x + placement.finalDimensions.length);
    horizontalCuts.add(placement.position.y + placement.finalDimensions.width);
  }

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
// SORTING (similaire aux autres algos)
// =============================================================================

export function sortPiecesForMaxRects(
  pieces: CuttingPiece[],
  strategy: 'area_desc' | 'perimeter_desc' | 'max_side_desc' = 'area_desc',
): CuttingPiece[] {
  const sorted = [...pieces];

  switch (strategy) {
    case 'area_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        return (dimB.length * dimB.width) - (dimA.length * dimA.width);
      });
      break;

    case 'perimeter_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        return (2 * (dimB.length + dimB.width)) - (2 * (dimA.length + dimA.width));
      });
      break;

    case 'max_side_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        return Math.max(dimB.length, dimB.width) - Math.max(dimA.length, dimA.width);
      });
      break;
  }

  return sorted;
}

export interface ExpandedPieceWrapper {
  piece: CuttingPiece;
  originalIndex: number;
  originalId: string;
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
