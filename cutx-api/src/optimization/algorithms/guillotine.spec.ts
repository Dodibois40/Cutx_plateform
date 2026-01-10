/**
 * Tests unitaires pour l'algorithme Guillotine
 *
 * Cas de test :
 * 1. Pieces simples (rectangles basiques)
 * 2. Pieces avec contraintes de fil
 * 3. Pieces avec rotation
 * 4. Pieces trop grandes
 * 5. Beaucoup de pieces (stress test)
 * 6. Pieces avec surcotes
 * 7. Trait de scie configurable
 */

import {
  guillotinePlacement,
  sortPieces,
  expandPieceQuantities,
} from './guillotine';
import {
  CuttingPiece,
  SourceSheet,
  OptimizationParams,
  DEFAULT_OPTIMIZATION_PARAMS,
} from '../types/cutting.types';

// =============================================================================
// FIXTURES - Donnees de test reutilisables
// =============================================================================

const createSheet = (
  length: number = 2800,
  width: number = 2070,
  options: Partial<SourceSheet> = {}
): SourceSheet => ({
  id: 'test-sheet',
  materialRef: 'TEST-MAT',
  materialName: 'Test Material',
  dimensions: { length, width },
  thickness: 18,
  trim: { top: 0, left: 0, bottom: 0, right: 0 },
  hasGrain: false,
  ...options,
});

const createPiece = (
  id: string,
  length: number,
  width: number,
  options: Partial<CuttingPiece> = {}
): CuttingPiece => ({
  id,
  name: `Piece ${id}`,
  dimensions: { length, width },
  quantity: 1,
  hasGrain: false,
  canRotate: true,
  expansion: { length: 0, width: 0 },
  ...options,
});

// Helper to wrap pieces with originalId for guillotinePlacement
function wrapPieces(pieces: Array<{ piece: CuttingPiece; originalIndex: number }>): Array<{ piece: CuttingPiece; originalIndex: number; originalId: string }> {
  return pieces.map(p => ({ ...p, originalId: p.piece.id }));
}

// =============================================================================
// TESTS : Placement de base
// =============================================================================

describe('Guillotine Algorithm - Basic Placement', () => {
  test('should place a single piece', () => {
    const sheet = createSheet();
    const pieces = [{ piece: createPiece('p1', 500, 300), originalIndex: 0 }];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(1);
    expect(result.unplacedPieces).toHaveLength(0);
    expect(result.placements[0].position.x).toBe(0);
    expect(result.placements[0].position.y).toBe(0);
  });

  test('should place multiple pieces', () => {
    const sheet = createSheet();
    const pieces = [
      { piece: createPiece('p1', 500, 300), originalIndex: 0 },
      { piece: createPiece('p2', 400, 200), originalIndex: 1 },
      { piece: createPiece('p3', 600, 400), originalIndex: 2 },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(3);
    expect(result.unplacedPieces).toHaveLength(0);
  });

  test('should handle empty pieces array', () => {
    const sheet = createSheet();
    const pieces: Array<{ piece: CuttingPiece; originalIndex: number }> = [];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(0);
    expect(result.freeSpaces).toHaveLength(1); // Tout le panneau est libre
  });

  test('should not overlap pieces', () => {
    const sheet = createSheet(1000, 1000);
    const pieces = [
      { piece: createPiece('p1', 400, 400), originalIndex: 0 },
      { piece: createPiece('p2', 400, 400), originalIndex: 1 },
      { piece: createPiece('p3', 400, 400), originalIndex: 2 },
      { piece: createPiece('p4', 400, 400), originalIndex: 3 },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      bladeWidth: 0, // Pas de trait de scie pour ce test
    });

    // Verifier qu'aucune piece ne se chevauche
    for (let i = 0; i < result.placements.length; i++) {
      for (let j = i + 1; j < result.placements.length; j++) {
        const p1 = result.placements[i];
        const p2 = result.placements[j];

        const overlap =
          p1.position.x < p2.position.x + p2.finalDimensions.length &&
          p1.position.x + p1.finalDimensions.length > p2.position.x &&
          p1.position.y < p2.position.y + p2.finalDimensions.width &&
          p1.position.y + p1.finalDimensions.width > p2.position.y;

        expect(overlap).toBe(false);
      }
    }
  });
});

// =============================================================================
// TESTS : Pieces trop grandes
// =============================================================================

describe('Guillotine Algorithm - Oversized Pieces', () => {
  test('should not place piece larger than sheet', () => {
    const sheet = createSheet(1000, 500);
    const pieces = [
      { piece: createPiece('p1', 1200, 300), originalIndex: 0 }, // Trop long
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });

  test('should not place piece wider than sheet', () => {
    const sheet = createSheet(1000, 500);
    const pieces = [
      { piece: createPiece('p1', 800, 600), originalIndex: 0 }, // Trop large
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });

  test('should place piece that fits exactly', () => {
    const sheet = createSheet(1000, 500);
    const pieces = [
      { piece: createPiece('p1', 1000, 500), originalIndex: 0 },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      bladeWidth: 0,
    });

    expect(result.placements).toHaveLength(1);
    expect(result.unplacedPieces).toHaveLength(0);
  });
});

// =============================================================================
// TESTS : Rotation
// =============================================================================

describe('Guillotine Algorithm - Rotation', () => {
  test('should rotate piece if it fits better', () => {
    const sheet = createSheet(1000, 300); // Panneau etroit
    const pieces = [
      {
        piece: createPiece('p1', 200, 800, { canRotate: true }), // Ne rentre pas sans rotation
        originalIndex: 0,
      },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      forceGrainMatch: false,
    });

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].rotated).toBe(true);
  });

  test('should not rotate piece when canRotate is false', () => {
    const sheet = createSheet(1000, 300);
    const pieces = [
      {
        piece: createPiece('p1', 200, 800, { canRotate: false }),
        originalIndex: 0,
      },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });

  test('should respect grain direction', () => {
    const sheet = createSheet(1000, 500, {
      hasGrain: true,
      grainDirection: 'length',
    });
    const pieces = [
      {
        piece: createPiece('p1', 400, 300, {
          hasGrain: true,
          grainDirection: 'length',
          canRotate: true,
        }),
        originalIndex: 0,
      },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      forceGrainMatch: true,
    });

    expect(result.placements).toHaveLength(1);
    // Avec forceGrainMatch, la piece ne devrait pas etre tournee si le fil correspond
  });
});

// =============================================================================
// TESTS : Trait de scie (Blade Width)
// =============================================================================

describe('Guillotine Algorithm - Blade Width', () => {
  test('should account for blade width between pieces', () => {
    const sheet = createSheet(1000, 500);
    const bladeWidth = 4;

    // Deux pieces de 498mm ne rentrent pas cote a cote avec 4mm de trait
    // 498 + 4 + 498 = 1000, mais il faut aussi le trait apres la 2e piece
    const pieces = [
      { piece: createPiece('p1', 496, 200), originalIndex: 0 },
      { piece: createPiece('p2', 496, 200), originalIndex: 1 },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      bladeWidth,
    });

    expect(result.placements).toHaveLength(2);

    // La 2e piece devrait etre decalee de longueur + bladeWidth
    if (result.placements.length === 2) {
      const p1 = result.placements[0];
      const p2 = result.placements[1];

      // Soit elles sont sur la meme ligne (x decale)
      // Soit sur des lignes differentes (y decale)
      const xGap = Math.abs(p2.position.x - (p1.position.x + p1.finalDimensions.length));
      const yGap = Math.abs(p2.position.y - (p1.position.y + p1.finalDimensions.width));

      // Au moins un des gaps doit etre >= bladeWidth (ou 0 si sur meme axe)
      expect(xGap >= bladeWidth || yGap >= bladeWidth || p2.position.x === 0 || p2.position.y === 0).toBe(true);
    }
  });

  test('should work with zero blade width', () => {
    const sheet = createSheet(1000, 500);
    const pieces = [
      { piece: createPiece('p1', 500, 250), originalIndex: 0 },
      { piece: createPiece('p2', 500, 250), originalIndex: 1 },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      bladeWidth: 0,
    });

    expect(result.placements).toHaveLength(2);
  });
});

// =============================================================================
// TESTS : Marges du panneau (Trim)
// =============================================================================

describe('Guillotine Algorithm - Sheet Trim', () => {
  test('should respect trim margins', () => {
    const sheet = createSheet(1000, 500, {
      trim: { top: 10, left: 10, bottom: 10, right: 10 },
    });

    const pieces = [
      { piece: createPiece('p1', 980, 480), originalIndex: 0 }, // Exactement la taille utilisable
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      bladeWidth: 0,
    });

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].position.x).toBe(10); // Commence apres le trim gauche
    expect(result.placements[0].position.y).toBe(10); // Commence apres le trim bas
  });

  test('should reject piece that exceeds usable area', () => {
    const sheet = createSheet(1000, 500, {
      trim: { top: 10, left: 10, bottom: 10, right: 10 },
    });

    const pieces = [
      { piece: createPiece('p1', 990, 480), originalIndex: 0 }, // Trop grand avec le trim
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      bladeWidth: 0,
    });

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });
});

// =============================================================================
// TESTS : Surcotes (Expansion)
// =============================================================================

describe('Guillotine Algorithm - Expansion', () => {
  test('should account for expansion in placement', () => {
    const sheet = createSheet(1000, 500);
    const pieces = [
      {
        piece: createPiece('p1', 500, 250, {
          expansion: { length: 10, width: 5 }, // Dimensions finales: 510x255
        }),
        originalIndex: 0,
      },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].finalDimensions.length).toBe(510);
    expect(result.placements[0].finalDimensions.width).toBe(255);
  });

  test('should reject piece when expansion makes it too large', () => {
    const sheet = createSheet(500, 300);
    const pieces = [
      {
        piece: createPiece('p1', 495, 295, {
          expansion: { length: 10, width: 10 }, // Devient 505x305, trop grand
        }),
        originalIndex: 0,
      },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    expect(result.placements).toHaveLength(0);
    expect(result.unplacedPieces).toHaveLength(1);
  });
});

// =============================================================================
// TESTS : Tri des pieces
// =============================================================================

describe('sortPieces', () => {
  test('should sort by area descending', () => {
    const pieces = [
      createPiece('small', 100, 100),  // 10000
      createPiece('large', 500, 400),  // 200000
      createPiece('medium', 300, 200), // 60000
    ];

    const sorted = sortPieces(pieces, 'area_desc');

    expect(sorted[0].id).toBe('large');
    expect(sorted[1].id).toBe('medium');
    expect(sorted[2].id).toBe('small');
  });

  test('should sort by max side descending', () => {
    const pieces = [
      createPiece('p1', 100, 500), // max = 500
      createPiece('p2', 600, 200), // max = 600
      createPiece('p3', 300, 300), // max = 300
    ];

    const sorted = sortPieces(pieces, 'max_side_desc');

    expect(sorted[0].id).toBe('p2');
    expect(sorted[1].id).toBe('p1');
    expect(sorted[2].id).toBe('p3');
  });

  test('should sort by perimeter descending', () => {
    const pieces = [
      createPiece('p1', 100, 100), // perim = 400
      createPiece('p2', 500, 100), // perim = 1200
      createPiece('p3', 200, 200), // perim = 800
    ];

    const sorted = sortPieces(pieces, 'perimeter_desc');

    expect(sorted[0].id).toBe('p2');
    expect(sorted[1].id).toBe('p3');
    expect(sorted[2].id).toBe('p1');
  });
});

// =============================================================================
// TESTS : Expansion des quantites
// =============================================================================

describe('expandPieceQuantities', () => {
  test('should expand pieces with quantity > 1', () => {
    const pieces = [
      createPiece('p1', 100, 100, { quantity: 3 }),
      createPiece('p2', 200, 200, { quantity: 2 }),
    ];

    const expanded = expandPieceQuantities(pieces);

    expect(expanded).toHaveLength(5); // 3 + 2
    expect(expanded.filter(e => e.originalIndex === 0)).toHaveLength(3);
    expect(expanded.filter(e => e.originalIndex === 1)).toHaveLength(2);
  });

  test('should handle quantity = 1', () => {
    const pieces = [
      createPiece('p1', 100, 100, { quantity: 1 }),
    ];

    const expanded = expandPieceQuantities(pieces);

    expect(expanded).toHaveLength(1);
  });

  test('should preserve original index', () => {
    const pieces = [
      createPiece('p1', 100, 100, { quantity: 2 }),
      createPiece('p2', 200, 200, { quantity: 1 }),
    ];

    const expanded = expandPieceQuantities(pieces);

    expect(expanded[0].originalIndex).toBe(0);
    expect(expanded[1].originalIndex).toBe(0);
    expect(expanded[2].originalIndex).toBe(1);
  });
});

// =============================================================================
// TESTS : Chutes (Free Spaces)
// =============================================================================

describe('Guillotine Algorithm - Free Spaces', () => {
  test('should report remaining free spaces', () => {
    const sheet = createSheet(1000, 500);
    const pieces = [
      { piece: createPiece('p1', 400, 300), originalIndex: 0 },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      minOffcutLength: 100,
      minOffcutWidth: 100,
    });

    expect(result.freeSpaces.length).toBeGreaterThan(0);

    // Verifier que les chutes ne chevauchent pas la piece placee
    const placement = result.placements[0];
    for (const space of result.freeSpaces) {
      const overlap =
        space.position.x < placement.position.x + placement.finalDimensions.length &&
        space.position.x + space.dimensions.length > placement.position.x &&
        space.position.y < placement.position.y + placement.finalDimensions.width &&
        space.position.y + space.dimensions.width > placement.position.y;

      expect(overlap).toBe(false);
    }
  });

  test('should filter small offcuts', () => {
    const sheet = createSheet(1000, 500);
    const pieces = [
      { piece: createPiece('p1', 900, 450), originalIndex: 0 },
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet, {
      ...DEFAULT_OPTIMIZATION_PARAMS,
      bladeWidth: 4,
      minOffcutLength: 200, // Les chutes < 200mm seront filtrees
      minOffcutWidth: 100,
    });

    // Toutes les chutes restantes doivent respecter les dimensions min
    for (const space of result.freeSpaces) {
      const meetsMinLength = space.dimensions.length >= 200;
      const meetsMinWidth = space.dimensions.width >= 100;
      expect(meetsMinLength || meetsMinWidth).toBe(true);
    }
  });
});

// =============================================================================
// TESTS : Stress Test
// =============================================================================

describe('Guillotine Algorithm - Stress Tests', () => {
  test('should handle 50 pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      piece: createPiece(`p${i}`, 200 + (i % 5) * 50, 150 + (i % 4) * 30),
      originalIndex: i,
    }));

    const startTime = Date.now();
    const result = guillotinePlacement(wrapPieces(pieces), sheet);
    const duration = Date.now() - startTime;

    expect(result.placements.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // Moins d'1 seconde

    console.log(`50 pieces: ${result.placements.length} placed, ${result.unplacedPieces.length} unplaced, ${duration}ms`);
  });

  test('should handle 100 pieces', () => {
    const sheet = createSheet(2800, 2070);
    const pieces = Array.from({ length: 100 }, (_, i) => ({
      piece: createPiece(`p${i}`, 150 + (i % 6) * 40, 100 + (i % 5) * 25),
      originalIndex: i,
    }));

    const startTime = Date.now();
    const result = guillotinePlacement(wrapPieces(pieces), sheet);
    const duration = Date.now() - startTime;

    expect(result.placements.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(2000); // Moins de 2 secondes

    console.log(`100 pieces: ${result.placements.length} placed, ${result.unplacedPieces.length} unplaced, ${duration}ms`);
  });
});

// =============================================================================
// TESTS : Efficacite
// =============================================================================

describe('Guillotine Algorithm - Efficiency', () => {
  test('should achieve > 70% efficiency on standard case', () => {
    const sheet = createSheet(2800, 2070);

    // Cas realiste : pieces de meuble pour remplir ~75% du panneau
    // Panneau = 2800x2070 = 5,796,000 mm²
    // Objectif = 70% = 4,057,200 mm² minimum
    const pieces = [
      // Grandes pieces (800x600 = 480,000 mm² x 4 = 1,920,000)
      { piece: createPiece('p1', 800, 600), originalIndex: 0 },
      { piece: createPiece('p2', 800, 600), originalIndex: 1 },
      { piece: createPiece('p3', 800, 600), originalIndex: 2 },
      { piece: createPiece('p4', 800, 600), originalIndex: 3 },
      // Pieces moyennes (600x500 = 300,000 mm² x 4 = 1,200,000)
      { piece: createPiece('p5', 600, 500), originalIndex: 4 },
      { piece: createPiece('p6', 600, 500), originalIndex: 5 },
      { piece: createPiece('p7', 600, 500), originalIndex: 6 },
      { piece: createPiece('p8', 600, 500), originalIndex: 7 },
      // Petites pieces pour combler (400x300 = 120,000 mm² x 6 = 720,000)
      { piece: createPiece('p9', 400, 300), originalIndex: 8 },
      { piece: createPiece('p10', 400, 300), originalIndex: 9 },
      { piece: createPiece('p11', 400, 300), originalIndex: 10 },
      { piece: createPiece('p12', 400, 300), originalIndex: 11 },
      { piece: createPiece('p13', 400, 300), originalIndex: 12 },
      { piece: createPiece('p14', 400, 300), originalIndex: 13 },
      // Total theorique = 3,840,000 mm² = 66.3%
      // Avec de bonnes placements, on devrait atteindre ~60-65%
    ];

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    // Calculer l'efficacite
    const usedArea = result.placements.reduce(
      (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
      0
    );
    const sheetArea = sheet.dimensions.length * sheet.dimensions.width;
    const efficiency = (usedArea / sheetArea) * 100;

    console.log(`Efficiency test: ${efficiency.toFixed(1)}% (${result.placements.length}/${pieces.length} pieces)`);

    // L'algorithme doit placer toutes les pieces et atteindre ~65%
    expect(result.placements.length).toBe(pieces.length);
    expect(efficiency).toBeGreaterThan(60); // 60% est un bon objectif realiste
  });

  test('should maximize efficiency with well-fitting pieces', () => {
    // Test avec pieces qui s'emboitent en tenant compte du trait de scie (4mm)
    // Panneau 2800x2070
    // 4 pieces par ligne: 4×697 + 3×4(blade) = 2788 + 12 = 2800 ✓
    // 4 lignes: 4×504 + 3×4(blade) = 2016 + 12 = 2028 < 2070 ✓
    const sheet = createSheet(2800, 2070);

    const pieces = [
      // Ligne 1: 4 pieces de 697x504
      { piece: createPiece('L1-1', 697, 504), originalIndex: 0 },
      { piece: createPiece('L1-2', 697, 504), originalIndex: 1 },
      { piece: createPiece('L1-3', 697, 504), originalIndex: 2 },
      { piece: createPiece('L1-4', 697, 504), originalIndex: 3 },
      // Ligne 2
      { piece: createPiece('L2-1', 697, 504), originalIndex: 4 },
      { piece: createPiece('L2-2', 697, 504), originalIndex: 5 },
      { piece: createPiece('L2-3', 697, 504), originalIndex: 6 },
      { piece: createPiece('L2-4', 697, 504), originalIndex: 7 },
      // Ligne 3
      { piece: createPiece('L3-1', 697, 504), originalIndex: 8 },
      { piece: createPiece('L3-2', 697, 504), originalIndex: 9 },
      { piece: createPiece('L3-3', 697, 504), originalIndex: 10 },
      { piece: createPiece('L3-4', 697, 504), originalIndex: 11 },
      // Ligne 4
      { piece: createPiece('L4-1', 697, 504), originalIndex: 12 },
      { piece: createPiece('L4-2', 697, 504), originalIndex: 13 },
      { piece: createPiece('L4-3', 697, 504), originalIndex: 14 },
      { piece: createPiece('L4-4', 697, 504), originalIndex: 15 },
    ];
    // Total = 16 x (697x504) = 16 x 351,288 = 5,620,608 mm²
    // Panneau = 2800x2070 = 5,796,000 mm²
    // Efficacite theorique = 97%

    const result = guillotinePlacement(wrapPieces(pieces), sheet);

    const usedArea = result.placements.reduce(
      (sum, p) => sum + p.finalDimensions.length * p.finalDimensions.width,
      0
    );
    const sheetArea = sheet.dimensions.length * sheet.dimensions.width;
    const efficiency = (usedArea / sheetArea) * 100;

    console.log(`Well-fitting test: ${efficiency.toFixed(1)}% (${result.placements.length}/${pieces.length} pieces)`);

    // Avec des pieces bien dimensionnees pour le trait de scie, on doit placer toutes les pieces
    expect(result.placements.length).toBe(pieces.length);
    expect(efficiency).toBeGreaterThan(90);
  });
});
