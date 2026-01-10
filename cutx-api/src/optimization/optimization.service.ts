import { Injectable, Logger } from '@nestjs/common';
import {
  CuttingPiece,
  SourceSheet,
  OptimizationParams,
  CuttingPlan,
  UsedSheet,
  DEFAULT_OPTIMIZATION_PARAMS,
} from './types/cutting.types';
import {
  optimizeCuttingPlan,
  optimizeWithIterations,
  smartOptimize,
  OptimizeResult,
} from './algorithms/multi-sheet-optimizer';
import {
  extractAllOffcuts,
  offcutsToSourceSheets,
  filterOffcuts,
  calculateOffcutStats,
  createOptimizedSheetList,
  ReusableOffcut,
  OffcutExtractionConfig,
  OffcutFilterCriteria,
  OffcutStockStats,
  DEFAULT_OFFCUT_CONFIG,
} from './utils/offcut-manager';

export interface OptimizationRequest {
  pieces: CuttingPiece[];
  sheets: SourceSheet[];
  params?: Partial<OptimizationParams>;
  useIterations?: boolean;
  useSmartOptimize?: boolean;
  useOffcuts?: boolean;
  offcutStock?: ReusableOffcut[];
}

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);

  /**
   * Optimise un plan de decoupe
   */
  async optimize(request: OptimizationRequest): Promise<OptimizeResult & { reusableOffcuts?: ReusableOffcut[] }> {
    this.logger.log(
      `Starting optimization: ${request.pieces.length} pieces, ${request.sheets.length} sheets`,
    );

    const startTime = Date.now();

    try {
      let sheets = request.sheets;

      // Integrate offcuts from stock if enabled
      if (request.useOffcuts && request.offcutStock && request.offcutStock.length > 0) {
        // Get the first sheet's material for compatibility check
        const primarySheet = request.sheets[0];
        if (primarySheet) {
          sheets = createOptimizedSheetList(
            request.offcutStock,
            request.sheets,
            primarySheet.materialRef,
            primarySheet.thickness,
          );
          this.logger.log(
            `Using ${sheets.length - request.sheets.length} offcuts from stock`,
          );
        }
      }

      let result: OptimizeResult;

      if (request.useSmartOptimize) {
        // Use comparator to find the best algorithm for each sheet
        result = await smartOptimize(
          request.pieces,
          sheets,
          request.params,
        );
      } else if (request.useIterations) {
        // Utiliser plusieurs strategies et garder la meilleure
        result = await optimizeWithIterations(
          request.pieces,
          sheets,
          request.params,
        );
      } else {
        // Optimisation simple
        result = await optimizeCuttingPlan(
          request.pieces,
          sheets,
          request.params,
        );
      }

      // Extract reusable offcuts from the result
      const reusableOffcuts = this.extractReusableOffcuts(result.plan.sheets);

      const duration = Date.now() - startTime;
      this.logger.log(
        `Optimization completed in ${duration}ms: ${result.plan.stats.placedPieces}/${result.plan.stats.totalPieces} pieces placed on ${result.plan.stats.totalSheets} sheets (${result.plan.stats.globalEfficiency.toFixed(1)}% efficiency), ${reusableOffcuts.length} reusable offcuts`,
      );

      return {
        ...result,
        reusableOffcuts,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Optimization failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract reusable offcuts from used sheets
   */
  extractReusableOffcuts(
    usedSheets: UsedSheet[],
    config: OffcutExtractionConfig = DEFAULT_OFFCUT_CONFIG,
  ): ReusableOffcut[] {
    return extractAllOffcuts(usedSheets, config);
  }

  /**
   * Filter offcuts by criteria
   */
  filterOffcutStock(
    offcuts: ReusableOffcut[],
    criteria: OffcutFilterCriteria,
  ): ReusableOffcut[] {
    return filterOffcuts(offcuts, criteria);
  }

  /**
   * Calculate offcut stock statistics
   */
  getOffcutStats(offcuts: ReusableOffcut[]): OffcutStockStats {
    return calculateOffcutStats(offcuts);
  }

  /**
   * Convert offcuts to source sheets for optimization
   */
  offcutsToSheets(offcuts: ReusableOffcut[]): SourceSheet[] {
    return offcutsToSourceSheets(offcuts);
  }

  /**
   * Cree un panneau source a partir des parametres courants
   */
  createDefaultSheet(
    materialRef: string,
    materialName: string,
    length: number,
    width: number,
    thickness: number,
    options: Partial<SourceSheet> = {},
  ): SourceSheet {
    return {
      id: `sheet-${Date.now()}`,
      materialRef,
      materialName,
      dimensions: { length, width },
      thickness,
      trim: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      },
      hasGrain: false,
      ...options,
    };
  }

  /**
   * Cree une piece a decouper
   */
  createPiece(
    id: string,
    name: string,
    length: number,
    width: number,
    quantity: number = 1,
    options: Partial<CuttingPiece> = {},
  ): CuttingPiece {
    return {
      id,
      name,
      dimensions: { length, width },
      quantity,
      hasGrain: false,
      canRotate: true,
      expansion: { length: 0, width: 0 },
      ...options,
    };
  }

  /**
   * Retourne les parametres par defaut
   */
  getDefaultParams(): OptimizationParams {
    return { ...DEFAULT_OPTIMIZATION_PARAMS };
  }

  /**
   * Genere un rapport texte du plan de decoupe
   */
  generateTextReport(plan: CuttingPlan): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('PLAN DE DECOUPE CUTX');
    lines.push('='.repeat(60));
    lines.push('');

    // Statistiques globales
    lines.push('STATISTIQUES GLOBALES');
    lines.push('-'.repeat(40));
    lines.push(`Pieces placees: ${plan.stats.placedPieces}/${plan.stats.totalPieces}`);
    lines.push(`Panneaux utilises: ${plan.stats.totalSheets}`);
    lines.push(`Efficacite globale: ${plan.stats.globalEfficiency.toFixed(1)}%`);
    lines.push(`Surface utilisee: ${(plan.stats.totalUsedArea / 1_000_000).toFixed(2)} m2`);
    lines.push(`Surface perdue: ${(plan.stats.totalWasteArea / 1_000_000).toFixed(2)} m2`);
    lines.push(`Nombre de coupes: ${plan.stats.totalCuts}`);

    if (plan.stats.totalSheetCost !== undefined) {
      lines.push(`Cout total: ${plan.stats.totalSheetCost.toFixed(2)} EUR`);
    }

    lines.push('');

    // Detail par panneau
    for (const sheet of plan.sheets) {
      lines.push('='.repeat(60));
      lines.push(`PANNEAU ${sheet.index + 1}: ${sheet.sheet.materialName}`);
      lines.push(`Dimensions: ${sheet.sheet.dimensions.length} x ${sheet.sheet.dimensions.width} mm`);
      lines.push(`Efficacite: ${sheet.efficiency.toFixed(1)}%`);
      lines.push('-'.repeat(40));

      for (const placement of sheet.placements) {
        const rotatedStr = placement.rotated ? ' (pivote)' : '';
        lines.push(
          `  - Position (${placement.position.x}, ${placement.position.y}): ` +
          `${placement.finalDimensions.length} x ${placement.finalDimensions.width} mm${rotatedStr}`,
        );
      }

      if (sheet.freeSpaces.length > 0) {
        lines.push('');
        lines.push('Chutes:');
        for (const space of sheet.freeSpaces) {
          lines.push(
            `  - ${space.dimensions.length} x ${space.dimensions.width} mm ` +
            `@ (${space.position.x}, ${space.position.y})`,
          );
        }
      }

      lines.push('');
    }

    // Pieces non placees
    if (plan.unplacedPieces.length > 0) {
      lines.push('='.repeat(60));
      lines.push('PIECES NON PLACEES');
      lines.push('-'.repeat(40));
      for (const piece of plan.unplacedPieces) {
        lines.push(
          `  - ${piece.name}: ${piece.dimensions.length} x ${piece.dimensions.width} mm`,
        );
      }
    }

    return lines.join('\n');
  }
}
