/**
 * CutX Optimization Algorithms
 *
 * Export centralisé de tous les algorithmes d'optimisation de découpe.
 *
 * 3 algorithmes disponibles:
 * - Guillotine: coupes traversantes, bon pour la précision industrielle
 * - Shelf (FFDH): placement en étagères, simple et rapide
 * - MaxRects: rectangles maximaux, le plus efficace en général
 *
 * + Comparateur pour tester et sélectionner le meilleur algorithme
 */

// Algorithme Guillotine
export {
  guillotinePlacement,
  sortPieces as sortPiecesGuillotine,
  expandPieceQuantities,
} from './guillotine';
export type { GuillotineResult } from './guillotine';

// Algorithme Shelf (FFDH)
export {
  shelfPlacement,
  sortPiecesForShelf,
  expandPieceQuantities as expandPieceQuantitiesShelf,
} from './shelf';
export type { ShelfResult } from './shelf';

// Algorithme MaxRects
export {
  maxRectsPlacement,
  sortPiecesForMaxRects,
  expandPieceQuantities as expandPieceQuantitiesMaxRects,
} from './maxrects';
export type { MaxRectsResult } from './maxrects';

// Comparateur multi-algorithmes
export {
  comparAlgorithms,
  quickOptimize,
  fullOptimize,
  runAlgorithm,
  runBenchmark,
  ALL_CONFIGS,
  GUILLOTINE_CONFIGS,
  SHELF_CONFIGS,
  MAXRECTS_CONFIGS,
} from './comparator';
export type {
  AlgorithmType,
  AlgorithmConfig,
  AlgorithmResult,
  ComparisonResult,
  BenchmarkResult,
} from './comparator';
