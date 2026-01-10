/**
 * Tests for CutX Grain Direction Utilities
 */

import {
  checkGrainAlignment,
  getValidOrientations,
  canPlaceWithGrain,
  filterPiecesByGrain,
  groupPiecesByGrain,
  GrainAlignment,
} from './grain-utils';
import { CuttingPiece, SourceSheet } from '../types/cutting.types';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createPiece(overrides: Partial<CuttingPiece> = {}): CuttingPiece {
  return {
    id: 'test-piece',
    name: 'Test Piece',
    dimensions: { length: 500, width: 300 },
    quantity: 1,
    hasGrain: false,
    canRotate: true,
    expansion: { length: 0, width: 0 },
    ...overrides,
  };
}

function createSheet(overrides: Partial<SourceSheet> = {}): SourceSheet {
  return {
    id: 'test-sheet',
    materialRef: 'MAT001',
    materialName: 'Test Material',
    dimensions: { length: 2800, width: 2070 },
    thickness: 18,
    trim: { top: 0, left: 0, bottom: 0, right: 0 },
    hasGrain: false,
    ...overrides,
  };
}

// =============================================================================
// checkGrainAlignment TESTS
// =============================================================================

describe('checkGrainAlignment', () => {
  describe('when forceGrainMatch is false', () => {
    it('should allow any placement', () => {
      const piece = createPiece({ hasGrain: true, grainDirection: 'length' });
      const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

      const result = checkGrainAlignment(piece, sheet, false);

      expect(result.alignment).toBe('no_grain');
      expect(result.canPlace).toBe(true);
      expect(result.mustRotate).toBe(false);
    });
  });

  describe('when piece has no grain', () => {
    it('should allow placement without rotation', () => {
      const piece = createPiece({ hasGrain: false });
      const sheet = createSheet({ hasGrain: true, grainDirection: 'length' });

      const result = checkGrainAlignment(piece, sheet, true);

      expect(result.alignment).toBe('no_grain');
      expect(result.canPlace).toBe(true);
      expect(result.mustRotate).toBe(false);
    });
  });

  describe('when sheet has no grain', () => {
    it('should allow placement without rotation', () => {
      const piece = createPiece({ hasGrain: true, grainDirection: 'length' });
      const sheet = createSheet({ hasGrain: false });

      const result = checkGrainAlignment(piece, sheet, true);

      expect(result.alignment).toBe('no_grain');
      expect(result.canPlace).toBe(true);
      expect(result.mustRotate).toBe(false);
    });
  });

  describe('when both have grain', () => {
    it('should align without rotation when directions match (length-length)', () => {
      const piece = createPiece({ hasGrain: true, grainDirection: 'length' });
      const sheet = createSheet({ hasGrain: true, grainDirection: 'length' });

      const result = checkGrainAlignment(piece, sheet, true);

      expect(result.alignment).toBe('aligned');
      expect(result.canPlace).toBe(true);
      expect(result.mustRotate).toBe(false);
    });

    it('should align without rotation when directions match (width-width)', () => {
      const piece = createPiece({ hasGrain: true, grainDirection: 'width' });
      const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

      const result = checkGrainAlignment(piece, sheet, true);

      expect(result.alignment).toBe('aligned');
      expect(result.canPlace).toBe(true);
      expect(result.mustRotate).toBe(false);
    });

    it('should require rotation when directions differ and rotation allowed', () => {
      const piece = createPiece({
        hasGrain: true,
        grainDirection: 'length',
        canRotate: true,
      });
      const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

      const result = checkGrainAlignment(piece, sheet, true);

      expect(result.alignment).toBe('aligned_rotated');
      expect(result.canPlace).toBe(true);
      expect(result.mustRotate).toBe(true);
    });

    it('should be incompatible when directions differ and rotation not allowed', () => {
      const piece = createPiece({
        hasGrain: true,
        grainDirection: 'length',
        canRotate: false,
      });
      const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

      const result = checkGrainAlignment(piece, sheet, true);

      expect(result.alignment).toBe('incompatible');
      expect(result.canPlace).toBe(false);
      expect(result.mustRotate).toBe(false);
    });

    it('should default grain direction to length when not specified', () => {
      const piece = createPiece({
        hasGrain: true,
        grainDirection: undefined,
      });
      const sheet = createSheet({
        hasGrain: true,
        grainDirection: undefined,
      });

      const result = checkGrainAlignment(piece, sheet, true);

      expect(result.alignment).toBe('aligned');
      expect(result.canPlace).toBe(true);
    });
  });
});

// =============================================================================
// getValidOrientations TESTS
// =============================================================================

describe('getValidOrientations', () => {
  it('should return both orientations when no grain constraints', () => {
    const piece = createPiece({
      hasGrain: false,
      canRotate: true,
      dimensions: { length: 500, width: 300 },
    });
    const sheet = createSheet({ hasGrain: false });

    const orientations = getValidOrientations(piece, sheet, true);

    expect(orientations).toHaveLength(2);
    expect(orientations[0]).toEqual({
      dimensions: { length: 500, width: 300 },
      rotated: false,
      grainAligned: true,
    });
    expect(orientations[1]).toEqual({
      dimensions: { length: 300, width: 500 },
      rotated: true,
      grainAligned: true,
    });
  });

  it('should return only non-rotated when grains align naturally', () => {
    const piece = createPiece({
      hasGrain: true,
      grainDirection: 'length',
      canRotate: true,
      dimensions: { length: 500, width: 300 },
    });
    const sheet = createSheet({ hasGrain: true, grainDirection: 'length' });

    const orientations = getValidOrientations(piece, sheet, true);

    expect(orientations).toHaveLength(1);
    expect(orientations[0]).toEqual({
      dimensions: { length: 500, width: 300 },
      rotated: false,
      grainAligned: true,
    });
  });

  it('should return only rotated when grains require rotation', () => {
    const piece = createPiece({
      hasGrain: true,
      grainDirection: 'length',
      canRotate: true,
      dimensions: { length: 500, width: 300 },
    });
    const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

    const orientations = getValidOrientations(piece, sheet, true);

    expect(orientations).toHaveLength(1);
    expect(orientations[0]).toEqual({
      dimensions: { length: 300, width: 500 },
      rotated: true,
      grainAligned: true,
    });
  });

  it('should return empty when grain incompatible', () => {
    const piece = createPiece({
      hasGrain: true,
      grainDirection: 'length',
      canRotate: false,
    });
    const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

    const orientations = getValidOrientations(piece, sheet, true);

    expect(orientations).toHaveLength(0);
  });

  it('should include expansion in dimensions', () => {
    const piece = createPiece({
      hasGrain: false,
      canRotate: false,
      dimensions: { length: 500, width: 300 },
      expansion: { length: 10, width: 5 },
    });
    const sheet = createSheet({ hasGrain: false });

    const orientations = getValidOrientations(piece, sheet, true);

    expect(orientations).toHaveLength(1);
    expect(orientations[0].dimensions).toEqual({
      length: 510, // 500 + 10
      width: 305,  // 300 + 5
    });
  });

  it('should return only non-rotated when canRotate is false', () => {
    const piece = createPiece({
      hasGrain: false,
      canRotate: false,
    });
    const sheet = createSheet({ hasGrain: false });

    const orientations = getValidOrientations(piece, sheet, true);

    expect(orientations).toHaveLength(1);
    expect(orientations[0].rotated).toBe(false);
  });
});

// =============================================================================
// canPlaceWithGrain TESTS
// =============================================================================

describe('canPlaceWithGrain', () => {
  it('should return true when forceGrainMatch is false', () => {
    const piece = createPiece({ hasGrain: true, grainDirection: 'length' });
    const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

    expect(canPlaceWithGrain(piece, sheet, false)).toBe(true);
  });

  it('should return true when grains are compatible', () => {
    const piece = createPiece({
      hasGrain: true,
      grainDirection: 'length',
      canRotate: true,
    });
    const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

    expect(canPlaceWithGrain(piece, sheet, true)).toBe(true);
  });

  it('should return false when grains are incompatible', () => {
    const piece = createPiece({
      hasGrain: true,
      grainDirection: 'length',
      canRotate: false,
    });
    const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

    expect(canPlaceWithGrain(piece, sheet, true)).toBe(false);
  });
});

// =============================================================================
// filterPiecesByGrain TESTS
// =============================================================================

describe('filterPiecesByGrain', () => {
  it('should separate compatible and incompatible pieces', () => {
    const pieces = [
      createPiece({
        id: 'p1',
        hasGrain: true,
        grainDirection: 'length',
        canRotate: true,
      }),
      createPiece({
        id: 'p2',
        hasGrain: true,
        grainDirection: 'length',
        canRotate: false,
      }),
      createPiece({
        id: 'p3',
        hasGrain: false,
      }),
    ];
    const sheet = createSheet({ hasGrain: true, grainDirection: 'width' });

    const result = filterPiecesByGrain(pieces, sheet, true);

    expect(result.compatible).toHaveLength(2);
    expect(result.compatible.map(p => p.id)).toEqual(['p1', 'p3']);

    expect(result.incompatible).toHaveLength(1);
    expect(result.incompatible[0].id).toBe('p2');
  });

  it('should return all compatible when forceGrainMatch is false', () => {
    const pieces = [
      createPiece({ id: 'p1', hasGrain: true, grainDirection: 'length', canRotate: false }),
      createPiece({ id: 'p2', hasGrain: true, grainDirection: 'width', canRotate: false }),
    ];
    const sheet = createSheet({ hasGrain: true, grainDirection: 'length' });

    const result = filterPiecesByGrain(pieces, sheet, false);

    expect(result.compatible).toHaveLength(2);
    expect(result.incompatible).toHaveLength(0);
  });
});

// =============================================================================
// groupPiecesByGrain TESTS
// =============================================================================

describe('groupPiecesByGrain', () => {
  it('should group pieces by grain requirement', () => {
    const pieces = [
      createPiece({ id: 'p1', hasGrain: true, grainDirection: 'length' }),
      createPiece({ id: 'p2', hasGrain: true, grainDirection: 'length' }),
      createPiece({ id: 'p3', hasGrain: true, grainDirection: 'width' }),
      createPiece({ id: 'p4', hasGrain: false }),
      createPiece({ id: 'p5', hasGrain: false }),
    ];

    const groups = groupPiecesByGrain(pieces);

    expect(groups.size).toBe(3);
    expect(groups.get('grain_length')?.map(p => p.id)).toEqual(['p1', 'p2']);
    expect(groups.get('grain_width')?.map(p => p.id)).toEqual(['p3']);
    expect(groups.get('no_grain')?.map(p => p.id)).toEqual(['p4', 'p5']);
  });

  it('should default to length when grainDirection not specified', () => {
    const pieces = [
      createPiece({ id: 'p1', hasGrain: true, grainDirection: undefined }),
    ];

    const groups = groupPiecesByGrain(pieces);

    expect(groups.get('grain_length')?.map(p => p.id)).toEqual(['p1']);
  });
});

// =============================================================================
// REAL-WORLD SCENARIOS
// =============================================================================

describe('Real-world grain scenarios', () => {
  it('should handle melamine with horizontal grain', () => {
    // Melamine board with horizontal grain pattern
    const sheet = createSheet({
      hasGrain: true,
      grainDirection: 'length',
      materialName: 'Melamine H1180 ST37',
    });

    // Door panel that must respect grain
    const door = createPiece({
      hasGrain: true,
      grainDirection: 'length',
      canRotate: false,
      name: 'Porte',
    });

    // Side panel that must respect grain but can rotate
    const side = createPiece({
      hasGrain: true,
      grainDirection: 'width',
      canRotate: true,
      name: 'Cote',
    });

    // Shelf without grain constraint
    const shelf = createPiece({
      hasGrain: false,
      canRotate: true,
      name: 'Tablette',
    });

    // Door: grain matches, no rotation needed
    const doorResult = checkGrainAlignment(door, sheet, true);
    expect(doorResult.canPlace).toBe(true);
    expect(doorResult.mustRotate).toBe(false);

    // Side: grain differs but can rotate
    const sideResult = checkGrainAlignment(side, sheet, true);
    expect(sideResult.canPlace).toBe(true);
    expect(sideResult.mustRotate).toBe(true);

    // Shelf: no grain constraint
    const shelfResult = checkGrainAlignment(shelf, sheet, true);
    expect(shelfResult.canPlace).toBe(true);
    expect(shelfResult.mustRotate).toBe(false);
  });

  it('should handle solid wood with strict grain requirements', () => {
    // Solid oak board with vertical grain
    const sheet = createSheet({
      hasGrain: true,
      grainDirection: 'width',
      materialName: 'Chene massif',
    });

    // Table top piece that cannot rotate (grain must follow length)
    const tableTop = createPiece({
      hasGrain: true,
      grainDirection: 'length',
      canRotate: false,
      name: 'Plateau table',
    });

    // This should fail - grain incompatible and no rotation
    const result = checkGrainAlignment(tableTop, sheet, true);
    expect(result.canPlace).toBe(false);
    expect(result.alignment).toBe('incompatible');
  });

  it('should handle MDF without grain', () => {
    // MDF has no grain
    const sheet = createSheet({
      hasGrain: false,
      materialName: 'MDF 18mm',
    });

    // All pieces should be placeable regardless of their grain requirements
    const pieces = [
      createPiece({ hasGrain: true, grainDirection: 'length', canRotate: false }),
      createPiece({ hasGrain: true, grainDirection: 'width', canRotate: false }),
      createPiece({ hasGrain: false }),
    ];

    for (const piece of pieces) {
      const result = checkGrainAlignment(piece, sheet, true);
      expect(result.canPlace).toBe(true);
    }
  });
});
