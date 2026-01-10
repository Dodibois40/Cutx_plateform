/**
 * Tests unitaires pour l'algorithme MaxRects
 */

import {
  maxRectsPlacement,
  MaxRectsResult,
  sortPiecesForMaxRects,
  expandPieceQuantities,
} from './maxrects';
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
    priority: 1,
    ...options,
  };
}

function createParams(overrides: Partial<OptimizationParams> = {}): OptimizationParams {
  return {
    ...DEFAULT_OPTIMIZATION_PARAMS,
    ...overrides,
  };
}

// Helper to wrap pieces with originalId for maxRectsPlacement
function wrapPieces(pieces: Array<{ piece: CuttingPiece; originalIndex: number }>): Array<{ piece: CuttingPiece; originalIndex: number; originalId: string }> {
  return pieces.map(p => ({ ...p, originalId: p.piece.id }));
}

// =============================================================================
// TESTS : Placement de base
// =============================================================================

describe('MaxRects Algorithm - Basic Placement', () => {
  test('should place a single piece', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(1);
    expect(result.unplacedPieces).toHaveLength(0);
    expect(result.placements[0].position.x).toBe(0);
    expect(result.placements[0].position.y).toBe(0);
  });

  test('should place multiple pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 500, 300), originalIndex: 1 },
      { piece: createPiece('p3', 700, 500), originalIndex: 2 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(3);
    expect(result.unplacedPieces).toHaveLength(0);
  });

  test('should handle empty pieces array', () => {
    const sheet = createSheet(2800, 2070);
    const pieces: Array<{ piece: CuttingPiece; originalIndex: number }> = [];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(0);
  });

  test('should not overlap pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
      { piece: createPiece('p3', 600, 400), originalIndex: 2 },
      { piece: createPiece('p4', 600, 400), originalIndex: 3 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    // Verifier qu'aucune piece ne chevauche une autre
    for (let i = 0; i < result.placements.length; i++) {
      for (let j = i + 1; j < result.placements.length; j++) {
        const p1 = result.placements[i];
        const p2 = result.placements[j];

        const noOverlap =
          p1.position.x + p1.finalDimensions.length <= p2.position.x ||
          p2.position.x + p2.finalDimensions.length <= p1.position.x ||
          p1.position.y + p1.finalDimensions.width <= p2.position.y ||
          p2.position.y + p2.finalDimensions.width <= p1.position.y;

        expect(noOverlap).toBe(true);
      }
    }
  });
});

// =============================================================================
// TESTS : Pieces trop grandes
// =============================================================================

describe('MaxRects Algorithm - Oversized Pieces', () => {
  test('should not place piece larger than sheet', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [{ piece: createPiece('p1', 3000, 400), originalIndex: 0 }];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });

  test('should not place piece taller than sheet', () => {
    const sheet = createSheet(2800, 2070);
    // Piece that is taller than sheet and cannot rotate
    const pieces = [{ piece: createPiece('p1', 600, 2500, { canRotate: false }), originalIndex: 0 }];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });

  test('should place piece that fits exactly', () => {
    const sheet = createSheet(600, 400);
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(1);
    expect(result.unplacedPieces).toHaveLength(0);
  });
});

// =============================================================================
// TESTS : Rotation
// =============================================================================

describe('MaxRects Algorithm - Rotation', () => {
  test('should rotate piece if it fits better', () => {
    const sheet = createSheet(500, 700);
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const params = createParams({ forceGrainMatch: false });
    const result = maxRectsPlacement(wrapPieces(pieces), sheet, params);

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].rotated).toBe(true);
    expect(result.placements[0].finalDimensions.length).toBe(400);
    expect(result.placements[0].finalDimensions.width).toBe(600);
  });

  test('should not rotate piece when canRotate is false', () => {
    const sheet = createSheet(500, 2070);
    const pieces = [{
      piece: createPiece('p1', 600, 400, { canRotate: false }),
      originalIndex: 0,
    }];

    const params = createParams({ forceGrainMatch: false });
    const result = maxRectsPlacement(wrapPieces(pieces), sheet, params);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });

  test('should respect grain direction when forceGrainMatch is true', () => {
    // Sheet with grain along length
    const sheet: SourceSheet = {
      ...createSheet(500, 700),
      hasGrain: true,
      grainDirection: 'length',
    };
    // Piece with grain along length - matches sheet, so rotation NOT allowed
    // Piece is 600x400 which doesn't fit (600 > 500), and rotation is blocked by grain
    const pieces = [{
      piece: createPiece('p1', 600, 400, {
        canRotate: true,
        hasGrain: true,
        grainDirection: 'length',
      }),
      originalIndex: 0,
    }];

    const params = createParams({ forceGrainMatch: true });
    const result = maxRectsPlacement(wrapPieces(pieces), sheet, params);

    // Piece grain matches sheet grain, so rotation would break alignment
    // Without rotation, piece (600x400) doesn't fit in sheet (500x700)
    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });
});

// =============================================================================
// TESTS : Blade Width
// =============================================================================

describe('MaxRects Algorithm - Blade Width', () => {
  test('should account for blade width between pieces', () => {
    // Panneau 1208 mm, 2 pieces de 600 + blade de 4 = 1204
    const sheet = createSheet(1208, 800);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
    ];

    const params = createParams({ bladeWidth: 4 });
    const result = maxRectsPlacement(wrapPieces(pieces), sheet, params);

    expect(result.placements).toHaveLength(2);
    // Avec blade width, les pieces ne devraient pas etre adjacentes
  });

  test('should work with zero blade width', () => {
    const sheet = createSheet(1200, 800);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
    ];

    const params = createParams({ bladeWidth: 0 });
    const result = maxRectsPlacement(wrapPieces(pieces), sheet, params);

    expect(result.placements).toHaveLength(2);
  });
});

// =============================================================================
// TESTS : Sheet Trim
// =============================================================================

describe('MaxRects Algorithm - Sheet Trim', () => {
  test('should respect trim margins', () => {
    const sheet = createSheet(2800, 2070, { top: 10, right: 10, bottom: 10, left: 10 });
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].position.x).toBe(10);
    expect(result.placements[0].position.y).toBe(10);
  });

  test('should reject piece that exceeds usable area', () => {
    const sheet = createSheet(620, 420, { top: 10, right: 10, bottom: 10, left: 10 });
    const pieces = [{ piece: createPiece('p1', 601, 400), originalIndex: 0 }];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });
});

// =============================================================================
// TESTS : Heuristiques
// =============================================================================

describe('MaxRects Algorithm - Heuristics', () => {
  test('bssf should minimize short side leftover', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 500, 300), originalIndex: 1 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet, DEFAULT_OPTIMIZATION_PARAMS, 'bssf');

    expect(result.placements).toHaveLength(2);
    expect(result.unplacedPieces).toHaveLength(0);
  });

  test('blsf should minimize long side leftover', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 500, 300), originalIndex: 1 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet, DEFAULT_OPTIMIZATION_PARAMS, 'blsf');

    expect(result.placements).toHaveLength(2);
    expect(result.unplacedPieces).toHaveLength(0);
  });

  test('baf should minimize area leftover', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 500, 300), originalIndex: 1 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet, DEFAULT_OPTIMIZATION_PARAMS, 'baf');

    expect(result.placements).toHaveLength(2);
    expect(result.unplacedPieces).toHaveLength(0);
  });

  test('bl should prefer bottom-left positions', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet, DEFAULT_OPTIMIZATION_PARAMS, 'bl');

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].position.x).toBe(0);
    expect(result.placements[0].position.y).toBe(0);
  });

  test('cp should maximize contact points', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 500, 300), originalIndex: 1 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet, DEFAULT_OPTIMIZATION_PARAMS, 'cp');

    expect(result.placements).toHaveLength(2);
    expect(result.unplacedPieces).toHaveLength(0);
  });
});

// =============================================================================
// TESTS : Sorting
// =============================================================================

describe('sortPiecesForMaxRects', () => {
  test('should sort by area descending', () => {
    const pieces = [
      createPiece('p1', 100, 100),
      createPiece('p2', 200, 200),
      createPiece('p3', 150, 150),
    ];

    const sorted = sortPiecesForMaxRects(pieces, 'area_desc');

    expect(sorted[0].dimensions.length * sorted[0].dimensions.width).toBe(40000);
    expect(sorted[1].dimensions.length * sorted[1].dimensions.width).toBe(22500);
    expect(sorted[2].dimensions.length * sorted[2].dimensions.width).toBe(10000);
  });

  test('should sort by perimeter descending', () => {
    const pieces = [
      createPiece('p1', 100, 100),
      createPiece('p2', 200, 200),
      createPiece('p3', 150, 150),
    ];

    const sorted = sortPiecesForMaxRects(pieces, 'perimeter_desc');

    expect(2 * (sorted[0].dimensions.length + sorted[0].dimensions.width)).toBe(800);
    expect(2 * (sorted[1].dimensions.length + sorted[1].dimensions.width)).toBe(600);
    expect(2 * (sorted[2].dimensions.length + sorted[2].dimensions.width)).toBe(400);
  });

  test('should sort by max side descending', () => {
    const pieces = [
      createPiece('p1', 100, 150),
      createPiece('p2', 300, 100),
      createPiece('p3', 200, 180),
    ];

    const sorted = sortPiecesForMaxRects(pieces, 'max_side_desc');

    expect(Math.max(sorted[0].dimensions.length, sorted[0].dimensions.width)).toBe(300);
    expect(Math.max(sorted[1].dimensions.length, sorted[1].dimensions.width)).toBe(200);
    expect(Math.max(sorted[2].dimensions.length, sorted[2].dimensions.width)).toBe(150);
  });
});

// =============================================================================
// TESTS : Free Spaces
// =============================================================================

describe('MaxRects Algorithm - Free Spaces', () => {
  test('should report remaining free rectangles', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    expect(result.freeSpaces.length).toBeGreaterThan(0);
    expect(result.freeRects.length).toBeGreaterThan(0);
  });

  test('should filter small free rectangles', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [{ piece: createPiece('p1', 2700, 2000), originalIndex: 0 }];

    const params = createParams({ minOffcutLength: 300, minOffcutWidth: 100 });
    const result = maxRectsPlacement(wrapPieces(pieces), sheet, params);

    // Les chutes trop petites ne devraient pas etre dans freeSpaces
    for (const space of result.freeSpaces) {
      expect(
        space.dimensions.length >= 300 && space.dimensions.width >= 100,
      ).toBe(true);
    }
  });
});

// =============================================================================
// TESTS : Stress Tests
// =============================================================================

describe('MaxRects Algorithm - Stress Tests', () => {
  test('should handle 50 pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      piece: createPiece(`p${i}`, 200 + (i % 5) * 50, 150 + (i % 3) * 50),
      originalIndex: i,
    }));

    const startTime = Date.now();
    const result = maxRectsPlacement(wrapPieces(pieces), sheet);
    const duration = Date.now() - startTime;

    expect(result.unplacedPieces.length).toBeLessThan(10);
    expect(duration).toBeLessThan(1000);

    console.log(`MaxRects 50 pieces: ${result.placements.length} placed, ${result.unplacedPieces.length} unplaced, ${duration}ms`);
  });

  test('should handle 100 pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 100 }, (_, i) => ({
      piece: createPiece(`p${i}`, 150 + (i % 6) * 30, 100 + (i % 4) * 25),
      originalIndex: i,
    }));

    const startTime = Date.now();
    const result = maxRectsPlacement(wrapPieces(pieces), sheet);
    const duration = Date.now() - startTime;

    expect(result.placements.length).toBeGreaterThan(50);
    expect(duration).toBeLessThan(2000);

    console.log(`MaxRects 100 pieces: ${result.placements.length} placed, ${result.unplacedPieces.length} unplaced, ${duration}ms`);
  });
});

// =============================================================================
// TESTS : Efficiency
// =============================================================================

describe('MaxRects Algorithm - Efficiency', () => {
  test('should achieve good efficiency on standard case', () => {
    const sheet = createSheet(2800, 2070);

    const pieces = [
      { piece: createPiece('p1', 800, 600), originalIndex: 0 },
      { piece: createPiece('p2', 800, 600), originalIndex: 1 },
      { piece: createPiece('p3', 800, 600), originalIndex: 2 },
      { piece: createPiece('p4', 800, 600), originalIndex: 3 },
      { piece: createPiece('p5', 600, 500), originalIndex: 4 },
      { piece: createPiece('p6', 600, 500), originalIndex: 5 },
      { piece: createPiece('p7', 600, 500), originalIndex: 6 },
      { piece: createPiece('p8', 600, 500), originalIndex: 7 },
      { piece: createPiece('p9', 400, 300), originalIndex: 8 },
      { piece: createPiece('p10', 400, 300), originalIndex: 9 },
      { piece: createPiece('p11', 400, 300), originalIndex: 10 },
      { piece: createPiece('p12', 400, 300), originalIndex: 11 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    const usedArea = result.placements.reduce(
      (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
      0
    );
    const sheetArea = sheet.dimensions.length * sheet.dimensions.width;
    const efficiency = (usedArea / sheetArea) * 100;

    console.log(`MaxRects efficiency test: ${efficiency.toFixed(1)}% (${result.placements.length}/${pieces.length} pieces)`);

    expect(result.placements.length).toBe(pieces.length);
    expect(efficiency).toBeGreaterThan(55); // MaxRects devrait etre tres efficace
  });

  test('should maximize efficiency with well-fitting pieces', () => {
    const sheet = createSheet(2800, 2070);

    // Pieces calculees pour tenir compte du blade width (4mm)
    const pieces = Array.from({ length: 16 }, (_, i) => ({
      piece: createPiece(`p${i}`, 697, 504),
      originalIndex: i,
    }));

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    const usedArea = result.placements.reduce(
      (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
      0
    );
    const sheetArea = sheet.dimensions.length * sheet.dimensions.width;
    const efficiency = (usedArea / sheetArea) * 100;

    console.log(`MaxRects well-fitting test: ${efficiency.toFixed(1)}% (${result.placements.length}/${pieces.length} pieces)`);

    // MaxRects should place at least 14 pieces (>=87.5% of 16)
    expect(result.placements.length).toBeGreaterThanOrEqual(14);
    expect(efficiency).toBeGreaterThan(80);
  });
});

// =============================================================================
// TESTS : Comparaison avec autres algos (meme cas de test)
// =============================================================================

describe('MaxRects Algorithm - Comparison baseline', () => {
  test('should handle standard furniture case', () => {
    const sheet = createSheet(2800, 2070);

    // Cas realiste: meuble avec plusieurs types de pieces
    const pieces = [
      // Grands panneaux (cotes)
      { piece: createPiece('cote1', 800, 580), originalIndex: 0 },
      { piece: createPiece('cote2', 800, 580), originalIndex: 1 },
      // Etageres
      { piece: createPiece('etag1', 764, 380), originalIndex: 2 },
      { piece: createPiece('etag2', 764, 380), originalIndex: 3 },
      { piece: createPiece('etag3', 764, 380), originalIndex: 4 },
      // Dos
      { piece: createPiece('dos', 800, 764), originalIndex: 5 },
      // Dessus/Dessous
      { piece: createPiece('dessus', 800, 400), originalIndex: 6 },
      { piece: createPiece('dessous', 800, 400), originalIndex: 7 },
    ];

    const result = maxRectsPlacement(wrapPieces(pieces), sheet);

    const usedArea = result.placements.reduce(
      (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
      0
    );
    const sheetArea = sheet.dimensions.length * sheet.dimensions.width;
    const efficiency = (usedArea / sheetArea) * 100;

    console.log(`MaxRects furniture case: ${efficiency.toFixed(1)}% (${result.placements.length}/${pieces.length} pieces)`);

    expect(result.placements.length).toBe(pieces.length);
    expect(efficiency).toBeGreaterThan(50);
  });
});
