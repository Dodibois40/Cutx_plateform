/**
 * Tests unitaires pour le Multi-Sheet Optimizer
 * Inclut smartOptimize et gestion du grain
 */

import {
  optimizeCuttingPlan,
  optimizeWithIterations,
  smartOptimize,
  OptimizeResult,
} from './multi-sheet-optimizer';
import {
  CuttingPiece,
  SourceSheet,
  OptimizationParams,
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../types/cutting.types';

// =============================================================================
// HELPERS
// =============================================================================

function createSheet(
  length: number,
  width: number,
  options: Partial<SourceSheet> = {},
): SourceSheet {
  return {
    id: 'sheet-1',
    materialRef: 'MEL-001',
    materialName: 'Melamine White',
    dimensions: { length, width },
    thickness: 19,
    trim: { top: 0, right: 0, bottom: 0, left: 0 },
    hasGrain: false,
    ...options,
  };
}

function createPiece(
  id: string,
  length: number,
  width: number,
  options: Partial<CuttingPiece> = {},
): CuttingPiece {
  return {
    id,
    name: `Piece ${id}`,
    dimensions: { length, width },
    quantity: 1,
    canRotate: true,
    hasGrain: false,
    expansion: { length: 0, width: 0 },
    ...options,
  };
}

function createParams(overrides: Partial<OptimizationParams> = {}): OptimizationParams {
  return {
    ...DEFAULT_OPTIMIZATION_PARAMS,
    ...overrides,
  };
}

// =============================================================================
// TESTS : smartOptimize - Base
// =============================================================================

describe('Multi-Sheet Optimizer - smartOptimize', () => {
  test('should optimize simple pieces', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
    ];

    const result = await smartOptimize(pieces, [sheet]);

    expect(result.success).toBe(true);
    expect(result.plan.stats.placedPieces).toBe(2);
    expect(result.plan.stats.totalSheets).toBe(1);
  });

  test('should track algorithm used for each sheet', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
    ];

    const result = await smartOptimize(pieces, [sheet]);

    expect(result.plan.sheets[0].algorithmUsed).toBeDefined();
    expect(result.plan.sheets[0].algorithmUsed).toMatch(/\w+\/\w+\/\w+/);
  });

  test('should use fullOptimize when flag is set', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
    ];

    const resultQuick = await smartOptimize(pieces, [sheet], {}, false);
    const resultFull = await smartOptimize(pieces, [sheet], {}, true);

    // Both should succeed
    expect(resultQuick.success).toBe(true);
    expect(resultFull.success).toBe(true);

    // Both track algorithm
    expect(resultQuick.plan.sheets[0].algorithmUsed).toBeDefined();
    expect(resultFull.plan.sheets[0].algorithmUsed).toBeDefined();
  });

  test('should handle multiple sheets when needed', async () => {
    const sheet = createSheet(800, 600);
    const pieces = [
      createPiece('p1', 700, 500),  // Takes most of sheet 1
      createPiece('p2', 700, 500),  // Needs sheet 2
      createPiece('p3', 700, 500),  // Needs sheet 3
    ];

    const result = await smartOptimize(pieces, [sheet]);

    expect(result.success).toBe(true);
    expect(result.plan.stats.placedPieces).toBe(3);
    expect(result.plan.stats.totalSheets).toBe(3);

    // Each sheet should track its algorithm
    result.plan.sheets.forEach(s => {
      expect(s.algorithmUsed).toBeDefined();
    });
  });
});

// =============================================================================
// TESTS : Grain Direction (sens du fil)
// =============================================================================

describe('Multi-Sheet Optimizer - Grain Direction', () => {
  test('should respect grain when forceGrainMatch is true', async () => {
    const sheet = createSheet(2800, 2070, {
      hasGrain: true,
      grainDirection: 'length',
    });

    const pieces = [
      createPiece('p1', 600, 400, {
        hasGrain: true,
        grainDirection: 'length',
        canRotate: false, // Cannot rotate due to grain
      }),
    ];

    const params = createParams({ forceGrainMatch: true });
    const result = await smartOptimize(pieces, [sheet], params);

    expect(result.success).toBe(true);
    // Piece should not be rotated since grains must match
    expect(result.plan.sheets[0].placements[0].rotated).toBe(false);
  });

  test('should allow rotation when forceGrainMatch is false', async () => {
    const sheet = createSheet(2800, 2070, {
      hasGrain: true,
      grainDirection: 'length',
    });

    // Piece that fits better rotated
    const pieces = [
      createPiece('p1', 2000, 800, {
        hasGrain: true,
        grainDirection: 'width', // Different from sheet
        canRotate: true,
      }),
    ];

    const params = createParams({ forceGrainMatch: false });
    const result = await smartOptimize(pieces, [sheet], params);

    expect(result.success).toBe(true);
    expect(result.plan.stats.placedPieces).toBe(1);
  });

  test('should fail validation when grain is incompatible', async () => {
    const sheet = createSheet(2800, 2070, {
      hasGrain: true,
      grainDirection: 'length',
    });

    const pieces = [
      createPiece('p1', 600, 400, {
        hasGrain: true,
        grainDirection: 'width', // Incompatible
        canRotate: false, // Cannot rotate
      }),
    ];

    const params = createParams({ forceGrainMatch: true });

    await expect(smartOptimize(pieces, [sheet], params)).rejects.toThrow(
      /sens de fil incompatible/,
    );
  });

  test('should allow compatible grain with rotation', async () => {
    const sheet = createSheet(2800, 2070, {
      hasGrain: true,
      grainDirection: 'length',
    });

    const pieces = [
      createPiece('p1', 600, 400, {
        hasGrain: true,
        grainDirection: 'width', // Different but can rotate
        canRotate: true,
      }),
    ];

    const params = createParams({ forceGrainMatch: true });

    // Should succeed because rotation aligns the grain
    const result = await smartOptimize(pieces, [sheet], params);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// TESTS : optimizeCuttingPlan
// =============================================================================

describe('Multi-Sheet Optimizer - optimizeCuttingPlan', () => {
  test('should optimize basic pieces', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
      createPiece('p3', 400, 350),
    ];

    const result = await optimizeCuttingPlan(pieces, [sheet]);

    expect(result.success).toBe(true);
    expect(result.plan.stats.placedPieces).toBe(3);
    expect(result.plan.stats.totalSheets).toBe(1);
  });

  test('should throw on empty pieces', async () => {
    const sheet = createSheet(2800, 2070);

    await expect(optimizeCuttingPlan([], [sheet])).rejects.toThrow(
      /Aucune piece/,
    );
  });

  test('should throw on empty sheets', async () => {
    const pieces = [createPiece('p1', 600, 400)];

    await expect(optimizeCuttingPlan(pieces, [])).rejects.toThrow(
      /Aucun panneau/,
    );
  });

  test('should throw on piece too large', async () => {
    const sheet = createSheet(800, 600);
    const pieces = [
      createPiece('p1', 1000, 800), // Too large
    ];

    await expect(optimizeCuttingPlan(pieces, [sheet])).rejects.toThrow(
      /trop grande/,
    );
  });

  test('should handle piece quantities', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400, { quantity: 5 }),
    ];

    const result = await optimizeCuttingPlan(pieces, [sheet]);

    expect(result.success).toBe(true);
    expect(result.plan.stats.placedPieces).toBe(5);
  });

  test('should calculate statistics correctly', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 600, 400),
      createPiece('p2', 500, 300),
    ];

    const result = await optimizeCuttingPlan(pieces, [sheet]);

    const stats = result.plan.stats;
    expect(stats.totalPieces).toBe(2);
    expect(stats.placedPieces).toBe(2);
    expect(stats.unplacedPieces).toBe(0);
    expect(stats.totalUsedArea).toBe(600 * 400 + 500 * 300);
    expect(stats.globalEfficiency).toBeGreaterThan(0);
  });
});

// =============================================================================
// TESTS : optimizeWithIterations
// =============================================================================

describe('Multi-Sheet Optimizer - optimizeWithIterations', () => {
  test('should try multiple strategies', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 800, 600),
      createPiece('p2', 700, 500),
      createPiece('p3', 600, 400),
      createPiece('p4', 500, 350),
    ];

    const result = await optimizeWithIterations(pieces, [sheet], {
      maxIterations: 4,
    });

    expect(result.success).toBe(true);
    expect(result.plan.stats.placedPieces).toBe(4);
  });

  test('should find better solution than single run', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 10 }, (_, i) =>
      createPiece(`p${i}`, 400 + (i % 3) * 100, 300 + (i % 4) * 50),
    );

    const singleResult = await optimizeCuttingPlan(pieces, [sheet]);
    const iterResult = await optimizeWithIterations(pieces, [sheet], {
      maxIterations: 4,
    });

    // Iterative should be at least as good
    expect(iterResult.plan.stats.globalEfficiency).toBeGreaterThanOrEqual(
      singleResult.plan.stats.globalEfficiency - 1, // Allow small variance
    );
  });
});

// =============================================================================
// TESTS : Trim Management
// =============================================================================

describe('Multi-Sheet Optimizer - Trim', () => {
  test('should account for trim in usable area', async () => {
    const sheet = createSheet(2800, 2070, {
      trim: { top: 10, right: 10, bottom: 10, left: 10 },
    });

    const pieces = [createPiece('p1', 2780, 2050)];

    const result = await smartOptimize(pieces, [sheet]);

    expect(result.success).toBe(true);
    // Usable dimensions should be 2780 x 2050
    expect(result.plan.sheets[0].usableDimensions.length).toBe(2780);
    expect(result.plan.sheets[0].usableDimensions.width).toBe(2050);
  });

  test('should reject piece that exceeds usable area after trim', async () => {
    const sheet = createSheet(2800, 2070, {
      trim: { top: 100, right: 100, bottom: 100, left: 100 },
    });

    // Usable is now 2600 x 1870
    const pieces = [createPiece('p1', 2700, 1800)]; // Too large

    await expect(smartOptimize(pieces, [sheet])).rejects.toThrow(
      /trop grande/,
    );
  });
});

// =============================================================================
// TESTS : Offcuts Management
// =============================================================================

describe('Multi-Sheet Optimizer - Offcuts', () => {
  test('should track reusable offcuts', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 1000, 1000), // Uses quarter of sheet
    ];

    const params = createParams({
      minOffcutLength: 300,
      minOffcutWidth: 100,
    });

    const result = await smartOptimize(pieces, [sheet], params);

    expect(result.success).toBe(true);
    // Should have reusable offcuts
    expect(result.plan.stats.reusableOffcuts.length).toBeGreaterThan(0);
    expect(result.plan.stats.reusableOffcutsArea).toBeGreaterThan(0);
  });

  test('should filter small offcuts', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('p1', 2700, 2000), // Uses most of sheet
    ];

    const params = createParams({
      minOffcutLength: 500,  // High threshold
      minOffcutWidth: 500,
    });

    const result = await smartOptimize(pieces, [sheet], params);

    expect(result.success).toBe(true);
    // Small offcuts should be filtered out
    result.plan.stats.reusableOffcuts.forEach(offcut => {
      expect(offcut.dimensions.length).toBeGreaterThanOrEqual(500);
      expect(offcut.dimensions.width).toBeGreaterThanOrEqual(500);
    });
  });
});

// =============================================================================
// TESTS : Realistic Scenarios
// =============================================================================

describe('Multi-Sheet Optimizer - Realistic Scenarios', () => {
  test('should optimize kitchen cabinet parts', async () => {
    const sheet = createSheet(2800, 2070, {
      hasGrain: true,
      grainDirection: 'length',
    });

    const pieces = [
      // Cotes (sides)
      createPiece('cote_g', 720, 560, { quantity: 2, hasGrain: true, grainDirection: 'length' }),
      // Etageres (shelves)
      createPiece('etagere', 548, 500, { quantity: 4, hasGrain: false }),
      // Dos (back)
      createPiece('dos', 720, 550, { quantity: 1, hasGrain: true, grainDirection: 'length' }),
    ];

    const result = await smartOptimize(pieces, [sheet], { forceGrainMatch: true });

    expect(result.success).toBe(true);
    expect(result.plan.stats.placedPieces).toBe(7); // 2 + 4 + 1
  });

  test('should optimize drawer fronts efficiently', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      createPiece('tiroir_petit', 596, 140, { quantity: 8 }),
      createPiece('tiroir_moyen', 596, 280, { quantity: 4 }),
      createPiece('tiroir_grand', 596, 420, { quantity: 2 }),
    ];

    const result = await smartOptimize(pieces, [sheet]);

    expect(result.success).toBe(true);
    expect(result.plan.stats.placedPieces).toBe(14); // 8 + 4 + 2
    expect(result.plan.stats.globalEfficiency).toBeGreaterThan(25); // Reasonable efficiency
  });
});

// =============================================================================
// TESTS : Performance
// =============================================================================

describe('Multi-Sheet Optimizer - Performance', () => {
  test('smartOptimize should complete in reasonable time with 50 pieces', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 50 }, (_, i) =>
      createPiece(`p${i}`, 200 + (i % 5) * 50, 150 + (i % 3) * 50),
    );

    const startTime = Date.now();
    const result = await smartOptimize(pieces, [sheet]);
    const duration = Date.now() - startTime;

    console.log(`smartOptimize 50 pieces: ${duration}ms, efficiency: ${result.plan.stats.globalEfficiency.toFixed(1)}%`);

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    expect(result.plan.stats.placedPieces).toBeGreaterThan(30);
  });

  test('smartOptimize with fullOptimize should still be reasonably fast', async () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 30 }, (_, i) =>
      createPiece(`p${i}`, 200 + (i % 5) * 50, 150 + (i % 3) * 50),
    );

    const startTime = Date.now();
    const result = await smartOptimize(pieces, [sheet], {}, true); // fullOptimize
    const duration = Date.now() - startTime;

    console.log(`smartOptimize (full) 30 pieces: ${duration}ms, efficiency: ${result.plan.stats.globalEfficiency.toFixed(1)}%`);

    expect(duration).toBeLessThan(3000);
    expect(result.plan.stats.placedPieces).toBeGreaterThan(20);
  });
});
