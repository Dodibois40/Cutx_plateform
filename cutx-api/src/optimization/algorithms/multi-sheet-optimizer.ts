/**
 * CutX Multi-Sheet Optimizer
 *
 * Orchestre l'algorithme guillotine sur plusieurs panneaux
 * pour placer toutes les pieces.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  CuttingPiece,
  SourceSheet,
  OptimizationParams,
  CuttingPlan,
  CuttingPlanStats,
  UsedSheet,
  FreeSpace,
  OptimizationError,
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../types/cutting.types';
import {
  guillotinePlacement,
  sortPieces,
  expandPieceQuantities,
} from './guillotine';
import { quickOptimize, fullOptimize, AlgorithmResult } from './comparator';

// =============================================================================
// HELPERS
// =============================================================================

function area(length: number, width: number): number {
  return length * width;
}

function calculateUsableArea(sheet: SourceSheet): number {
  const usableLength = sheet.dimensions.length - sheet.trim.left - sheet.trim.right;
  const usableWidth = sheet.dimensions.width - sheet.trim.top - sheet.trim.bottom;
  return area(usableLength, usableWidth);
}

function calculateSheetCost(sheet: SourceSheet): number {
  if (sheet.pricePerSheet) {
    return sheet.pricePerSheet;
  }
  if (sheet.pricePerM2) {
    const areaM2 = area(sheet.dimensions.length, sheet.dimensions.width) / 1_000_000;
    return areaM2 * sheet.pricePerM2;
  }
  return 0;
}

// =============================================================================
// GROUPING
// =============================================================================

interface PieceGroup {
  key: string;
  pieces: CuttingPiece[];
  sheet: SourceSheet;
}

/**
 * Groupe les pieces par materiau/epaisseur si configure
 */
function groupPiecesByMaterial(
  pieces: CuttingPiece[],
  sheets: SourceSheet[],
  params: OptimizationParams,
): PieceGroup[] {
  // Pour l'instant, on suppose que toutes les pieces vont sur le meme type de panneau
  // Dans une version plus avancee, on pourrait matcher piece.materialRef avec sheet.materialRef

  if (sheets.length === 0) {
    throw new OptimizationError(
      'Aucun panneau source disponible',
      'NO_SHEETS',
    );
  }

  // Utiliser le premier panneau comme reference
  const sheet = sheets[0];

  return [
    {
      key: `${sheet.materialRef}-${sheet.thickness}`,
      pieces,
      sheet,
    },
  ];
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Valide que toutes les pieces peuvent theoriquement rentrer dans un panneau
 */
function validatePieces(
  pieces: CuttingPiece[],
  sheet: SourceSheet,
  params: OptimizationParams,
): void {
  const usableLength = sheet.dimensions.length - sheet.trim.left - sheet.trim.right;
  const usableWidth = sheet.dimensions.width - sheet.trim.top - sheet.trim.bottom;

  for (const piece of pieces) {
    const finalLength = piece.dimensions.length + (piece.expansion?.length || 0);
    const finalWidth = piece.dimensions.width + (piece.expansion?.width || 0);

    // Verifier sans rotation
    const fitsNormal = finalLength <= usableLength && finalWidth <= usableWidth;

    // Verifier avec rotation
    const fitsRotated = piece.canRotate && !params.forceGrainMatch
      ? finalWidth <= usableLength && finalLength <= usableWidth
      : false;

    if (!fitsNormal && !fitsRotated) {
      throw new OptimizationError(
        `La piece "${piece.name}" (${finalLength}x${finalWidth}mm) est trop grande pour le panneau (${usableLength}x${usableWidth}mm)`,
        'PIECE_TOO_LARGE',
        {
          pieceId: piece.id,
          pieceDimensions: { length: finalLength, width: finalWidth },
          sheetDimensions: { length: usableLength, width: usableWidth },
        },
      );
    }

    // Verifier compatibilite grain
    if (params.forceGrainMatch && piece.hasGrain && sheet.hasGrain) {
      // Les directions de grain doivent correspondre ou la piece doit pouvoir tourner
      if (piece.grainDirection !== sheet.grainDirection && !piece.canRotate) {
        throw new OptimizationError(
          `La piece "${piece.name}" a un sens de fil incompatible avec le panneau`,
          'GRAIN_MISMATCH',
          {
            pieceId: piece.id,
            pieceGrain: piece.grainDirection,
            sheetGrain: sheet.grainDirection,
          },
        );
      }
    }
  }
}

// =============================================================================
// MAIN OPTIMIZER
// =============================================================================

export interface OptimizeResult {
  plan: CuttingPlan;
  success: boolean;
  message: string;
}

/**
 * Optimise le placement de toutes les pieces sur plusieurs panneaux
 */
export async function optimizeCuttingPlan(
  pieces: CuttingPiece[],
  sheets: SourceSheet[],
  params: Partial<OptimizationParams> = {},
): Promise<OptimizeResult> {
  const startTime = Date.now();

  // Merge avec les parametres par defaut
  const fullParams: OptimizationParams = {
    ...DEFAULT_OPTIMIZATION_PARAMS,
    ...params,
  };

  // Validation initiale
  if (pieces.length === 0) {
    throw new OptimizationError('Aucune piece a placer', 'NO_PIECES');
  }

  if (sheets.length === 0) {
    throw new OptimizationError('Aucun panneau disponible', 'NO_SHEETS');
  }

  // Grouper par materiau
  const groups = groupPiecesByMaterial(pieces, sheets, fullParams);

  const usedSheets: UsedSheet[] = [];
  let allUnplacedPieces: CuttingPiece[] = [];
  let sheetIndex = 0;

  // Traiter chaque groupe
  for (const group of groups) {
    // Valider les pieces du groupe
    validatePieces(group.pieces, group.sheet, fullParams);

    // Trier les pieces selon la strategie
    const sortedPieces = sortPieces(group.pieces, fullParams.sortingStrategy);

    // Expendre les quantites en pieces individuelles
    const expandedPieces = expandPieceQuantities(sortedPieces);

    let remainingPieces = [...expandedPieces];

    // Placer sur des panneaux jusqu'a ce que tout soit place ou qu'on ne puisse plus
    while (remainingPieces.length > 0) {
      // Verifier le timeout
      if (fullParams.timeoutMs && Date.now() - startTime > fullParams.timeoutMs) {
        throw new OptimizationError(
          'Timeout depassé lors de l\'optimisation',
          'TIMEOUT',
          { elapsedMs: Date.now() - startTime },
        );
      }

      // Placer sur un nouveau panneau
      const result = guillotinePlacement(remainingPieces, group.sheet, fullParams);

      // Mettre a jour l'index du panneau dans les placements
      for (const placement of result.placements) {
        placement.sheetIndex = sheetIndex;
      }

      // Calculer les statistiques du panneau
      const usableArea = calculateUsableArea(group.sheet);
      const usedArea = result.placements.reduce(
        (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
        0,
      );
      const wasteArea = usableArea - usedArea;
      const efficiency = usableArea > 0 ? (usedArea / usableArea) * 100 : 0;

      // Ajouter le panneau utilise
      usedSheets.push({
        index: sheetIndex,
        sheet: group.sheet,
        placements: result.placements,
        freeSpaces: result.freeSpaces,
        cuts: result.cuts.map((c) => ({ ...c, sheetIndex })),
        usedArea,
        wasteArea,
        efficiency,
        usableArea,
        usableDimensions: {
          length: group.sheet.dimensions.length - group.sheet.trim.left - group.sheet.trim.right,
          width: group.sheet.dimensions.width - group.sheet.trim.top - group.sheet.trim.bottom,
        },
      });

      sheetIndex++;

      // Mettre a jour les pieces restantes
      const placedIndices = new Set(result.placements.map((p) => p.pieceIndex));
      remainingPieces = remainingPieces.filter(
        (p) => !placedIndices.has(p.originalIndex),
      );

      // Si aucune piece n'a ete placee, on ne peut plus progresser
      if (result.placements.length === 0) {
        allUnplacedPieces = remainingPieces.map((p) => p.piece);
        break;
      }
    }
  }

  // Calculer les statistiques globales
  const stats = calculateStats(usedSheets, pieces, allUnplacedPieces, fullParams);

  // Filtrer les chutes reutilisables
  const reusableOffcuts = usedSheets.flatMap((s) =>
    s.freeSpaces.filter(
      (space) =>
        space.dimensions.length >= fullParams.minOffcutLength &&
        space.dimensions.width >= fullParams.minOffcutWidth,
    ),
  );

  stats.reusableOffcuts = reusableOffcuts;
  stats.reusableOffcutsArea = reusableOffcuts.reduce(
    (sum, s) => sum + s.dimensions.length * s.dimensions.width,
    0,
  );

  // Construire le plan
  const plan: CuttingPlan = {
    id: uuidv4(),
    createdAt: new Date(),
    params: fullParams,
    sheets: usedSheets,
    unplacedPieces: allUnplacedPieces,
    stats,
  };

  const success = allUnplacedPieces.length === 0;
  const message = success
    ? `Optimisation reussie: ${stats.placedPieces} pieces sur ${stats.totalSheets} panneaux (${stats.globalEfficiency.toFixed(1)}% efficacite)`
    : `Optimisation partielle: ${stats.unplacedPieces} pieces n'ont pas pu etre placees`;

  return { plan, success, message };
}

// =============================================================================
// STATISTICS
// =============================================================================

function calculateStats(
  usedSheets: UsedSheet[],
  allPieces: CuttingPiece[],
  unplacedPieces: CuttingPiece[],
  params: OptimizationParams,
): CuttingPlanStats {
  const totalPieces = allPieces.reduce((sum, p) => sum + p.quantity, 0);
  const placedPieces = totalPieces - unplacedPieces.length;

  const totalSheetArea = usedSheets.reduce(
    (sum, s) => sum + s.sheet.dimensions.length * s.sheet.dimensions.width,
    0,
  );

  const totalUsableArea = usedSheets.reduce((sum, s) => sum + s.usableArea, 0);
  const totalUsedArea = usedSheets.reduce((sum, s) => sum + s.usedArea, 0);
  const totalWasteArea = usedSheets.reduce((sum, s) => sum + s.wasteArea, 0);

  const globalEfficiency =
    totalUsableArea > 0 ? (totalUsedArea / totalUsableArea) * 100 : 0;

  const allCuts = usedSheets.flatMap((s) => s.cuts);
  const horizontalCuts = allCuts.filter((c) => c.direction === 'horizontal').length;
  const verticalCuts = allCuts.filter((c) => c.direction === 'vertical').length;
  const totalCutLength = allCuts.reduce((sum, c) => sum + c.length, 0);

  // Calculer le cout total si les prix sont disponibles
  let totalSheetCost: number | undefined;
  if (usedSheets.every((s) => s.sheet.pricePerSheet || s.sheet.pricePerM2)) {
    totalSheetCost = usedSheets.reduce(
      (sum, s) => sum + calculateSheetCost(s.sheet),
      0,
    );
  }

  return {
    totalPieces,
    placedPieces,
    unplacedPieces: unplacedPieces.length,
    totalSheets: usedSheets.length,
    totalSheetArea,
    totalUsableArea,
    totalUsedArea,
    totalWasteArea,
    globalEfficiency,
    totalCuts: allCuts.length,
    horizontalCuts,
    verticalCuts,
    totalCutLength,
    reusableOffcuts: [],
    reusableOffcutsArea: 0,
    totalSheetCost,
    costPerPiece: totalSheetCost && placedPieces > 0
      ? totalSheetCost / placedPieces
      : undefined,
  };
}

// =============================================================================
// ITERATIVE OPTIMIZATION
// =============================================================================

/**
 * Execute plusieurs iterations avec differentes strategies
 * et garde le meilleur resultat
 *
 * IMPORTANT: Si l'utilisateur a specifié horizontal_first ou vertical_first,
 * on respecte cette contrainte et on ne varie que les autres parametres
 * car ces modes correspondent a des contraintes physiques de decoupe
 */
export async function optimizeWithIterations(
  pieces: CuttingPiece[],
  sheets: SourceSheet[],
  params: Partial<OptimizationParams> = {},
): Promise<OptimizeResult> {
  const fullParams: OptimizationParams = {
    ...DEFAULT_OPTIMIZATION_PARAMS,
    ...params,
  };

  // Verifier si l'utilisateur a demande un mode qui necessite Guillotine
  // - horizontal_first / vertical_first : contrainte de coupe traversante
  // - longer_leftover : optimise les grandes chutes (doit utiliser Guillotine)
  const requiresGuillotine =
    fullParams.splitStrategy === 'horizontal_first' ||
    fullParams.splitStrategy === 'vertical_first' ||
    fullParams.splitStrategy === 'longer_leftover';

  // Strategies a tester
  // Si mode guillotine requis, on garde le splitStrategy de l'utilisateur
  // et on varie seulement sorting et placement
  const strategies: Array<{
    sorting: string;
    placement: string;
    split: string;
  }> = requiresGuillotine
    ? [
        // Mode guillotine: garder le split de l'utilisateur, varier le reste
        {
          sorting: 'area_desc',
          placement: 'best_area_fit',
          split: fullParams.splitStrategy,
        },
        {
          sorting: 'area_desc',
          placement: 'best_short_side_fit',
          split: fullParams.splitStrategy,
        },
        {
          sorting: 'max_side_desc',
          placement: 'bottom_left',
          split: fullParams.splitStrategy,
        },
        {
          sorting: 'perimeter_desc',
          placement: 'best_area_fit',
          split: fullParams.splitStrategy,
        },
      ]
    : [
        // Mode normal: essayer differentes strategies de split
        {
          sorting: 'area_desc',
          placement: 'best_area_fit',
          split: 'shorter_leftover',
        },
        {
          sorting: 'area_desc',
          placement: 'best_short_side_fit',
          split: 'shorter_leftover',
        },
        {
          sorting: 'max_side_desc',
          placement: 'best_area_fit',
          split: 'longer_leftover',
        },
        {
          sorting: 'perimeter_desc',
          placement: 'bottom_left',
          split: 'min_area',
        },
      ];

  let bestResult: OptimizeResult | null = null;

  for (let i = 0; i < Math.min(fullParams.maxIterations, strategies.length); i++) {
    const strategy = strategies[i % strategies.length];

    try {
      const result = await optimizeCuttingPlan(pieces, sheets, {
        ...fullParams,
        sortingStrategy: strategy.sorting as any,
        placementHeuristic: strategy.placement as any,
        splitStrategy: strategy.split as any,
      });

      // Garder le meilleur resultat (moins de panneaux, ou meilleure efficacite)
      if (
        !bestResult ||
        result.plan.stats.totalSheets < bestResult.plan.stats.totalSheets ||
        (result.plan.stats.totalSheets === bestResult.plan.stats.totalSheets &&
          result.plan.stats.globalEfficiency >
            bestResult.plan.stats.globalEfficiency)
      ) {
        bestResult = result;
      }
    } catch (error) {
      // Ignorer les erreurs d'une strategie, essayer la suivante
      console.warn(`Strategy ${i} failed:`, error);
    }
  }

  if (!bestResult) {
    throw new OptimizationError(
      'Aucune strategie n\'a reussi a placer les pieces',
      'NO_PIECES',
    );
  }

  return bestResult;
}

// =============================================================================
// SMART OPTIMIZATION (uses algorithm comparator)
// =============================================================================

/**
 * Optimisation intelligente qui utilise le comparateur d'algorithmes
 * pour trouver la meilleure combinaison algorithme/heuristique
 */
export async function smartOptimize(
  pieces: CuttingPiece[],
  sheets: SourceSheet[],
  params: Partial<OptimizationParams> = {},
  useFullOptimize = false,
): Promise<OptimizeResult> {
  const startTime = Date.now();

  const fullParams: OptimizationParams = {
    ...DEFAULT_OPTIMIZATION_PARAMS,
    ...params,
  };

  // Validation initiale
  if (pieces.length === 0) {
    throw new OptimizationError('Aucune piece a placer', 'NO_PIECES');
  }

  if (sheets.length === 0) {
    throw new OptimizationError('Aucun panneau disponible', 'NO_SHEETS');
  }

  // Grouper par materiau
  const groups = groupPiecesByMaterial(pieces, sheets, fullParams);

  const usedSheets: UsedSheet[] = [];
  let allUnplacedPieces: CuttingPiece[] = [];
  let sheetIndex = 0;

  // Traiter chaque groupe
  for (const group of groups) {
    // Valider les pieces du groupe
    validatePieces(group.pieces, group.sheet, fullParams);

    // Trier les pieces selon la strategie
    const sortedPieces = sortPieces(group.pieces, fullParams.sortingStrategy);

    let remainingPieces = [...sortedPieces];

    // Placer sur des panneaux jusqu'a ce que tout soit place
    while (remainingPieces.length > 0) {
      // Verifier le timeout
      if (fullParams.timeoutMs && Date.now() - startTime > fullParams.timeoutMs) {
        throw new OptimizationError(
          'Timeout depassé lors de l\'optimisation',
          'TIMEOUT',
          { elapsedMs: Date.now() - startTime },
        );
      }

      // Utiliser le comparateur pour trouver le meilleur algorithme
      const comparison = useFullOptimize
        ? fullOptimize(remainingPieces, group.sheet, fullParams)
        : quickOptimize(remainingPieces, group.sheet, fullParams);

      const bestResult = comparison.best;

      // Si aucune piece n'a ete placee, on ne peut plus progresser
      if (bestResult.placements.length === 0) {
        allUnplacedPieces = remainingPieces;
        break;
      }

      // Mettre a jour l'index du panneau dans les placements
      for (const placement of bestResult.placements) {
        placement.sheetIndex = sheetIndex;
      }

      // Calculer les statistiques du panneau
      const usableArea = calculateUsableArea(group.sheet);

      // Ajouter le panneau utilise
      usedSheets.push({
        index: sheetIndex,
        sheet: group.sheet,
        placements: bestResult.placements,
        freeSpaces: bestResult.freeSpaces,
        cuts: bestResult.cuts.map((c) => ({ ...c, sheetIndex })),
        usedArea: bestResult.metrics.totalArea,
        wasteArea: bestResult.metrics.wasteArea,
        efficiency: bestResult.metrics.efficiency,
        usableArea,
        usableDimensions: {
          length: group.sheet.dimensions.length - group.sheet.trim.left - group.sheet.trim.right,
          width: group.sheet.dimensions.width - group.sheet.trim.top - group.sheet.trim.bottom,
        },
        algorithmUsed: comparison.summary.bestAlgorithm, // Track which algorithm was used
      });

      sheetIndex++;

      // Mettre a jour les pieces restantes
      const placedPieceIds = new Set(bestResult.placements.map((p) => p.pieceId));
      remainingPieces = remainingPieces.filter(
        (p) => !placedPieceIds.has(p.id),
      );
    }
  }

  // Calculer les statistiques globales
  const stats = calculateStats(usedSheets, pieces, allUnplacedPieces, fullParams);

  // Filtrer les chutes reutilisables
  const reusableOffcuts = usedSheets.flatMap((s) =>
    s.freeSpaces.filter(
      (space) =>
        space.dimensions.length >= fullParams.minOffcutLength &&
        space.dimensions.width >= fullParams.minOffcutWidth,
    ),
  );

  stats.reusableOffcuts = reusableOffcuts;
  stats.reusableOffcutsArea = reusableOffcuts.reduce(
    (sum, s) => sum + s.dimensions.length * s.dimensions.width,
    0,
  );

  // Construire le plan
  const plan: CuttingPlan = {
    id: uuidv4(),
    createdAt: new Date(),
    params: fullParams,
    sheets: usedSheets,
    unplacedPieces: allUnplacedPieces,
    stats,
  };

  const success = allUnplacedPieces.length === 0;
  const message = success
    ? `Optimisation intelligente reussie: ${stats.placedPieces} pieces sur ${stats.totalSheets} panneaux (${stats.globalEfficiency.toFixed(1)}% efficacite)`
    : `Optimisation partielle: ${stats.unplacedPieces} pieces n'ont pas pu etre placees`;

  return { plan, success, message };
}
