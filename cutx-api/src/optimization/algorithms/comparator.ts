/**
 * CutX Algorithm Comparator
 *
 * Compare les 3 algorithmes (Guillotine, Shelf, MaxRects) avec differentes
 * heuristiques et retourne le meilleur resultat.
 *
 * Permet aussi de faire un benchmark complet pour analyser les performances.
 */

import {
  CuttingPiece,
  SourceSheet,
  OptimizationParams,
  Placement,
  FreeSpace,
  Cut,
  PlacementHeuristic,
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../types/cutting.types';

import { guillotinePlacement, sortPieces as sortPiecesGuillotine, expandPieceQuantities } from './guillotine';
import { shelfPlacement, sortPiecesForShelf } from './shelf';
import { maxRectsPlacement, sortPiecesForMaxRects } from './maxrects';

// =============================================================================
// TYPES
// =============================================================================

export type AlgorithmType = 'guillotine' | 'shelf' | 'maxrects';

export interface AlgorithmConfig {
  algorithm: AlgorithmType;
  heuristic: string;
  sortStrategy: string;
}

export interface AlgorithmResult {
  config: AlgorithmConfig;
  placements: Placement[];
  freeSpaces: FreeSpace[];
  cuts: Cut[];
  unplacedPieces: Array<{ piece: CuttingPiece; index: number }>;
  metrics: {
    efficiency: number;       // Pourcentage d'aire utilisee
    placedCount: number;      // Nombre de pieces placees
    unplacedCount: number;    // Nombre de pieces non placees
    totalArea: number;        // Aire totale des pieces placees
    wasteArea: number;        // Aire perdue
    executionTimeMs: number;  // Temps d'execution
    freeSpacesCount: number;  // Nombre de chutes utilisables
  };
}

export interface ComparisonResult {
  best: AlgorithmResult;
  all: AlgorithmResult[];
  summary: {
    bestAlgorithm: string;
    bestEfficiency: number;
    totalConfigs: number;
    executionTimeMs: number;
  };
}

// =============================================================================
// CONFIGURATIONS A TESTER
// =============================================================================

const GUILLOTINE_CONFIGS: AlgorithmConfig[] = [
  { algorithm: 'guillotine', heuristic: 'best_area_fit', sortStrategy: 'area_desc' },
  { algorithm: 'guillotine', heuristic: 'best_short_side_fit', sortStrategy: 'area_desc' },
  { algorithm: 'guillotine', heuristic: 'best_long_side_fit', sortStrategy: 'area_desc' },
  { algorithm: 'guillotine', heuristic: 'bottom_left', sortStrategy: 'area_desc' },
  { algorithm: 'guillotine', heuristic: 'best_area_fit', sortStrategy: 'max_side_desc' },
  { algorithm: 'guillotine', heuristic: 'best_area_fit', sortStrategy: 'perimeter_desc' },
];

const SHELF_CONFIGS: AlgorithmConfig[] = [
  { algorithm: 'shelf', heuristic: 'best_fit', sortStrategy: 'height_desc' },
  { algorithm: 'shelf', heuristic: 'first_fit', sortStrategy: 'height_desc' },
  { algorithm: 'shelf', heuristic: 'next_fit', sortStrategy: 'height_desc' },
  { algorithm: 'shelf', heuristic: 'worst_fit', sortStrategy: 'height_desc' },
  { algorithm: 'shelf', heuristic: 'best_fit', sortStrategy: 'area_desc' },
  { algorithm: 'shelf', heuristic: 'best_fit', sortStrategy: 'width_desc' },
];

const MAXRECTS_CONFIGS: AlgorithmConfig[] = [
  { algorithm: 'maxrects', heuristic: 'bssf', sortStrategy: 'area_desc' },
  { algorithm: 'maxrects', heuristic: 'blsf', sortStrategy: 'area_desc' },
  { algorithm: 'maxrects', heuristic: 'baf', sortStrategy: 'area_desc' },
  { algorithm: 'maxrects', heuristic: 'bl', sortStrategy: 'area_desc' },
  { algorithm: 'maxrects', heuristic: 'cp', sortStrategy: 'area_desc' },
  { algorithm: 'maxrects', heuristic: 'bssf', sortStrategy: 'perimeter_desc' },
  { algorithm: 'maxrects', heuristic: 'bssf', sortStrategy: 'max_side_desc' },
];

const ALL_CONFIGS = [...GUILLOTINE_CONFIGS, ...SHELF_CONFIGS, ...MAXRECTS_CONFIGS];

// =============================================================================
// MAIN COMPARATOR
// =============================================================================

/**
 * Compare tous les algorithmes et retourne le meilleur resultat
 *
 * IMPORTANT: Si splitStrategy est 'horizontal_first' ou 'vertical_first',
 * seul l'algorithme Guillotine est utilisé car MaxRects et Shelf
 * ne respectent pas la contrainte de coupe guillotine.
 */
export function comparAlgorithms(
  pieces: CuttingPiece[],
  sheet: SourceSheet,
  params: OptimizationParams = DEFAULT_OPTIMIZATION_PARAMS,
  configs: AlgorithmConfig[] = ALL_CONFIGS,
): ComparisonResult {
  const startTime = Date.now();
  const results: AlgorithmResult[] = [];

  // Calculer l'aire du panneau
  const sheetArea = sheet.dimensions.length * sheet.dimensions.width;

  // IMPORTANT: Certaines strategies necessitent l'algorithme Guillotine
  // car MaxRects et Shelf ignorent le splitStrategy
  //
  // - horizontal_first / vertical_first : contrainte de coupe traversante
  // - longer_leftover : optimise les grandes chutes (Guillotine respecte cette strategie)
  // - shorter_leftover / min_area : tous les algorithmes peuvent etre utilises
  const requiresGuillotine =
    params.splitStrategy === 'horizontal_first' ||
    params.splitStrategy === 'vertical_first' ||
    params.splitStrategy === 'longer_leftover';

  const effectiveConfigs = requiresGuillotine
    ? configs.filter(c => c.algorithm === 'guillotine')
    : configs;

  // Si aucune config Guillotine disponible, utiliser les configs par defaut
  const finalConfigs = effectiveConfigs.length > 0 ? effectiveConfigs : GUILLOTINE_CONFIGS;

  // Executer chaque configuration
  for (const config of finalConfigs) {
    const result = runAlgorithm(pieces, sheet, params, config, sheetArea);
    results.push(result);
  }

  // Trouver le meilleur resultat
  // Critere: maximiser le nombre de pieces placees, puis l'efficacite
  const best = results.reduce((a, b) => {
    if (a.metrics.placedCount !== b.metrics.placedCount) {
      return a.metrics.placedCount > b.metrics.placedCount ? a : b;
    }
    return a.metrics.efficiency > b.metrics.efficiency ? a : b;
  });

  const totalTime = Date.now() - startTime;

  return {
    best,
    all: results,
    summary: {
      bestAlgorithm: `${best.config.algorithm}/${best.config.heuristic}/${best.config.sortStrategy}`,
      bestEfficiency: best.metrics.efficiency,
      totalConfigs: configs.length,
      executionTimeMs: totalTime,
    },
  };
}

/**
 * Execute un seul algorithme avec une configuration donnee
 */
export function runAlgorithm(
  pieces: CuttingPiece[],
  sheet: SourceSheet,
  params: OptimizationParams,
  config: AlgorithmConfig,
  sheetArea?: number,
): AlgorithmResult {
  const startTime = Date.now();
  const calculatedSheetArea = sheetArea ?? sheet.dimensions.length * sheet.dimensions.width;

  // Trier les pieces selon la strategie
  const sortedPieces = sortPiecesForAlgorithm(pieces, config);

  // Expander les quantites (piece avec quantity=3 devient 3 pieces individuelles)
  const expandedPieces = expandPieceQuantities(sortedPieces);

  let placements: Placement[] = [];
  let freeSpaces: FreeSpace[] = [];
  let cuts: Cut[] = [];
  let unplacedPieces: Array<{ piece: CuttingPiece; index: number }> = [];

  // Executer l'algorithme
  switch (config.algorithm) {
    case 'guillotine': {
      const paramsWithHeuristic: OptimizationParams = {
        ...params,
        placementHeuristic: config.heuristic as PlacementHeuristic,
      };
      const result = guillotinePlacement(expandedPieces, sheet, paramsWithHeuristic);
      placements = result.placements;
      freeSpaces = result.freeSpaces;
      cuts = result.cuts;
      unplacedPieces = result.unplacedPieces;
      break;
    }

    case 'shelf': {
      const heuristic = config.heuristic as 'first_fit' | 'best_fit' | 'worst_fit' | 'next_fit';
      const result = shelfPlacement(expandedPieces, sheet, params, heuristic);
      placements = result.placements;
      freeSpaces = result.freeSpaces;
      cuts = result.cuts;
      unplacedPieces = result.unplacedPieces;
      break;
    }

    case 'maxrects': {
      const heuristic = config.heuristic as 'bssf' | 'blsf' | 'baf' | 'bl' | 'cp';
      const result = maxRectsPlacement(expandedPieces, sheet, params, heuristic);
      placements = result.placements;
      freeSpaces = result.freeSpaces;
      cuts = result.cuts;
      unplacedPieces = result.unplacedPieces;
      break;
    }
  }

  const executionTime = Date.now() - startTime;

  // Calculer les metriques
  const totalArea = placements.reduce(
    (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
    0,
  );
  const efficiency = (totalArea / calculatedSheetArea) * 100;

  return {
    config,
    placements,
    freeSpaces,
    cuts,
    unplacedPieces,
    metrics: {
      efficiency,
      placedCount: placements.length,
      unplacedCount: unplacedPieces.length,
      totalArea,
      wasteArea: calculatedSheetArea - totalArea,
      executionTimeMs: executionTime,
      freeSpacesCount: freeSpaces.length,
    },
  };
}

/**
 * Trie les pieces selon l'algorithme et la strategie
 */
function sortPiecesForAlgorithm(
  pieces: CuttingPiece[],
  config: AlgorithmConfig,
): CuttingPiece[] {
  switch (config.algorithm) {
    case 'guillotine':
      return sortPiecesGuillotine(pieces, config.sortStrategy);

    case 'shelf':
      return sortPiecesForShelf(
        pieces,
        config.sortStrategy as 'height_desc' | 'width_desc' | 'area_desc',
      );

    case 'maxrects':
      return sortPiecesForMaxRects(
        pieces,
        config.sortStrategy as 'area_desc' | 'perimeter_desc' | 'max_side_desc',
      );

    default:
      return pieces;
  }
}

// =============================================================================
// QUICK OPTIMIZATION
// =============================================================================

/**
 * Optimisation rapide: teste seulement les meilleures configurations
 *
 * Note: Si splitStrategy est horizontal_first ou vertical_first,
 * seules les configurations Guillotine seront utilisées (filtrage dans comparAlgorithms)
 */
export function quickOptimize(
  pieces: CuttingPiece[],
  sheet: SourceSheet,
  params: OptimizationParams = DEFAULT_OPTIMIZATION_PARAMS,
): ComparisonResult {
  // Configurations optimales pour la plupart des cas
  // Note: comparAlgorithms filtrera automatiquement si horizontal/vertical_first
  const quickConfigs: AlgorithmConfig[] = [
    { algorithm: 'guillotine', heuristic: 'best_area_fit', sortStrategy: 'area_desc' },
    { algorithm: 'guillotine', heuristic: 'best_short_side_fit', sortStrategy: 'area_desc' },
    { algorithm: 'guillotine', heuristic: 'bottom_left', sortStrategy: 'max_side_desc' },
    { algorithm: 'maxrects', heuristic: 'bssf', sortStrategy: 'area_desc' },
    { algorithm: 'shelf', heuristic: 'best_fit', sortStrategy: 'height_desc' },
  ];

  return comparAlgorithms(pieces, sheet, params, quickConfigs);
}

/**
 * Optimisation complete: teste toutes les configurations
 */
export function fullOptimize(
  pieces: CuttingPiece[],
  sheet: SourceSheet,
  params: OptimizationParams = DEFAULT_OPTIMIZATION_PARAMS,
): ComparisonResult {
  return comparAlgorithms(pieces, sheet, params, ALL_CONFIGS);
}

// =============================================================================
// BENCHMARK
// =============================================================================

export interface BenchmarkResult {
  algorithmResults: Map<string, AlgorithmResult[]>;
  rankings: Array<{
    config: string;
    avgEfficiency: number;
    avgPlacedCount: number;
    avgExecutionTime: number;
    totalRuns: number;
  }>;
  bestOverall: string;
}

/**
 * Execute un benchmark complet avec plusieurs jeux de donnees
 */
export function runBenchmark(
  testCases: Array<{
    name: string;
    pieces: CuttingPiece[];
    sheet: SourceSheet;
  }>,
  params: OptimizationParams = DEFAULT_OPTIMIZATION_PARAMS,
): BenchmarkResult {
  const algorithmResults = new Map<string, AlgorithmResult[]>();

  // Initialiser les resultats pour chaque config
  for (const config of ALL_CONFIGS) {
    const key = `${config.algorithm}/${config.heuristic}/${config.sortStrategy}`;
    algorithmResults.set(key, []);
  }

  // Executer chaque cas de test
  for (const testCase of testCases) {
    const comparison = fullOptimize(testCase.pieces, testCase.sheet, params);

    for (const result of comparison.all) {
      const key = `${result.config.algorithm}/${result.config.heuristic}/${result.config.sortStrategy}`;
      algorithmResults.get(key)?.push(result);
    }
  }

  // Calculer les classements
  const rankings: BenchmarkResult['rankings'] = [];

  for (const [config, results] of algorithmResults) {
    if (results.length === 0) continue;

    const avgEfficiency = results.reduce((sum, r) => sum + r.metrics.efficiency, 0) / results.length;
    const avgPlacedCount = results.reduce((sum, r) => sum + r.metrics.placedCount, 0) / results.length;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.metrics.executionTimeMs, 0) / results.length;

    rankings.push({
      config,
      avgEfficiency,
      avgPlacedCount,
      avgExecutionTime,
      totalRuns: results.length,
    });
  }

  // Trier par efficacite moyenne decroissante
  rankings.sort((a, b) => b.avgEfficiency - a.avgEfficiency);

  return {
    algorithmResults,
    rankings,
    bestOverall: rankings[0]?.config || 'none',
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ALL_CONFIGS,
  GUILLOTINE_CONFIGS,
  SHELF_CONFIGS,
  MAXRECTS_CONFIGS,
};
