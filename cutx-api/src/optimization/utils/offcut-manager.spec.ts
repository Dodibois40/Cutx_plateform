/**
 * Tests for CutX Offcut Manager
 */

import {
  extractOffcutsFromUsedSheet,
  extractAllOffcuts,
  offcutToSourceSheet,
  offcutsToSourceSheets,
  filterOffcuts,
  findCompatibleOffcuts,
  reserveOffcut,
  markOffcutAsUsed,
  releaseOffcut,
  discardOffcut,
  calculateOffcutStats,
  sortOffcuts,
  createOptimizedSheetList,
  ReusableOffcut,
  OffcutExtractionConfig,
  DEFAULT_OFFCUT_CONFIG,
} from './offcut-manager';
import { UsedSheet, SourceSheet, FreeSpace, Placement } from '../types/cutting.types';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createUsedSheet(
  freeSpaces: FreeSpace[] = [],
  overrides: Partial<UsedSheet> = {},
): UsedSheet {
  return {
    index: 0,
    sheet: {
      id: 'sheet-1',
      materialRef: 'MEL-H1180',
      materialName: 'Melamine H1180 ST37',
      dimensions: { length: 2800, width: 2070 },
      thickness: 18,
      trim: { top: 10, left: 10, bottom: 10, right: 10 },
      hasGrain: true,
      grainDirection: 'length',
    },
    placements: [],
    freeSpaces,
    cuts: [],
    usedArea: 2000000,
    wasteArea: 500000,
    efficiency: 80,
    usableArea: 2500000,
    usableDimensions: { length: 2780, width: 2050 },
    ...overrides,
  };
}

function createFreeSpace(
  length: number,
  width: number,
  x = 0,
  y = 0,
): FreeSpace {
  return {
    id: `space-${x}-${y}`,
    position: { x, y },
    dimensions: { length, width },
  };
}

function createOffcut(overrides: Partial<ReusableOffcut> = {}): ReusableOffcut {
  return {
    id: 'offcut-1',
    originalSheetId: 'sheet-1',
    createdAt: new Date(),
    materialRef: 'MEL-H1180',
    materialName: 'Melamine H1180 ST37',
    thickness: 18,
    dimensions: { length: 500, width: 300 },
    area: 150000,
    hasGrain: true,
    grainDirection: 'length',
    status: 'available',
    ...overrides,
  };
}

function createSourceSheet(overrides: Partial<SourceSheet> = {}): SourceSheet {
  return {
    id: 'new-sheet-1',
    materialRef: 'MEL-H1180',
    materialName: 'Melamine H1180 ST37',
    dimensions: { length: 2800, width: 2070 },
    thickness: 18,
    trim: { top: 10, left: 10, bottom: 10, right: 10 },
    hasGrain: true,
    grainDirection: 'length',
    ...overrides,
  };
}

// =============================================================================
// extractOffcutsFromUsedSheet TESTS
// =============================================================================

describe('extractOffcutsFromUsedSheet', () => {
  it('should extract offcuts that meet minimum dimensions', () => {
    const usedSheet = createUsedSheet([
      createFreeSpace(500, 300, 0, 0),   // 500x300 = 150000 mm2
      createFreeSpace(400, 200, 500, 0), // 400x200 = 80000 mm2
    ]);

    const offcuts = extractOffcutsFromUsedSheet(usedSheet);

    expect(offcuts).toHaveLength(2);
    expect(offcuts[0].dimensions).toEqual({ length: 500, width: 300 });
    expect(offcuts[1].dimensions).toEqual({ length: 400, width: 200 });
  });

  it('should filter out spaces below minimum dimensions', () => {
    const usedSheet = createUsedSheet([
      createFreeSpace(500, 300, 0, 0),   // OK: 500 >= 300, 300 >= 100
      createFreeSpace(200, 50, 500, 0),  // Too small: width 50 < 100
      createFreeSpace(50, 200, 700, 0),  // Too small: length 50 < 300
    ]);

    const offcuts = extractOffcutsFromUsedSheet(usedSheet);

    expect(offcuts).toHaveLength(1);
    expect(offcuts[0].dimensions).toEqual({ length: 500, width: 300 });
  });

  it('should apply custom minimum dimensions', () => {
    const usedSheet = createUsedSheet([
      createFreeSpace(500, 300, 0, 0),
      createFreeSpace(400, 200, 500, 0),
    ]);

    const config: OffcutExtractionConfig = {
      minLength: 450,
      minWidth: 250,
    };

    const offcuts = extractOffcutsFromUsedSheet(usedSheet, config);

    expect(offcuts).toHaveLength(1);
    expect(offcuts[0].dimensions).toEqual({ length: 500, width: 300 });
  });

  it('should apply minimum area filter', () => {
    const usedSheet = createUsedSheet([
      createFreeSpace(500, 300, 0, 0),   // Area: 150000 mm2
      createFreeSpace(400, 200, 500, 0), // Area: 80000 mm2
    ]);

    const config: OffcutExtractionConfig = {
      minLength: 300,
      minWidth: 100,
      minArea: 100000, // 1000 cm2
    };

    const offcuts = extractOffcutsFromUsedSheet(usedSheet, config);

    expect(offcuts).toHaveLength(1);
    expect(offcuts[0].area).toBe(150000);
  });

  it('should copy material properties from source sheet', () => {
    const usedSheet = createUsedSheet([createFreeSpace(500, 300)]);

    const offcuts = extractOffcutsFromUsedSheet(usedSheet);

    expect(offcuts[0].materialRef).toBe('MEL-H1180');
    expect(offcuts[0].materialName).toBe('Melamine H1180 ST37');
    expect(offcuts[0].thickness).toBe(18);
    expect(offcuts[0].hasGrain).toBe(true);
    expect(offcuts[0].grainDirection).toBe('length');
  });

  it('should set status to available', () => {
    const usedSheet = createUsedSheet([createFreeSpace(500, 300)]);

    const offcuts = extractOffcutsFromUsedSheet(usedSheet);

    expect(offcuts[0].status).toBe('available');
  });

  it('should store optimization ID if provided', () => {
    const usedSheet = createUsedSheet([createFreeSpace(500, 300)]);

    const offcuts = extractOffcutsFromUsedSheet(usedSheet, DEFAULT_OFFCUT_CONFIG, 'opt-123');

    expect(offcuts[0].originalOptimizationId).toBe('opt-123');
  });

  it('should return empty array when no free spaces', () => {
    const usedSheet = createUsedSheet([]);

    const offcuts = extractOffcutsFromUsedSheet(usedSheet);

    expect(offcuts).toHaveLength(0);
  });
});

// =============================================================================
// extractAllOffcuts TESTS
// =============================================================================

describe('extractAllOffcuts', () => {
  it('should extract offcuts from multiple sheets', () => {
    const sheets = [
      createUsedSheet([createFreeSpace(500, 300)]),
      createUsedSheet([createFreeSpace(600, 400)]),
    ];

    const offcuts = extractAllOffcuts(sheets);

    expect(offcuts).toHaveLength(2);
  });

  it('should sort offcuts by area descending', () => {
    const sheets = [
      createUsedSheet([createFreeSpace(400, 300)]),  // 120000
      createUsedSheet([createFreeSpace(600, 400)]),  // 240000
      createUsedSheet([createFreeSpace(500, 350)]),  // 175000
    ];

    const offcuts = extractAllOffcuts(sheets);

    expect(offcuts[0].area).toBe(240000);
    expect(offcuts[1].area).toBe(175000);
    expect(offcuts[2].area).toBe(120000);
  });
});

// =============================================================================
// offcutToSourceSheet TESTS
// =============================================================================

describe('offcutToSourceSheet', () => {
  it('should convert offcut to source sheet', () => {
    const offcut = createOffcut({
      id: 'offcut-123',
      materialRef: 'MEL-H1180',
      dimensions: { length: 500, width: 300 },
      thickness: 18,
      hasGrain: true,
      grainDirection: 'length',
    });

    const sheet = offcutToSourceSheet(offcut);

    expect(sheet.id).toBe('offcut-123');
    expect(sheet.materialRef).toBe('MEL-H1180');
    expect(sheet.dimensions).toEqual({ length: 500, width: 300 });
    expect(sheet.thickness).toBe(18);
    expect(sheet.hasGrain).toBe(true);
    expect(sheet.grainDirection).toBe('length');
  });

  it('should set isOffcut to true', () => {
    const offcut = createOffcut();
    const sheet = offcutToSourceSheet(offcut);

    expect(sheet.isOffcut).toBe(true);
  });

  it('should reference parent sheet', () => {
    const offcut = createOffcut({ originalSheetId: 'parent-sheet-1' });
    const sheet = offcutToSourceSheet(offcut);

    expect(sheet.parentSheetId).toBe('parent-sheet-1');
  });

  it('should have no trim', () => {
    const offcut = createOffcut();
    const sheet = offcutToSourceSheet(offcut);

    expect(sheet.trim).toEqual({ top: 0, left: 0, bottom: 0, right: 0 });
  });
});

// =============================================================================
// offcutsToSourceSheets TESTS
// =============================================================================

describe('offcutsToSourceSheets', () => {
  it('should convert only available offcuts', () => {
    const offcuts = [
      createOffcut({ id: '1', status: 'available' }),
      createOffcut({ id: '2', status: 'reserved' }),
      createOffcut({ id: '3', status: 'available' }),
      createOffcut({ id: '4', status: 'used' }),
    ];

    const sheets = offcutsToSourceSheets(offcuts);

    expect(sheets).toHaveLength(2);
    expect(sheets.map(s => s.id)).toEqual(['1', '3']);
  });
});

// =============================================================================
// filterOffcuts TESTS
// =============================================================================

describe('filterOffcuts', () => {
  const offcuts = [
    createOffcut({ id: '1', materialRef: 'MEL-H1180', thickness: 18, dimensions: { length: 500, width: 300 }, area: 150000, hasGrain: true, grainDirection: 'length', status: 'available' }),
    createOffcut({ id: '2', materialRef: 'MEL-H1180', thickness: 19, dimensions: { length: 600, width: 400 }, area: 240000, hasGrain: true, grainDirection: 'width', status: 'available' }),
    createOffcut({ id: '3', materialRef: 'MDF-001', thickness: 18, dimensions: { length: 400, width: 200 }, area: 80000, hasGrain: false, grainDirection: undefined, status: 'reserved' }),
  ];

  it('should filter by material reference', () => {
    const result = filterOffcuts(offcuts, { materialRef: 'MEL-H1180' });
    expect(result).toHaveLength(2);
  });

  it('should filter by thickness', () => {
    const result = filterOffcuts(offcuts, { thickness: 18 });
    expect(result).toHaveLength(2);
  });

  it('should filter by minimum length', () => {
    const result = filterOffcuts(offcuts, { minLength: 500 });
    expect(result).toHaveLength(2);
  });

  it('should filter by minimum width', () => {
    const result = filterOffcuts(offcuts, { minWidth: 300 });
    expect(result).toHaveLength(2);
  });

  it('should filter by minimum area', () => {
    const result = filterOffcuts(offcuts, { minArea: 100000 });
    expect(result).toHaveLength(2);
  });

  it('should filter by grain', () => {
    const result = filterOffcuts(offcuts, { hasGrain: true });
    expect(result).toHaveLength(2);
  });

  it('should filter by grain direction', () => {
    const result = filterOffcuts(offcuts, { grainDirection: 'length' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by status', () => {
    const result = filterOffcuts(offcuts, { status: 'reserved' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('should combine multiple filters', () => {
    const result = filterOffcuts(offcuts, {
      materialRef: 'MEL-H1180',
      thickness: 18,
      status: 'available',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

// =============================================================================
// findCompatibleOffcuts TESTS
// =============================================================================

describe('findCompatibleOffcuts', () => {
  it('should find offcuts matching material and thickness', () => {
    const offcuts = [
      createOffcut({ id: '1', materialRef: 'MEL-H1180', thickness: 18, status: 'available' }),
      createOffcut({ id: '2', materialRef: 'MEL-H1180', thickness: 19, status: 'available' }),
      createOffcut({ id: '3', materialRef: 'MDF-001', thickness: 18, status: 'available' }),
    ];

    const result = findCompatibleOffcuts(offcuts, 'MEL-H1180', 18);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should filter by minimum dimensions', () => {
    const offcuts = [
      createOffcut({ id: '1', materialRef: 'MEL-H1180', thickness: 18, dimensions: { length: 500, width: 300 }, status: 'available' }),
      createOffcut({ id: '2', materialRef: 'MEL-H1180', thickness: 18, dimensions: { length: 300, width: 200 }, status: 'available' }),
    ];

    const result = findCompatibleOffcuts(offcuts, 'MEL-H1180', 18, { length: 400, width: 250 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

// =============================================================================
// STATUS MANAGEMENT TESTS
// =============================================================================

describe('Status Management', () => {
  describe('reserveOffcut', () => {
    it('should mark offcut as reserved', () => {
      const offcut = createOffcut({ status: 'available' });
      const reserved = reserveOffcut(offcut, 'project-123');

      expect(reserved.status).toBe('reserved');
      expect(reserved.reservedForProjectId).toBe('project-123');
    });
  });

  describe('markOffcutAsUsed', () => {
    it('should mark offcut as used', () => {
      const offcut = createOffcut({ status: 'reserved' });
      const used = markOffcutAsUsed(offcut, 'opt-456');

      expect(used.status).toBe('used');
      expect(used.usedInOptimizationId).toBe('opt-456');
      expect(used.usedAt).toBeInstanceOf(Date);
    });
  });

  describe('releaseOffcut', () => {
    it('should release reserved offcut', () => {
      const offcut = createOffcut({ status: 'reserved', reservedForProjectId: 'project-123' });
      const released = releaseOffcut(offcut);

      expect(released.status).toBe('available');
      expect(released.reservedForProjectId).toBeUndefined();
    });
  });

  describe('discardOffcut', () => {
    it('should mark offcut as discarded', () => {
      const offcut = createOffcut({ status: 'available' });
      const discarded = discardOffcut(offcut, 'Too damaged');

      expect(discarded.status).toBe('discarded');
      expect(discarded.notes).toContain('Discarded: Too damaged');
    });

    it('should append to existing notes', () => {
      const offcut = createOffcut({ notes: 'Has scratches.' });
      const discarded = discardOffcut(offcut, 'Too damaged');

      expect(discarded.notes).toBe('Has scratches. Discarded: Too damaged');
    });
  });
});

// =============================================================================
// calculateOffcutStats TESTS
// =============================================================================

describe('calculateOffcutStats', () => {
  it('should calculate stats for empty list', () => {
    const stats = calculateOffcutStats([]);

    expect(stats.totalCount).toBe(0);
    expect(stats.totalArea).toBe(0);
  });

  it('should count offcuts by status', () => {
    const offcuts = [
      createOffcut({ status: 'available', area: 100000 }),
      createOffcut({ status: 'available', area: 200000 }),
      createOffcut({ status: 'reserved', area: 150000 }),
      createOffcut({ status: 'used', area: 120000 }),
      createOffcut({ status: 'discarded', area: 80000 }),
    ];

    const stats = calculateOffcutStats(offcuts);

    expect(stats.totalCount).toBe(5);
    expect(stats.availableCount).toBe(2);
    expect(stats.reservedCount).toBe(1);
    expect(stats.usedCount).toBe(1);
    expect(stats.discardedCount).toBe(1);
  });

  it('should calculate areas', () => {
    const offcuts = [
      createOffcut({ status: 'available', area: 100000 }),
      createOffcut({ status: 'available', area: 200000 }),
      createOffcut({ status: 'reserved', area: 150000 }),
    ];

    const stats = calculateOffcutStats(offcuts);

    expect(stats.totalArea).toBe(450000);
    expect(stats.availableArea).toBe(300000);
  });

  it('should group by material', () => {
    const offcuts = [
      createOffcut({ materialRef: 'MEL-H1180', area: 100000 }),
      createOffcut({ materialRef: 'MEL-H1180', area: 200000 }),
      createOffcut({ materialRef: 'MDF-001', area: 150000 }),
    ];

    const stats = calculateOffcutStats(offcuts);

    expect(stats.byMaterial.get('MEL-H1180')).toEqual({ count: 2, area: 300000 });
    expect(stats.byMaterial.get('MDF-001')).toEqual({ count: 1, area: 150000 });
  });

  it('should group by thickness', () => {
    const offcuts = [
      createOffcut({ thickness: 18, area: 100000 }),
      createOffcut({ thickness: 18, area: 200000 }),
      createOffcut({ thickness: 19, area: 150000 }),
    ];

    const stats = calculateOffcutStats(offcuts);

    expect(stats.byThickness.get(18)).toEqual({ count: 2, area: 300000 });
    expect(stats.byThickness.get(19)).toEqual({ count: 1, area: 150000 });
  });
});

// =============================================================================
// sortOffcuts TESTS
// =============================================================================

describe('sortOffcuts', () => {
  const offcuts = [
    createOffcut({ id: '1', dimensions: { length: 500, width: 300 }, area: 150000, thickness: 18, createdAt: new Date('2024-01-01') }),
    createOffcut({ id: '2', dimensions: { length: 600, width: 400 }, area: 240000, thickness: 19, createdAt: new Date('2024-01-03') }),
    createOffcut({ id: '3', dimensions: { length: 400, width: 200 }, area: 80000, thickness: 16, createdAt: new Date('2024-01-02') }),
  ];

  it('should sort by area descending', () => {
    const sorted = sortOffcuts(offcuts, 'area', 'desc');
    expect(sorted.map(o => o.id)).toEqual(['2', '1', '3']);
  });

  it('should sort by area ascending', () => {
    const sorted = sortOffcuts(offcuts, 'area', 'asc');
    expect(sorted.map(o => o.id)).toEqual(['3', '1', '2']);
  });

  it('should sort by length', () => {
    const sorted = sortOffcuts(offcuts, 'length', 'desc');
    expect(sorted.map(o => o.id)).toEqual(['2', '1', '3']);
  });

  it('should sort by width', () => {
    const sorted = sortOffcuts(offcuts, 'width', 'desc');
    expect(sorted.map(o => o.id)).toEqual(['2', '1', '3']);
  });

  it('should sort by createdAt', () => {
    const sorted = sortOffcuts(offcuts, 'createdAt', 'asc');
    expect(sorted.map(o => o.id)).toEqual(['1', '3', '2']);
  });

  it('should sort by thickness', () => {
    const sorted = sortOffcuts(offcuts, 'thickness', 'asc');
    expect(sorted.map(o => o.id)).toEqual(['3', '1', '2']);
  });
});

// =============================================================================
// createOptimizedSheetList TESTS
// =============================================================================

describe('createOptimizedSheetList', () => {
  it('should place compatible offcuts before new sheets', () => {
    const offcuts = [
      createOffcut({ id: 'offcut-1', materialRef: 'MEL-H1180', thickness: 18, area: 150000, status: 'available' }),
      createOffcut({ id: 'offcut-2', materialRef: 'MEL-H1180', thickness: 18, area: 200000, status: 'available' }),
      createOffcut({ id: 'offcut-3', materialRef: 'MDF-001', thickness: 18, area: 250000, status: 'available' }), // Different material
    ];

    const newSheets = [
      createSourceSheet({ id: 'new-1' }),
      createSourceSheet({ id: 'new-2' }),
    ];

    const result = createOptimizedSheetList(offcuts, newSheets, 'MEL-H1180', 18);

    expect(result).toHaveLength(4);
    // Offcuts sorted by area (largest first), then new sheets
    expect(result[0].id).toBe('offcut-2'); // 200000
    expect(result[1].id).toBe('offcut-1'); // 150000
    expect(result[2].id).toBe('new-1');
    expect(result[3].id).toBe('new-2');
  });

  it('should skip reserved and used offcuts', () => {
    const offcuts = [
      createOffcut({ id: 'offcut-1', materialRef: 'MEL-H1180', thickness: 18, status: 'available' }),
      createOffcut({ id: 'offcut-2', materialRef: 'MEL-H1180', thickness: 18, status: 'reserved' }),
      createOffcut({ id: 'offcut-3', materialRef: 'MEL-H1180', thickness: 18, status: 'used' }),
    ];

    const newSheets = [createSourceSheet({ id: 'new-1' })];

    const result = createOptimizedSheetList(offcuts, newSheets, 'MEL-H1180', 18);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('offcut-1');
    expect(result[1].id).toBe('new-1');
  });

  it('should return only new sheets when no compatible offcuts', () => {
    const offcuts = [
      createOffcut({ id: 'offcut-1', materialRef: 'MDF-001', thickness: 18, status: 'available' }),
    ];

    const newSheets = [
      createSourceSheet({ id: 'new-1', materialRef: 'MEL-H1180' }),
    ];

    const result = createOptimizedSheetList(offcuts, newSheets, 'MEL-H1180', 18);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('new-1');
  });
});
