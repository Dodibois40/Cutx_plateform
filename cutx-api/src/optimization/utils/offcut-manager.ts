/**
 * CutX Offcut (Chutes) Management
 *
 * Gestion des chutes reutilisables:
 * - Identification des chutes apres optimisation
 * - Stockage pour reutilisation future
 * - Integration dans les optimisations suivantes
 */

import { v4 as uuidv4 } from 'uuid';
import {
  FreeSpace,
  SourceSheet,
  UsedSheet,
  Dimensions,
  CuttingPlanStats,
} from '../types/cutting.types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Statut d'une chute
 */
export type OffcutStatus =
  | 'available'    // Disponible pour utilisation
  | 'reserved'     // Reservee pour un projet
  | 'used'         // Utilisee
  | 'discarded';   // Jetee (trop petite, endommagee)

/**
 * Une chute reutilisable
 */
export interface ReusableOffcut {
  id: string;

  // Origine
  originalSheetId: string;       // ID du panneau source
  originalOptimizationId?: string; // ID de l'optimisation qui l'a creee
  createdAt: Date;

  // Materiau
  materialRef: string;
  materialName: string;
  thickness: number;

  // Dimensions
  dimensions: Dimensions;
  area: number; // mm2

  // Contraintes
  hasGrain: boolean;
  grainDirection?: 'length' | 'width';

  // Position sur le panneau original (pour tracabilite)
  position?: { x: number; y: number };

  // Statut
  status: OffcutStatus;
  reservedForProjectId?: string;
  usedAt?: Date;
  usedInOptimizationId?: string;

  // Notes
  notes?: string;

  // Prix estime (si disponible)
  estimatedValue?: number;
}

/**
 * Criteres de filtrage pour les chutes
 */
export interface OffcutFilterCriteria {
  materialRef?: string;
  thickness?: number;
  minLength?: number;
  minWidth?: number;
  minArea?: number;
  hasGrain?: boolean;
  grainDirection?: 'length' | 'width';
  status?: OffcutStatus;
}

/**
 * Configuration pour l'extraction des chutes
 */
export interface OffcutExtractionConfig {
  minLength: number;   // Longueur minimum (mm)
  minWidth: number;    // Largeur minimum (mm)
  minArea?: number;    // Surface minimum (mm2), optionnel
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_OFFCUT_CONFIG: OffcutExtractionConfig = {
  minLength: 300,  // 30cm minimum
  minWidth: 100,   // 10cm minimum
  minArea: 50000,  // 500cm2 minimum (optionnel)
};

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extrait les chutes reutilisables d'un panneau utilise
 */
export function extractOffcutsFromUsedSheet(
  usedSheet: UsedSheet,
  config: OffcutExtractionConfig = DEFAULT_OFFCUT_CONFIG,
  optimizationId?: string,
): ReusableOffcut[] {
  const offcuts: ReusableOffcut[] = [];
  const sheet = usedSheet.sheet;

  for (const freeSpace of usedSheet.freeSpaces) {
    // Verifier les dimensions minimales
    if (
      freeSpace.dimensions.length >= config.minLength &&
      freeSpace.dimensions.width >= config.minWidth
    ) {
      const area = freeSpace.dimensions.length * freeSpace.dimensions.width;

      // Verifier la surface minimale si configuree
      if (config.minArea && area < config.minArea) {
        continue;
      }

      offcuts.push({
        id: `offcut-${uuidv4().slice(0, 8)}`,
        originalSheetId: sheet.id,
        originalOptimizationId: optimizationId,
        createdAt: new Date(),
        materialRef: sheet.materialRef,
        materialName: sheet.materialName,
        thickness: sheet.thickness,
        dimensions: { ...freeSpace.dimensions },
        area,
        hasGrain: sheet.hasGrain,
        grainDirection: sheet.grainDirection,
        position: { ...freeSpace.position },
        status: 'available',
      });
    }
  }

  return offcuts;
}

/**
 * Extrait toutes les chutes d'un plan de decoupe
 */
export function extractAllOffcuts(
  usedSheets: UsedSheet[],
  config: OffcutExtractionConfig = DEFAULT_OFFCUT_CONFIG,
  optimizationId?: string,
): ReusableOffcut[] {
  const allOffcuts: ReusableOffcut[] = [];

  for (const usedSheet of usedSheets) {
    const sheetOffcuts = extractOffcutsFromUsedSheet(usedSheet, config, optimizationId);
    allOffcuts.push(...sheetOffcuts);
  }

  // Trier par surface decroissante (plus grandes chutes d'abord)
  allOffcuts.sort((a, b) => b.area - a.area);

  return allOffcuts;
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convertit une chute en panneau source pour reutilisation
 */
export function offcutToSourceSheet(offcut: ReusableOffcut): SourceSheet {
  return {
    id: offcut.id,
    materialRef: offcut.materialRef,
    materialName: offcut.materialName,
    dimensions: { ...offcut.dimensions },
    thickness: offcut.thickness,
    trim: { top: 0, left: 0, bottom: 0, right: 0 }, // Pas de trim sur les chutes
    hasGrain: offcut.hasGrain,
    grainDirection: offcut.grainDirection,
    isOffcut: true,
    parentSheetId: offcut.originalSheetId,
  };
}

/**
 * Convertit plusieurs chutes en panneaux sources
 */
export function offcutsToSourceSheets(offcuts: ReusableOffcut[]): SourceSheet[] {
  return offcuts
    .filter(o => o.status === 'available')
    .map(offcutToSourceSheet);
}

// =============================================================================
// FILTERING FUNCTIONS
// =============================================================================

/**
 * Filtre les chutes selon des criteres
 */
export function filterOffcuts(
  offcuts: ReusableOffcut[],
  criteria: OffcutFilterCriteria,
): ReusableOffcut[] {
  return offcuts.filter(offcut => {
    if (criteria.materialRef && offcut.materialRef !== criteria.materialRef) {
      return false;
    }
    if (criteria.thickness && offcut.thickness !== criteria.thickness) {
      return false;
    }
    if (criteria.minLength && offcut.dimensions.length < criteria.minLength) {
      return false;
    }
    if (criteria.minWidth && offcut.dimensions.width < criteria.minWidth) {
      return false;
    }
    if (criteria.minArea && offcut.area < criteria.minArea) {
      return false;
    }
    if (criteria.hasGrain !== undefined && offcut.hasGrain !== criteria.hasGrain) {
      return false;
    }
    if (criteria.grainDirection && offcut.grainDirection !== criteria.grainDirection) {
      return false;
    }
    if (criteria.status && offcut.status !== criteria.status) {
      return false;
    }
    return true;
  });
}

/**
 * Trouve les chutes compatibles avec un materiau donne
 */
export function findCompatibleOffcuts(
  offcuts: ReusableOffcut[],
  materialRef: string,
  thickness: number,
  minDimensions?: Dimensions,
): ReusableOffcut[] {
  return filterOffcuts(offcuts, {
    materialRef,
    thickness,
    minLength: minDimensions?.length,
    minWidth: minDimensions?.width,
    status: 'available',
  });
}

// =============================================================================
// STATUS MANAGEMENT
// =============================================================================

/**
 * Reserve une chute pour un projet
 */
export function reserveOffcut(
  offcut: ReusableOffcut,
  projectId: string,
): ReusableOffcut {
  return {
    ...offcut,
    status: 'reserved',
    reservedForProjectId: projectId,
  };
}

/**
 * Marque une chute comme utilisee
 */
export function markOffcutAsUsed(
  offcut: ReusableOffcut,
  optimizationId: string,
): ReusableOffcut {
  return {
    ...offcut,
    status: 'used',
    usedAt: new Date(),
    usedInOptimizationId: optimizationId,
  };
}

/**
 * Libere une chute reservee
 */
export function releaseOffcut(offcut: ReusableOffcut): ReusableOffcut {
  return {
    ...offcut,
    status: 'available',
    reservedForProjectId: undefined,
  };
}

/**
 * Marque une chute comme jetee
 */
export function discardOffcut(
  offcut: ReusableOffcut,
  reason?: string,
): ReusableOffcut {
  return {
    ...offcut,
    status: 'discarded',
    notes: reason ? `${offcut.notes || ''} Discarded: ${reason}`.trim() : offcut.notes,
  };
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Calcule les statistiques du stock de chutes
 */
export interface OffcutStockStats {
  totalCount: number;
  availableCount: number;
  reservedCount: number;
  usedCount: number;
  discardedCount: number;
  totalArea: number;        // mm2
  availableArea: number;    // mm2
  estimatedValue: number;
  byMaterial: Map<string, {
    count: number;
    area: number;
  }>;
  byThickness: Map<number, {
    count: number;
    area: number;
  }>;
}

export function calculateOffcutStats(offcuts: ReusableOffcut[]): OffcutStockStats {
  const stats: OffcutStockStats = {
    totalCount: offcuts.length,
    availableCount: 0,
    reservedCount: 0,
    usedCount: 0,
    discardedCount: 0,
    totalArea: 0,
    availableArea: 0,
    estimatedValue: 0,
    byMaterial: new Map(),
    byThickness: new Map(),
  };

  for (const offcut of offcuts) {
    stats.totalArea += offcut.area;
    stats.estimatedValue += offcut.estimatedValue || 0;

    switch (offcut.status) {
      case 'available':
        stats.availableCount++;
        stats.availableArea += offcut.area;
        break;
      case 'reserved':
        stats.reservedCount++;
        break;
      case 'used':
        stats.usedCount++;
        break;
      case 'discarded':
        stats.discardedCount++;
        break;
    }

    // Par materiau
    const matKey = offcut.materialRef;
    const matStats = stats.byMaterial.get(matKey) || { count: 0, area: 0 };
    matStats.count++;
    matStats.area += offcut.area;
    stats.byMaterial.set(matKey, matStats);

    // Par epaisseur
    const thickStats = stats.byThickness.get(offcut.thickness) || { count: 0, area: 0 };
    thickStats.count++;
    thickStats.area += offcut.area;
    stats.byThickness.set(offcut.thickness, thickStats);
  }

  return stats;
}

// =============================================================================
// SORTING
// =============================================================================

export type OffcutSortField = 'area' | 'length' | 'width' | 'createdAt' | 'thickness';
export type OffcutSortOrder = 'asc' | 'desc';

/**
 * Trie les chutes selon un critere
 */
export function sortOffcuts(
  offcuts: ReusableOffcut[],
  field: OffcutSortField = 'area',
  order: OffcutSortOrder = 'desc',
): ReusableOffcut[] {
  const sorted = [...offcuts];
  const multiplier = order === 'desc' ? -1 : 1;

  sorted.sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case 'area':
        comparison = a.area - b.area;
        break;
      case 'length':
        comparison = a.dimensions.length - b.dimensions.length;
        break;
      case 'width':
        comparison = a.dimensions.width - b.dimensions.width;
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'thickness':
        comparison = a.thickness - b.thickness;
        break;
    }
    return comparison * multiplier;
  });

  return sorted;
}

// =============================================================================
// PRIORITY QUEUE FOR OPTIMIZATION
// =============================================================================

/**
 * Cree une liste de panneaux optimisee pour la reutilisation des chutes
 * Les chutes disponibles sont placees avant les panneaux neufs
 */
export function createOptimizedSheetList(
  availableOffcuts: ReusableOffcut[],
  newSheets: SourceSheet[],
  materialRef: string,
  thickness: number,
): SourceSheet[] {
  // Filtrer les chutes compatibles
  const compatibleOffcuts = findCompatibleOffcuts(
    availableOffcuts,
    materialRef,
    thickness,
  );

  // Trier les chutes par surface decroissante (utiliser les plus grandes d'abord)
  const sortedOffcuts = sortOffcuts(compatibleOffcuts, 'area', 'desc');

  // Convertir les chutes en SourceSheets
  const offcutSheets = offcutsToSourceSheets(sortedOffcuts);

  // Combiner : d'abord les chutes, puis les panneaux neufs
  return [...offcutSheets, ...newSheets];
}
