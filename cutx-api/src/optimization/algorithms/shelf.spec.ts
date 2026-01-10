/**
 * Tests unitaires pour l'algorithme Shelf (FFDH)
 */

import {
  shelfPlacement,
  ShelfResult,
  sortPiecesForShelf,
  expandPieceQuantities,
} from './shelf';
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

// Helper to wrap pieces with originalId for shelfPlacement
function wrapPieces(pieces: Array<{ piece: CuttingPiece; originalIndex: number }>): Array<{ piece: CuttingPiece; originalIndex: number; originalId: string }> {
  return pieces.map(p => ({ ...p, originalId: p.piece.id }));
}

// =============================================================================
// TESTS : Placement de base
// =============================================================================

describe('Shelf Algorithm - Basic Placement', () => {
  test('should place a single piece', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(1);
    expect(result.shelves).toHaveLength(1);
    expect(result.unplacedPieces).toHaveLength(0);
    expect(result.placements[0].position.x).toBe(0);
    expect(result.placements[0].position.y).toBe(0);
  });

  test('should place multiple pieces on same shelf', () => {
    const sheet = createSheet(2800, 2070);
    // 3 pieces de meme hauteur devraient aller sur la meme etagere
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
      { piece: createPiece('p3', 600, 400), originalIndex: 2 },
    ];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(3);
    expect(result.shelves).toHaveLength(1); // Toutes sur la meme etagere
    expect(result.shelves[0].height).toBe(400);
    expect(result.unplacedPieces).toHaveLength(0);
  });

  test('should create new shelf when piece doesnt fit', () => {
    const sheet = createSheet(1000, 2070);
    // Pieces trop larges pour une seule ligne
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
    ];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(2);
    expect(result.shelves).toHaveLength(2); // Deux etageres
    expect(result.unplacedPieces).toHaveLength(0);
  });

  test('should handle empty pieces array', () => {
    const sheet = createSheet(2800, 2070);
    const pieces: Array<{ piece: CuttingPiece; originalIndex: number }> = [];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.shelves).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(0);
  });
});

// =============================================================================
// TESTS : Pieces trop grandes
// =============================================================================

describe('Shelf Algorithm - Oversized Pieces', () => {
  test('should not place piece larger than sheet', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [{ piece: createPiece('p1', 3000, 400), originalIndex: 0 }];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
    expect(result.unplacedPieces[0].index).toBe(0);
  });

  test('should not place piece taller than sheet', () => {
    const sheet = createSheet(2800, 2070);
    // Piece that is taller than sheet and cannot rotate
    const pieces = [{ piece: createPiece('p1', 600, 2500, { canRotate: false }), originalIndex: 0 }];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });

  test('should place piece that fits exactly', () => {
    const sheet = createSheet(600, 400);
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(1);
    expect(result.unplacedPieces).toHaveLength(0);
  });
});

// =============================================================================
// TESTS : Rotation
// =============================================================================

describe('Shelf Algorithm - Rotation', () => {
  test('should rotate piece if it fits better', () => {
    const sheet = createSheet(500, 700);
    // Piece 600x400 ne rentre pas (600 > 500), mais 400x600 oui (400 < 500 et 600 < 700)
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    // IMPORTANT: Desactiver forceGrainMatch pour permettre la rotation
    const params = createParams({ forceGrainMatch: false });
    const result = shelfPlacement(wrapPieces(pieces), sheet, params);

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

    // Meme avec forceGrainMatch=false, canRotate=false empeche la rotation
    const params = createParams({ forceGrainMatch: false });
    const result = shelfPlacement(wrapPieces(pieces), sheet, params);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });

  test('should respect grain direction when forceGrainMatch is true', () => {
    // Sheet with grain along length
    const sheet: SourceSheet = {
      ...createSheet(500, 2070),
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

    // forceGrainMatch=true means piece grain must match sheet grain
    const params = createParams({ forceGrainMatch: true });
    const result = shelfPlacement(wrapPieces(pieces), sheet, params);

    // Piece grain matches sheet grain, so rotation would break alignment
    // Without rotation, piece (600x400) doesn't fit in sheet (500x2070)
    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });
});

// =============================================================================
// TESTS : Blade Width
// =============================================================================

describe('Shelf Algorithm - Blade Width', () => {
  test('should account for blade width between pieces on same shelf', () => {
    const sheet = createSheet(1208, 2070); // Exactement 2 pieces de 600 + blade
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
    ];
    // Blade width par defaut = 4mm
    // 600 + 4 + 600 = 1204, rentre dans 1208

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(2);
    expect(result.shelves).toHaveLength(1);
    // Premiere piece a x=0, deuxieme a x=600+4=604
    expect(result.placements[1].position.x).toBe(604);
  });

  test('should account for blade width between shelves', () => {
    const sheet = createSheet(600, 808); // 2 etageres de 400 + blade
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
    ];
    // 400 + 4 + 400 = 804, rentre dans 808

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(2);
    expect(result.shelves).toHaveLength(2);
    // Premiere etagere a y=0, deuxieme a y=400+4=404
    expect(result.shelves[1].y).toBe(404);
  });

  test('should work with zero blade width', () => {
    const sheet = createSheet(1200, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
    ];

    const params = createParams({ bladeWidth: 0 });
    const result = shelfPlacement(wrapPieces(pieces), sheet, params);

    expect(result.placements).toHaveLength(2);
    expect(result.placements[1].position.x).toBe(600); // Sans blade width
  });
});

// =============================================================================
// TESTS : Sheet Trim
// =============================================================================

describe('Shelf Algorithm - Sheet Trim', () => {
  test('should respect trim margins', () => {
    const sheet = createSheet(2800, 2070, { top: 10, right: 10, bottom: 10, left: 10 });
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].position.x).toBe(10); // Commence apres le trim gauche
    expect(result.placements[0].position.y).toBe(10); // Commence apres le trim bas
  });

  test('should reject piece that exceeds usable area', () => {
    const sheet = createSheet(620, 420, { top: 10, right: 10, bottom: 10, left: 10 });
    // Zone utilisable: 600x400, piece exacte
    const pieces = [{ piece: createPiece('p1', 601, 400), originalIndex: 0 }];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });
});

// =============================================================================
// TESTS : Strategies de placement
// =============================================================================

describe('Shelf Algorithm - Placement Strategies', () => {
  test('best_fit should use shelf with least height waste', () => {
    // Panneau assez large pour que p3 (200) puisse aller a cote de p1 ou p2 (500)
    // Mais pas assez large pour 2 grandes pieces cote a cote
    const sheet = createSheet(800, 2070); // 500+4+200=704 < 800, mais 500+4+500=1004 > 800

    // p1 et p2 ne peuvent pas etre cote a cote (500+4+500=1004 > 800)
    // Donc ils creent chacun leur etagere
    // Mais p3 (200) peut aller sur les deux (500+4+200=704 < 800)
    const pieces = [
      { piece: createPiece('p1', 500, 500), originalIndex: 0 }, // Etagere 1, hauteur 500
      { piece: createPiece('p2', 500, 300), originalIndex: 1 }, // Etagere 2, hauteur 300
      { piece: createPiece('p3', 200, 290), originalIndex: 2 }, // Peut aller sur etagere 1 ou 2
    ];
    // p3 (290 hauteur) peut aller sur:
    // - Etagere 1 (h=500): waste = 500-290 = 210
    // - Etagere 2 (h=300): waste = 300-290 = 10
    // best_fit devrait choisir etagere 2

    const result = shelfPlacement(wrapPieces(pieces), sheet, DEFAULT_OPTIMIZATION_PARAMS, 'best_fit');

    expect(result.placements).toHaveLength(3);
    expect(result.shelves).toHaveLength(2);

    // p3 devrait etre sur l'etagere 2 (hauteur 300)
    const p3Placement = result.placements.find(p => p.pieceId === 'p3');
    const shelf300 = result.shelves.find(s => s.height === 300);
    expect(shelf300).toBeDefined();
    expect(p3Placement?.position.y).toBe(shelf300?.y);
  });

  test('first_fit should use first available shelf', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 500), originalIndex: 0 },
      { piece: createPiece('p2', 600, 300), originalIndex: 1 },
      { piece: createPiece('p3', 600, 200), originalIndex: 2 }, // Devrait aller sur premiere etagere
    ];

    const result = shelfPlacement(wrapPieces(pieces), sheet, DEFAULT_OPTIMIZATION_PARAMS, 'first_fit');

    expect(result.placements).toHaveLength(3);
    // La 3eme piece devrait etre sur la premiere etagere (first fit)
    const p3Placement = result.placements.find(p => p.pieceId === 'p3');
    expect(p3Placement?.position.y).toBe(0);
  });

  test('next_fit should only consider last shelf', () => {
    const sheet = createSheet(1000, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 500), originalIndex: 0 }, // Etagere 1
      { piece: createPiece('p2', 600, 500), originalIndex: 1 }, // Nouvelle etagere car trop large
      { piece: createPiece('p3', 300, 400), originalIndex: 2 }, // Devrait aller sur etagere 2 seulement
    ];

    const result = shelfPlacement(wrapPieces(pieces), sheet, DEFAULT_OPTIMIZATION_PARAMS, 'next_fit');

    // p3 ne peut pas aller sur etagere 2 (hauteur 500, p3 hauteur 400)
    // next_fit ne regarde que la derniere, donc p3 va sur etagere 2
    expect(result.placements).toHaveLength(3);
  });
});

// =============================================================================
// TESTS : Sorting
// =============================================================================

describe('sortPiecesForShelf', () => {
  test('should sort by height descending', () => {
    const pieces = [
      createPiece('p1', 600, 300),
      createPiece('p2', 600, 500),
      createPiece('p3', 600, 400),
    ];

    const sorted = sortPiecesForShelf(pieces, 'height_desc');

    expect(sorted[0].dimensions.width).toBe(500);
    expect(sorted[1].dimensions.width).toBe(400);
    expect(sorted[2].dimensions.width).toBe(300);
  });

  test('should sort by width descending', () => {
    const pieces = [
      createPiece('p1', 400, 300),
      createPiece('p2', 600, 300),
      createPiece('p3', 500, 300),
    ];

    const sorted = sortPiecesForShelf(pieces, 'width_desc');

    expect(sorted[0].dimensions.length).toBe(600);
    expect(sorted[1].dimensions.length).toBe(500);
    expect(sorted[2].dimensions.length).toBe(400);
  });

  test('should sort by area descending', () => {
    const pieces = [
      createPiece('p1', 100, 100), // 10000
      createPiece('p2', 200, 200), // 40000
      createPiece('p3', 150, 150), // 22500
    ];

    const sorted = sortPiecesForShelf(pieces, 'area_desc');

    expect(sorted[0].dimensions.length * sorted[0].dimensions.width).toBe(40000);
    expect(sorted[1].dimensions.length * sorted[1].dimensions.width).toBe(22500);
    expect(sorted[2].dimensions.length * sorted[2].dimensions.width).toBe(10000);
  });
});

// =============================================================================
// TESTS : Expand Quantities
// =============================================================================

describe('expandPieceQuantities', () => {
  test('should expand pieces with quantity > 1', () => {
    const pieces = [
      createPiece('p1', 600, 400, { quantity: 3 }),
    ];

    const expanded = expandPieceQuantities(pieces);

    expect(expanded).toHaveLength(3);
    expect(expanded[0].originalIndex).toBe(0);
    expect(expanded[1].originalIndex).toBe(0);
    expect(expanded[2].originalIndex).toBe(0);
  });

  test('should handle quantity = 1', () => {
    const pieces = [
      createPiece('p1', 600, 400, { quantity: 1 }),
      createPiece('p2', 700, 500, { quantity: 1 }),
    ];

    const expanded = expandPieceQuantities(pieces);

    expect(expanded).toHaveLength(2);
  });
});

// =============================================================================
// TESTS : Free Spaces
// =============================================================================

describe('Shelf Algorithm - Free Spaces', () => {
  test('should report free space at end of shelf', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [{ piece: createPiece('p1', 600, 400), originalIndex: 0 }];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    // Espace libre a droite de la piece (2800-600 = 2200) et au-dessus (2070-400 = 1670)
    expect(result.freeSpaces.length).toBeGreaterThan(0);

    const rightSpace = result.freeSpaces.find(s => s.dimensions.length > 2000);
    expect(rightSpace).toBeDefined();
  });

  test('should report free space above last shelf', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [{ piece: createPiece('p1', 2700, 400), originalIndex: 0 }];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    // Espace au-dessus: 2070 - 400 = 1670
    const topSpace = result.freeSpaces.find(
      s => s.position.y >= 400 && s.dimensions.width > 1600
    );
    expect(topSpace).toBeDefined();
  });
});

// =============================================================================
// TESTS : Stress Tests
// =============================================================================

describe('Shelf Algorithm - Stress Tests', () => {
  test('should handle 50 pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      piece: createPiece(`p${i}`, 200 + (i % 5) * 50, 150 + (i % 3) * 50),
      originalIndex: i,
    }));

    const startTime = Date.now();
    const result = shelfPlacement(wrapPieces(pieces), sheet);
    const duration = Date.now() - startTime;

    expect(result.unplacedPieces.length).toBeLessThan(10);
    expect(duration).toBeLessThan(1000);

    console.log(`Shelf 50 pieces: ${result.placements.length} placed, ${result.unplacedPieces.length} unplaced, ${duration}ms`);
  });

  test('should handle 100 pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 100 }, (_, i) => ({
      piece: createPiece(`p${i}`, 150 + (i % 6) * 30, 100 + (i % 4) * 25),
      originalIndex: i,
    }));

    const startTime = Date.now();
    const result = shelfPlacement(wrapPieces(pieces), sheet);
    const duration = Date.now() - startTime;

    expect(result.placements.length).toBeGreaterThan(50);
    expect(duration).toBeLessThan(2000);

    console.log(`Shelf 100 pieces: ${result.placements.length} placed, ${result.unplacedPieces.length} unplaced, ${duration}ms`);
  });
});

// =============================================================================
// TESTS : Efficiency
// =============================================================================

describe('Shelf Algorithm - Efficiency', () => {
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

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    const usedArea = result.placements.reduce(
      (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
      0
    );
    const sheetArea = sheet.dimensions.length * sheet.dimensions.width;
    const efficiency = (usedArea / sheetArea) * 100;

    console.log(`Shelf efficiency test: ${efficiency.toFixed(1)}% (${result.placements.length}/${pieces.length} pieces)`);

    expect(result.placements.length).toBe(pieces.length);
    expect(efficiency).toBeGreaterThan(50); // Shelf est moins efficace que Guillotine
  });

  test('should achieve high efficiency with same-height pieces', () => {
    const sheet = createSheet(2800, 2070);

    // Pieces de meme hauteur = parfait pour Shelf
    const pieces = Array.from({ length: 12 }, (_, i) => ({
      piece: createPiece(`p${i}`, 450, 500),
      originalIndex: i,
    }));
    // 6 pieces par ligne (6x450 + 5x4blade = 2700 + 20 = 2720 < 2800)
    // 4 lignes (4x500 + 3x4blade = 2000 + 12 = 2012 < 2070)

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    const usedArea = result.placements.reduce(
      (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
      0
    );
    const sheetArea = sheet.dimensions.length * sheet.dimensions.width;
    const efficiency = (usedArea / sheetArea) * 100;

    console.log(`Shelf same-height test: ${efficiency.toFixed(1)}% (${result.placements.length}/${pieces.length} pieces)`);

    expect(result.placements.length).toBe(pieces.length);
    expect(efficiency).toBeGreaterThan(40);
  });
});

// =============================================================================
// TESTS : Cut Generation
// =============================================================================

describe('Shelf Algorithm - Cut Generation', () => {
  test('should generate horizontal cuts between shelves', () => {
    const sheet = createSheet(600, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
    ];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    const horizontalCuts = result.cuts.filter(c => c.direction === 'horizontal');
    expect(horizontalCuts.length).toBe(1); // Une coupe entre les 2 etageres
  });

  test('should generate vertical cuts between pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = [
      { piece: createPiece('p1', 600, 400), originalIndex: 0 },
      { piece: createPiece('p2', 600, 400), originalIndex: 1 },
      { piece: createPiece('p3', 600, 400), originalIndex: 2 },
    ];

    const result = shelfPlacement(wrapPieces(pieces), sheet);

    const verticalCuts = result.cuts.filter(c => c.direction === 'vertical');
    expect(verticalCuts.length).toBeGreaterThanOrEqual(2);
  });
});
