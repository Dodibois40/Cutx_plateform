/**
 * CutX Shelf Cutting Algorithm (FFDH - First Fit Decreasing Height)
 *
 * Algorithme de placement en etageres: on cree des rangees horizontales
 * et on place les pieces de gauche a droite sur chaque etagere.
 *
 * Avantages:
 * - Simple et rapide
 * - Bon pour pieces de hauteurs similaires
 * - Facile a visualiser et couper
 *
 * Inconvenients:
 * - Perte de place en haut des etageres courtes
 * - Moins optimal que Guillotine pour pieces variees
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
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../types/cutting.types';
import { getValidOrientations, OrientationResult } from '../utils/grain-utils';

// =============================================================================
// TYPES SPECIFIQUES SHELF
// =============================================================================

/**
 * Une etagere (shelf) horizontale
 */
interface Shelf {
  id: string;
  y: number;            // Position Y (debut de l'etagere)
  height: number;       // Hauteur de l'etagere (= hauteur de la premiere piece)
  usedWidth: number;    // Largeur deja utilisee
  availableWidth: number; // Largeur encore disponible
  placements: Placement[]; // Pieces placees sur cette etagere
}

// =============================================================================
// HELPERS
// =============================================================================

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
 * Verifie si une piece rentre sur une etagere
 */
function fitsOnShelf(
  pieceDim: Dimensions,
  shelf: Shelf,
  bladeWidth: number,
): boolean {
  // Verifie si la piece rentre en largeur (longueur disponible)
  const neededWidth = shelf.usedWidth > 0
    ? pieceDim.length + bladeWidth // Avec trait de scie si pas premiere piece
    : pieceDim.length;

  // La piece doit rentrer en largeur ET en hauteur
  return (
    neededWidth <= shelf.availableWidth &&
    pieceDim.width <= shelf.height
  );
}

/**
 * Verifie si une piece peut creer une nouvelle etagere
 */
function canCreateShelf(
  pieceDim: Dimensions,
  currentY: number,
  sheetHeight: number,
  sheetWidth: number,
  bladeWidth: number,
): boolean {
  return (
    currentY + pieceDim.width <= sheetHeight &&
    pieceDim.length <= sheetWidth
  );
}

/**
 * Genere un ID unique
 */
function generateId(): string {
  return `shelf-${uuidv4().slice(0, 8)}`;
}

// =============================================================================
// SHELF ALGORITHM
// =============================================================================

export interface ShelfResult {
  placements: Placement[];
  shelves: Shelf[];
  freeSpaces: FreeSpace[];
  cuts: Cut[];
  unplacedPieces: Array<{ piece: CuttingPiece; index: number }>;
}

/**
 * Algorithme de placement Shelf (FFDH)
 *
 * Strategies de placement:
 * - first_fit: premiere etagere qui convient
 * - best_fit: etagere avec le moins de place perdue en hauteur
 * - worst_fit: etagere avec le plus de place (pour garder de l'espace)
 * - next_fit: toujours sur la derniere etagere (plus simple)
 */
export function shelfPlacement(
  pieces: Array<{ piece: CuttingPiece; originalIndex: number; originalId: string }>,
  sheet: SourceSheet,
  params: OptimizationParams = DEFAULT_OPTIMIZATION_PARAMS,
  strategy: 'first_fit' | 'best_fit' | 'worst_fit' | 'next_fit' = 'best_fit',
): ShelfResult {
  const placements: Placement[] = [];
  const shelves: Shelf[] = [];
  const cuts: Cut[] = [];
  const unplacedPieces: Array<{ piece: CuttingPiece; index: number }> = [];

  // Calculer les dimensions utilisables (apres trim)
  const usableDimensions: Dimensions = {
    length: sheet.dimensions.length - sheet.trim.left - sheet.trim.right,
    width: sheet.dimensions.width - sheet.trim.top - sheet.trim.bottom,
  };

  // Position Y courante (debut de la prochaine etagere potentielle)
  let currentY = sheet.trim.bottom;
  const startX = sheet.trim.left;

  // Placer chaque piece
  for (const { piece, originalIndex, originalId } of pieces) {
    let placed = false;

    // Get valid orientations based on grain constraints
    const validOrientations = getValidOrientations(piece, sheet, params.forceGrainMatch);

    // Skip piece if no valid orientations (grain incompatibility)
    if (validOrientations.length === 0) {
      unplacedPieces.push({ piece, index: originalIndex });
      continue;
    }

    // Essayer chaque orientation valide
    for (const orientation of validOrientations) {
      if (placed) break;

      const dim = orientation.dimensions;
      const rotated = orientation.rotated;

      // Selon la strategie, chercher une etagere existante
      let targetShelf: Shelf | null = null;
      let targetShelfIndex = -1;

      switch (strategy) {
        case 'next_fit':
          // Seulement la derniere etagere
          if (shelves.length > 0) {
            const lastShelf = shelves[shelves.length - 1];
            if (fitsOnShelf(dim, lastShelf, params.bladeWidth)) {
              targetShelf = lastShelf;
              targetShelfIndex = shelves.length - 1;
            }
          }
          break;

        case 'first_fit':
          // Premiere etagere qui convient
          for (let i = 0; i < shelves.length; i++) {
            if (fitsOnShelf(dim, shelves[i], params.bladeWidth)) {
              targetShelf = shelves[i];
              targetShelfIndex = i;
              break;
            }
          }
          break;

        case 'best_fit':
          // Etagere avec le moins de place perdue en hauteur
          let bestWaste = Infinity;
          for (let i = 0; i < shelves.length; i++) {
            if (fitsOnShelf(dim, shelves[i], params.bladeWidth)) {
              const waste = shelves[i].height - dim.width;
              if (waste < bestWaste) {
                bestWaste = waste;
                targetShelf = shelves[i];
                targetShelfIndex = i;
              }
            }
          }
          break;

        case 'worst_fit':
          // Etagere avec le plus de place restante
          let maxSpace = -1;
          for (let i = 0; i < shelves.length; i++) {
            if (fitsOnShelf(dim, shelves[i], params.bladeWidth)) {
              if (shelves[i].availableWidth > maxSpace) {
                maxSpace = shelves[i].availableWidth;
                targetShelf = shelves[i];
                targetShelfIndex = i;
              }
            }
          }
          break;
      }

      // Placer sur l'etagere trouvee
      if (targetShelf) {
        const x = startX + targetShelf.usedWidth +
          (targetShelf.usedWidth > 0 ? params.bladeWidth : 0);

        const placement: Placement = {
          pieceId: originalId, // Use original ID for filtering
          pieceIndex: originalIndex,
          sheetIndex: 0,
          position: { x, y: targetShelf.y },
          rotated,
          finalDimensions: dim,
          cutDimensions: dim,
        };

        placements.push(placement);
        targetShelf.placements.push(placement);

        // Mettre a jour l'etagere
        const addedWidth = dim.length + (targetShelf.usedWidth > 0 ? params.bladeWidth : 0);
        targetShelf.usedWidth += addedWidth;
        targetShelf.availableWidth -= addedWidth;

        placed = true;
      }
      // Sinon, essayer de creer une nouvelle etagere
      else if (canCreateShelf(
        dim,
        currentY,
        sheet.trim.bottom + usableDimensions.width,
        usableDimensions.length,
        params.bladeWidth,
      )) {
        // Ajouter le trait de scie si ce n'est pas la premiere etagere
        const shelfY = shelves.length > 0
          ? currentY + params.bladeWidth
          : currentY;

        const newShelf: Shelf = {
          id: generateId(),
          y: shelfY,
          height: dim.width, // La hauteur de l'etagere = hauteur de la premiere piece
          usedWidth: dim.length,
          availableWidth: usableDimensions.length - dim.length,
          placements: [],
        };

        const placement: Placement = {
          pieceId: originalId, // Use original ID for filtering
          pieceIndex: originalIndex,
          sheetIndex: 0,
          position: { x: startX, y: shelfY },
          rotated,
          finalDimensions: dim,
          cutDimensions: dim,
        };

        placements.push(placement);
        newShelf.placements.push(placement);
        shelves.push(newShelf);

        // Mettre a jour la position Y pour la prochaine etagere
        currentY = shelfY + newShelf.height;

        placed = true;
      }
    }

    if (!placed) {
      unplacedPieces.push({ piece, index: originalIndex });
    }
  }

  // Generer les espaces libres
  const freeSpaces = generateFreeSpaces(
    shelves,
    sheet,
    usableDimensions,
    currentY,
    params.minOffcutLength,
    params.minOffcutWidth,
  );

  // Generer les coupes
  const generatedCuts = generateCuts(shelves, sheet, params.bladeWidth);
  cuts.push(...generatedCuts);

  return {
    placements,
    shelves,
    freeSpaces,
    cuts,
    unplacedPieces,
  };
}

// =============================================================================
// FREE SPACES
// =============================================================================

/**
 * Genere les espaces libres (chutes) a partir des etageres
 */
function generateFreeSpaces(
  shelves: Shelf[],
  sheet: SourceSheet,
  usableDimensions: Dimensions,
  lastShelfEndY: number,
  minLength: number,
  minWidth: number,
): FreeSpace[] {
  const freeSpaces: FreeSpace[] = [];
  const startX = sheet.trim.left;

  // Espace libre a droite de chaque etagere
  for (const shelf of shelves) {
    if (shelf.availableWidth >= minLength && shelf.height >= minWidth) {
      freeSpaces.push({
        id: `space-${shelf.id}-right`,
        position: {
          x: startX + shelf.usedWidth,
          y: shelf.y,
        },
        dimensions: {
          length: shelf.availableWidth,
          width: shelf.height,
        },
        createdBy: shelf.id,
        splitType: 'horizontal',
      });
    }
  }

  // Espace libre en haut (au-dessus de la derniere etagere)
  const topSpaceHeight = sheet.trim.bottom + usableDimensions.width - lastShelfEndY;
  if (topSpaceHeight >= minWidth && usableDimensions.length >= minLength) {
    freeSpaces.push({
      id: 'space-top',
      position: {
        x: startX,
        y: lastShelfEndY,
      },
      dimensions: {
        length: usableDimensions.length,
        width: topSpaceHeight,
      },
    });
  }

  return freeSpaces;
}

// =============================================================================
// CUT GENERATION
// =============================================================================

/**
 * Genere les coupes pour l'algorithme Shelf
 *
 * Coupes horizontales entre chaque etagere
 * Coupes verticales a la fin de chaque piece
 */
function generateCuts(
  shelves: Shelf[],
  sheet: SourceSheet,
  bladeWidth: number,
): Cut[] {
  const cuts: Cut[] = [];
  let sequence = 0;

  // Coupes horizontales (entre les etageres)
  for (let i = 1; i < shelves.length; i++) {
    const shelf = shelves[i];
    cuts.push({
      sheetIndex: 0,
      direction: 'horizontal',
      position: shelf.y - bladeWidth / 2,
      startPosition: sheet.trim.left,
      endPosition: sheet.dimensions.length - sheet.trim.right,
      length: sheet.dimensions.length - sheet.trim.left - sheet.trim.right,
      level: 0,
      sequence: sequence++,
    });
  }

  // Coupes verticales (entre les pieces de chaque etagere)
  for (const shelf of shelves) {
    let currentX = sheet.trim.left;
    for (let i = 0; i < shelf.placements.length; i++) {
      const placement = shelf.placements[i];
      currentX += placement.finalDimensions.length;

      // Coupe verticale apres chaque piece (sauf la derniere si elle va jusqu'au bord)
      if (i < shelf.placements.length - 1 || shelf.availableWidth > 0) {
        cuts.push({
          sheetIndex: 0,
          direction: 'vertical',
          position: currentX + bladeWidth / 2,
          startPosition: shelf.y,
          endPosition: shelf.y + shelf.height,
          length: shelf.height,
          level: 1,
          sequence: sequence++,
        });
      }
      currentX += bladeWidth;
    }
  }

  return cuts;
}

// =============================================================================
// SORTING (reutilise les memes strategies que Guillotine)
// =============================================================================

/**
 * Trie les pieces par hauteur decroissante (meilleur pour Shelf)
 */
export function sortPiecesForShelf(
  pieces: CuttingPiece[],
  strategy: 'height_desc' | 'width_desc' | 'area_desc' = 'height_desc',
): CuttingPiece[] {
  const sorted = [...pieces];

  switch (strategy) {
    case 'height_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        // Trier par width (hauteur dans notre systeme)
        if (dimB.width !== dimA.width) return dimB.width - dimA.width;
        // Puis par longueur
        return dimB.length - dimA.length;
      });
      break;

    case 'width_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        return dimB.length - dimA.length;
      });
      break;

    case 'area_desc':
      sorted.sort((a, b) => {
        const dimA = getFinalDimensions(a);
        const dimB = getFinalDimensions(b);
        return (dimB.length * dimB.width) - (dimA.length * dimA.width);
      });
      break;
  }

  return sorted;
}

/**
 * Expanse les pieces avec quantite > 1 en pieces individuelles
 */
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
