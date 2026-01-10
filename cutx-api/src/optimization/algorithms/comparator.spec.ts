/**
 * Tests unitaires pour le Comparateur d'algorithmes
 */

import {
  comparAlgorithms,
  quickOptimize,
  fullOptimize,
  runAlgorithm,
  runBenchmark,
  AlgorithmConfig,
  ALL_CONFIGS,
  GUILLOTINE_CONFIGS,
  SHELF_CONFIGS,
  MAXRECTS_CONFIGS,
} from './comparator';
import {
  CuttingPiece,
  SourceSheet,
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../types/cutting.types';

// =============================================================================
// HELPERS
// =============================================================================

function createSheet(
  length: number,
  width: number,
  trim = { top: 0, right: 0, bottom: 0, left: 0 },
): SourceSheet {
  return {
    id: 'sheet-1',
    materialRef: 'MEL-WHITE',
    materialName: 'Melamine Blanc',
    dimensions: { length, width },
    trim,
    thickness: 19,
    hasGrain: false,
  };
}

function createPiece(
  id: string,
  length: number,
  width: number,
  quantity = 1,
): CuttingPiece {
  return {
    id,
    name: `Piece ${id}`,
    dimensions: { length, width },
    quantity,
    canRotate: true,
    hasGrain: false,
    expansion: { length: 0, width: 0 },
    priority: 1,
  };
}

// =============================================================================
// TESTS : Configuration
// =============================================================================

describe('Comparator - Configuration', () => {
  test('should have guillotine configs', () => {
    expect(GUILLOTINE_CONFIGS.length).toBeGreaterThan(0);
    GUILLOTINE_CONFIGS.forEach(config => {
      expect(config.algorithm).toBe('guillotine');
    });
  });

  test('should have shelf configs', () => {
    expect(SHELF_CONFIGS.length).toBeGreaterThan(0);
    SHELF_CONFIGS.forEach(config => {
      expect(config.algorithm).toBe('shelf');
    });
  });

  test('should have maxrects configs', () => {
    expect(MAXRECTS_CONFIGS.length).toBeGreaterThan(0);
    MAXRECTS_CONFIGS.forEach(config => {
      expect(config.algorithm).toBe('maxrects');
    });
  });

  test('ALL_CONFIGS should contain all algorithm configs', () => {
    expect(ALL_CONFIGS.length).toBe(
      GUILLOTINE_CONFIGS.length + SHELF_CONFIGS.length + MAXRECTS_CONFIGS.length,
    );
  });
});

// =============================================================================
// TESTS : runAlgorithm
// =============================================================================

describe('Comparator - runAlgorithm', () => {
  test('should run guillotine algorithm', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400)];
    const config: AlgorithmConfig = {
      algorithm: 'guillotine',
      heuristic: 'best_area_fit',
      sortStrategy: 'area_desc',
    };

    const result = runAlgorithm(pieces, sheet, DEFAULT_OPTIMIZATION_PARAMS, config);

    expect(result.config).toEqual(config);
    expect(result.placements).toHaveLength(1);
    expect(result.metrics.placedCount).toBe(1);
    expect(result.metrics.efficiency).toBeGreaterThan(0);
  });

  test('should run shelf algorithm', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400)];
    const config: AlgorithmConfig = {
      algorithm: 'shelf',
      heuristic: 'best_fit',
      sortStrategy: 'height_desc',
    };

    const result = runAlgorithm(pieces, sheet, DEFAULT_OPTIMIZATION_PARAMS, config);

    expect(result.config).toEqual(config);
    expect(result.placements).toHaveLength(1);
    expect(result.metrics.placedCount).toBe(1);
  });

  test('should run maxrects algorithm', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400)];
    const config: AlgorithmConfig = {
      algorithm: 'maxrects',
      heuristic: 'bssf',
      sortStrategy: 'area_desc',
    };

    const result = runAlgorithm(pieces, sheet, DEFAULT_OPTIMIZATION_PARAMS, config);

    expect(result.config).toEqual(config);
    expect(result.placements).toHaveLength(1);
    expect(result.metrics.placedCount).toBe(1);
  });

  test('should expand piece quantities', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400, 3)]; // quantity = 3
    const config: AlgorithmConfig = {
      algorithm: 'maxrects',
      heuristic: 'bssf',
      sortStrategy: 'area_desc',
    };

    const result = runAlgorithm(pieces, sheet, DEFAULT_OPTIMIZATION_PARAMS, config);

    expect(result.placements).toHaveLength(3); // 3 pieces placees
  });

  test('should calculate metrics correctly', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
    ];
    const config: AlgorithmConfig = {
      algorithm: 'maxrects',
      heuristic: 'bssf',
      sortStrategy: 'area_desc',
    };

    const result = runAlgorithm(pieces, sheet, DEFAULT_OPTIMIZATION_PARAMS, config);

    expect(result.metrics.placedCount).toBe(2);
    expect(result.metrics.unplacedCount).toBe(0);
    expect(result.metrics.totalArea).toBe(600 * 400 + 500 * 300);
    expect(result.metrics.wasteArea).toBe(2800 * 2070 - result.metrics.totalArea);
    expect(result.metrics.efficiency).toBeCloseTo(
      (result.metrics.totalArea / (2800 * 2070)) * 100,
      1,
    );
    expect(result.metrics.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// TESTS : comparAlgorithms
// =============================================================================

describe('Comparator - comparAlgorithms', () => {
  test('should compare all provided configs', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
      createPiece('p3', 700, 500),
    ];

    const result = comparAlgorithms(pieces, sheet);

    expect(result.all.length).toBe(ALL_CONFIGS.length);
    expect(result.best).toBeDefined();
    expect(result.summary.totalConfigs).toBe(ALL_CONFIGS.length);
  });

  test('should select best result by placement count first', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
    ];

    const result = comparAlgorithms(pieces, sheet);

    // Le meilleur devrait avoir place toutes les pieces
    expect(result.best.metrics.placedCount).toBe(2);
    expect(result.best.metrics.unplacedCount).toBe(0);
  });

  test('should work with custom configs', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400)];

    const customConfigs: AlgorithmConfig[] = [
      { algorithm: 'guillotine', heuristic: 'best_area_fit', sortStrategy: 'area_desc' },
      { algorithm: 'maxrects', heuristic: 'bssf', sortStrategy: 'area_desc' },
    ];

    const result = comparAlgorithms(pieces, sheet, DEFAULT_OPTIMIZATION_PARAMS, customConfigs);

    expect(result.all.length).toBe(2);
    expect(result.summary.totalConfigs).toBe(2);
  });

  test('should return summary with best algorithm name', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400)];

    const result = comparAlgorithms(pieces, sheet);

    expect(result.summary.bestAlgorithm).toMatch(/\w+\/\w+\/\w+/);
    expect(result.summary.bestEfficiency).toBeGreaterThan(0);
    expect(result.summary.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// TESTS : quickOptimize
// =============================================================================

describe('Comparator - quickOptimize', () => {
  test('should run only 3 configs', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
    ];

    const result = quickOptimize(pieces, sheet);

    expect(result.all.length).toBe(3);
    expect(result.summary.totalConfigs).toBe(3);
  });

  test('should include one config from each algorithm', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400)];

    const result = quickOptimize(pieces, sheet);

    const algorithms = result.all.map(r => r.config.algorithm);
    expect(algorithms).toContain('guillotine');
    expect(algorithms).toContain('shelf');
    expect(algorithms).toContain('maxrects');
  });

  test('should test fewer configs than fullOptimize', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400)];

    const quickResult = quickOptimize(pieces, sheet);
    const fullResult = fullOptimize(pieces, sheet);

    // Quick teste moins de configs (3 vs 19)
    expect(quickResult.summary.totalConfigs).toBeLessThan(fullResult.summary.totalConfigs);
    expect(quickResult.summary.totalConfigs).toBe(3);
    expect(fullResult.summary.totalConfigs).toBe(ALL_CONFIGS.length);
  });
});

// =============================================================================
// TESTS : fullOptimize
// =============================================================================

describe('Comparator - fullOptimize', () => {
  test('should run all configs', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [createPiece('p1', 600, 400)];

    const result = fullOptimize(pieces, sheet);

    expect(result.all.length).toBe(ALL_CONFIGS.length);
  });

  test('should find best configuration', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 800, 600),
      createPiece('p2', 800, 600),
      createPiece('p3', 600, 400),
      createPiece('p4', 600, 400),
    ];

    const result = fullOptimize(pieces, sheet);

    // Le meilleur devrait placer toutes les pieces
    expect(result.best.metrics.placedCount).toBe(4);

    // Verifier que le best est vraiment le meilleur
    for (const r of result.all) {
      if (r.metrics.placedCount === result.best.metrics.placedCount) {
        expect(result.best.metrics.efficiency).toBeGreaterThanOrEqual(r.metrics.efficiency - 0.01);
      }
    }
  });
});

// =============================================================================
// TESTS : runBenchmark
// =============================================================================

describe('Comparator - runBenchmark', () => {
  test('should run benchmark with multiple test cases', () => {
    const testCases = [
      {
        name: 'Small pieces',
        pieces: [
          createPiece('p1', 300, 200),
          createPiece('p2', 300, 200),
        ],
        sheet: createSheet(2800, 2070),
      },
      {
        name: 'Large pieces',
        pieces: [
          createPiece('p1', 800, 600),
          createPiece('p2', 800, 600),
        ],
        sheet: createSheet(2800, 2070),
      },
    ];

    const result = runBenchmark(testCases);

    expect(result.rankings.length).toBeGreaterThan(0);
    expect(result.bestOverall).toBeDefined();
  });

  test('should rank algorithms by efficiency', () => {
    const testCases = [
      {
        name: 'Test case 1',
        pieces: [
          createPiece('p1', 600, 400),
          createPiece('p2', 500, 300),
        ],
        sheet: createSheet(2800, 2070),
      },
    ];

    const result = runBenchmark(testCases);

    // Verifier que les rankings sont tries par efficacite decroissante
    for (let i = 1; i < result.rankings.length; i++) {
      expect(result.rankings[i - 1].avgEfficiency).toBeGreaterThanOrEqual(
        result.rankings[i].avgEfficiency,
      );
    }
  });

  test('should track execution time per algorithm', () => {
    const testCases = [
      {
        name: 'Test',
        pieces: [createPiece('p1', 600, 400)],
        sheet: createSheet(2800, 2070),
      },
    ];

    const result = runBenchmark(testCases);

    result.rankings.forEach(ranking => {
      expect(ranking.avgExecutionTime).toBeGreaterThanOrEqual(0);
      expect(ranking.totalRuns).toBe(1);
    });
  });
});

// =============================================================================
// TESTS : Stress et Performance
// =============================================================================

describe('Comparator - Performance', () => {
  test('quickOptimize should complete in reasonable time with 50 pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 50 }, (_, i) =>
      createPiece(`p${i}`, 200 + (i % 5) * 50, 150 + (i % 3) * 50),
    );

    const startTime = Date.now();
    const result = quickOptimize(pieces, sheet);
    const duration = Date.now() - startTime;

    console.log(`quickOptimize 50 pieces: ${duration}ms, best: ${result.summary.bestAlgorithm} (${result.best.metrics.efficiency.toFixed(1)}%)`);

    expect(duration).toBeLessThan(500);
    expect(result.best.metrics.placedCount).toBeGreaterThan(30);
  });

  test('fullOptimize should complete in reasonable time with 30 pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 30 }, (_, i) =>
      createPiece(`p${i}`, 200 + (i % 5) * 50, 150 + (i % 3) * 50),
    );

    const startTime = Date.now();
    const result = fullOptimize(pieces, sheet);
    const duration = Date.now() - startTime;

    console.log(`fullOptimize 30 pieces (${ALL_CONFIGS.length} configs): ${duration}ms, best: ${result.summary.bestAlgorithm} (${result.best.metrics.efficiency.toFixed(1)}%)`);

    expect(duration).toBeLessThan(2000);
    expect(result.best.metrics.placedCount).toBeGreaterThan(20);
  });
});

// =============================================================================
// TESTS : Cas realistes
// =============================================================================

describe('Comparator - Realistic Cases', () => {
  test('should optimize furniture project', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      // Cotes d'armoire (dimensions realistes pour meuble)
      createPiece('cote_g', 600, 400, 1),
      createPiece('cote_d', 600, 400, 1),
      // Etageres
      createPiece('etagere', 500, 300, 4),
      // Dos
      createPiece('dos', 600, 500, 1),
      // Dessus/Dessous
      createPiece('dessus', 600, 300, 1),
      createPiece('dessous', 600, 300, 1),
    ];

    // Utiliser fullOptimize pour maximiser les chances
    const result = fullOptimize(pieces, sheet);

    console.log(`Furniture project: ${result.best.metrics.placedCount} pieces, ${result.best.metrics.efficiency.toFixed(1)}% efficiency`);

    // La plupart des pieces doivent etre placees (peut necessiter 2 panneaux)
    expect(result.best.metrics.placedCount).toBeGreaterThanOrEqual(9);
    expect(result.best.metrics.efficiency).toBeGreaterThan(25);
  });

  test('should optimize kitchen drawer fronts', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      // Facades de tiroirs (plusieurs tailles)
      createPiece('tiroir_petit', 596, 140, 4),
      createPiece('tiroir_moyen', 596, 280, 2),
      createPiece('tiroir_grand', 596, 420, 2),
      // Portes
      createPiece('porte_basse', 596, 715, 2),
    ];

    const result = quickOptimize(pieces, sheet);

    console.log(`Kitchen fronts: ${result.best.metrics.placedCount} pieces, ${result.best.metrics.efficiency.toFixed(1)}% efficiency`);

    // Toutes les pieces doivent etre placees
    expect(result.best.metrics.placedCount).toBe(10); // 4+2+2+2 = 10
    expect(result.best.metrics.efficiency).toBeGreaterThan(30); // Seuil realiste
  });
});
