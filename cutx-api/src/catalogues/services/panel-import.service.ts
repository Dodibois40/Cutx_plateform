/**
 * Service d'import bulk de panneaux
 * Optimisé pour la scalabilité (100k+ produits)
 *
 * Caractéristiques:
 * - Validation Zod à l'entrée
 * - Auto-classification des bandes de chant
 * - Import par batches de 500 (evite les timeouts)
 * - Séparation INSERT vs UPDATE pour performance
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PanelImportSchema,
  validatePanelImport,
  type PanelImportData,
} from '../schemas/panel-validation.schema';
import { classifyProduct, classifyProducts } from '../utils/product-classifier';

const BATCH_SIZE = 500;

export interface ImportStats {
  total: number;
  validated: number;
  invalid: number;
  inserted: number;
  updated: number;
  skipped: number;
  classificationChanges: {
    edgeBandsReclassified: number;
    pricesMoved: number;
    thicknessAutoFilled: number;
  };
  errors: Array<{ reference: string; error: string }>;
  duration: number;
}

export interface ImportOptions {
  catalogueId: string;
  /**
   * Mode de validation:
   * - 'strict': rejette les données invalides (défaut)
   * - 'lenient': accepte avec warnings
   */
  validationMode?: 'strict' | 'lenient';
  /**
   * Comportement en cas d'existant:
   * - 'update': met à jour (défaut)
   * - 'skip': ignore les existants
   */
  onExisting?: 'update' | 'skip';
  /**
   * Callback de progression
   */
  onProgress?: (progress: {
    current: number;
    total: number;
    phase: string;
  }) => void;
}

@Injectable()
export class PanelImportService {
  private readonly logger = new Logger(PanelImportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Import bulk de panneaux avec validation et classification
   *
   * Performance estimée:
   * - 7,000 panneaux: ~2 minutes
   * - 100,000 panneaux: ~30 minutes
   *
   * @param products Données brutes à importer
   * @param options Options d'import
   * @returns Statistiques d'import
   */
  async importBulk(
    products: unknown[],
    options: ImportOptions,
  ): Promise<ImportStats> {
    const startTime = Date.now();
    const stats: ImportStats = {
      total: products.length,
      validated: 0,
      invalid: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      classificationChanges: {
        edgeBandsReclassified: 0,
        pricesMoved: 0,
        thicknessAutoFilled: 0,
      },
      errors: [],
      duration: 0,
    };

    this.logger.log(`Starting bulk import of ${products.length} products`);
    options.onProgress?.({
      current: 0,
      total: products.length,
      phase: 'validation',
    });

    // ========================================
    // PHASE 1: Validation
    // ========================================
    const validatedProducts: PanelImportData[] = [];
    const validationMode = options.validationMode || 'strict';

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const result = validatePanelImport(product, validationMode);

      if (!result.success) {
        stats.invalid++;
        const ref =
          ((product as Record<string, unknown>)?.reference as string) ||
          `index-${i}`;
        stats.errors.push({
          reference: ref,
          error:
            result.errors?.issues.map((i) => i.message).join('; ') ||
            'Validation failed',
        });
        continue;
      }

      validatedProducts.push(result.data!);
      stats.validated++;

      // Log warnings in lenient mode
      if (result.warnings?.length) {
        const ref = result.data?.reference || `index-${i}`;
        this.logger.warn(`Warnings for ${ref}: ${result.warnings.join(', ')}`);
      }
    }

    this.logger.log(
      `Validation complete: ${stats.validated} valid, ${stats.invalid} invalid`,
    );
    options.onProgress?.({
      current: stats.validated,
      total: products.length,
      phase: 'classification',
    });

    // ========================================
    // PHASE 2: Classification (auto-correction)
    // ========================================
    const { results: classifiedResults, stats: classStats } =
      classifyProducts(validatedProducts);
    stats.classificationChanges = {
      edgeBandsReclassified: classStats.edgeBandsReclassified,
      pricesMoved: classStats.pricesMoved,
      thicknessAutoFilled: classStats.thicknessAutoFilled,
    };

    // Log modifications
    classifiedResults
      .filter((r) => r.wasModified)
      .forEach((r) => {
        this.logger.debug(
          `Modified ${r.data.reference}: ${r.modifications.join(', ')}`,
        );
      });

    const classifiedProducts = classifiedResults.map((r) => r.data);

    this.logger.log(
      `Classification complete: ${classStats.modified} modified ` +
        `(${classStats.edgeBandsReclassified} edge bands reclassified, ` +
        `${classStats.pricesMoved} prices moved, ` +
        `${classStats.thicknessAutoFilled} thickness auto-filled)`,
    );

    // ========================================
    // PHASE 3: Identifier existants vs nouveaux
    // ========================================
    options.onProgress?.({
      current: 0,
      total: classifiedProducts.length,
      phase: 'checking-existing',
    });

    const references = classifiedProducts.map((p) => p.reference);

    // Charger les références existantes par batch pour éviter query trop large
    const existingRefs = new Set<string>();
    for (let i = 0; i < references.length; i += 5000) {
      const batch = references.slice(i, i + 5000);
      const existing = await this.prisma.panel.findMany({
        where: {
          catalogueId: options.catalogueId,
          reference: { in: batch },
        },
        select: { reference: true },
      });
      existing.forEach((p) => existingRefs.add(p.reference));
    }

    const toInsert = classifiedProducts.filter(
      (p) => !existingRefs.has(p.reference),
    );
    const toUpdate = classifiedProducts.filter((p) =>
      existingRefs.has(p.reference),
    );

    this.logger.log(
      `Found ${existingRefs.size} existing, ` +
        `${toInsert.length} to insert, ${toUpdate.length} to update`,
    );

    // ========================================
    // PHASE 4: Bulk INSERT (nouveaux produits)
    // ========================================
    options.onProgress?.({
      current: 0,
      total: toInsert.length,
      phase: 'inserting',
    });

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createData = batch.map((p) => ({
          ...this.mapToPrismaData(p),
          catalogueId: options.catalogueId,
        })) as any;

        const result = await this.prisma.panel.createMany({
          data: createData,
          skipDuplicates: true,
        });

        stats.inserted += result.count;
        options.onProgress?.({
          current: stats.inserted,
          total: toInsert.length,
          phase: 'inserting',
        });
      } catch (error) {
        this.logger.error(`Insert batch failed at index ${i}:`, error);
        // Fallback: insert one by one to identify problematic records
        for (const product of batch) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.prisma.panel.create({
              data: {
                ...this.mapToPrismaData(product),
                catalogueId: options.catalogueId,
              } as any,
            });
            stats.inserted++;
          } catch (e) {
            stats.errors.push({
              reference: product.reference,
              error: e instanceof Error ? e.message : 'Insert failed',
            });
          }
        }
      }
    }

    this.logger.log(`Insert complete: ${stats.inserted} inserted`);

    // ========================================
    // PHASE 5: Bulk UPDATE (produits existants)
    // ========================================
    if (options.onExisting === 'skip') {
      stats.skipped = toUpdate.length;
      this.logger.log(`Skipping ${stats.skipped} existing products`);
    } else {
      options.onProgress?.({
        current: 0,
        total: toUpdate.length,
        phase: 'updating',
      });

      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);

        try {
          // Use transaction for batch updates
          // Note: Array-based transactions don't support timeout option in Prisma
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await this.prisma.$transaction(
            batch.map((p) =>
              this.prisma.panel.update({
                where: {
                  catalogueId_reference: {
                    catalogueId: options.catalogueId,
                    reference: p.reference,
                  },
                },
                data: this.mapToPrismaData(p) as any,
              }),
            ),
          );

          stats.updated += batch.length;
          options.onProgress?.({
            current: stats.updated,
            total: toUpdate.length,
            phase: 'updating',
          });
        } catch (error) {
          this.logger.error(`Update batch failed at index ${i}:`, error);
          // Fallback: update one by one
          for (const product of batch) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await this.prisma.panel.update({
                where: {
                  catalogueId_reference: {
                    catalogueId: options.catalogueId,
                    reference: product.reference,
                  },
                },
                data: this.mapToPrismaData(product) as any,
              });
              stats.updated++;
            } catch (e) {
              stats.errors.push({
                reference: product.reference,
                error: e instanceof Error ? e.message : 'Update failed',
              });
            }
          }
        }
      }

      this.logger.log(`Update complete: ${stats.updated} updated`);
    }

    // ========================================
    // FINALIZATION
    // ========================================
    stats.duration = Date.now() - startTime;

    this.logger.log(
      `Import complete in ${(stats.duration / 1000).toFixed(1)}s: ` +
        `${stats.inserted} inserted, ${stats.updated} updated, ` +
        `${stats.skipped} skipped, ${stats.errors.length} errors`,
    );

    return stats;
  }

  /**
   * Map PanelImportData to Prisma create/update data
   * Filters out undefined values to avoid Prisma type errors
   */
  private mapToPrismaData(product: PanelImportData) {
    // Build object excluding undefined values
    const data: Record<string, unknown> = {
      reference: product.reference,
      name: product.name,
      thickness: product.thickness || [],
      isActive: product.isActive ?? true,
    };

    // Add optional fields only if they have a value (not undefined)
    if (product.defaultThickness !== undefined)
      data.defaultThickness = product.defaultThickness;
    if (product.defaultWidth !== undefined)
      data.defaultWidth = product.defaultWidth;
    if (product.defaultLength !== undefined)
      data.defaultLength = product.defaultLength;
    if (product.pricePerM2 !== undefined) data.pricePerM2 = product.pricePerM2;
    if (product.pricePerMl !== undefined) data.pricePerMl = product.pricePerMl;
    if (product.productType !== undefined)
      data.productType = product.productType;
    if (product.categoryId !== undefined) data.categoryId = product.categoryId;
    if (product.decor !== undefined) data.decor = product.decor;
    if (product.colorChoice !== undefined)
      data.colorChoice = product.colorChoice;
    if (product.material !== undefined) data.material = product.material;
    if (product.stockStatus !== undefined)
      data.stockStatus = product.stockStatus;
    if (product.imageUrl !== undefined) data.imageUrl = product.imageUrl;
    if (product.sousCategorie !== undefined)
      data.sousCategorie = product.sousCategorie;

    return data;
  }

  /**
   * Import simple depuis un fichier JSON
   * Utile pour les imports manuels
   */
  async importFromJson(
    jsonPath: string,
    catalogueId: string,
  ): Promise<ImportStats> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(jsonPath, 'utf-8');
    const products = JSON.parse(content);

    return this.importBulk(products, { catalogueId });
  }

  /**
   * Vérifie la qualité des données après import
   */
  async checkDataQuality(catalogueId?: string): Promise<{
    issues: Array<{ type: string; count: number; examples: string[] }>;
    healthy: boolean;
  }> {
    const catalogueCondition = catalogueId ? { catalogueId } : {};

    const issues: Array<{ type: string; count: number; examples: string[] }> =
      [];

    // 1. Épaisseurs aberrantes
    const aberrantThickness = await this.prisma.panel.findMany({
      where: {
        ...catalogueCondition,
        OR: [{ defaultThickness: { gt: 100 } }],
        isActive: true,
      },
      select: { reference: true, defaultThickness: true },
      take: 5,
    });

    if (aberrantThickness.length > 0) {
      const count = await this.prisma.panel.count({
        where: {
          ...catalogueCondition,
          defaultThickness: { gt: 100 },
          isActive: true,
        },
      });
      issues.push({
        type: 'Épaisseur aberrante (> 100mm)',
        count,
        examples: aberrantThickness.map(
          (p) => `${p.reference}: ${p.defaultThickness}mm`,
        ),
      });
    }

    // 2. Chants potentiellement mal classifiés
    const potentialEdgeBands = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Panel"
      WHERE "defaultWidth" IS NOT NULL
        AND "defaultWidth" <= 50
        AND "defaultThickness" IS NOT NULL
        AND "defaultThickness" <= 2
        AND "productType" != 'BANDE_DE_CHANT'
        AND "isActive" = true
        ${catalogueId ? this.prisma.$queryRaw`AND "catalogueId" = ${catalogueId}` : this.prisma.$queryRaw``}
    `;

    const edgeBandCount = Number(potentialEdgeBands[0]?.count || 0);
    if (edgeBandCount > 0) {
      const examples = await this.prisma.panel.findMany({
        where: {
          ...catalogueCondition,
          defaultWidth: { lte: 50 },
          defaultThickness: { lte: 2 },
          productType: { not: 'BANDE_DE_CHANT' },
          isActive: true,
        },
        select: {
          reference: true,
          productType: true,
          defaultWidth: true,
          defaultThickness: true,
        },
        take: 5,
      });

      issues.push({
        type: 'Chants potentiellement mal classifiés',
        count: edgeBandCount,
        examples: examples.map(
          (p) =>
            `${p.reference}: ${p.productType} (${p.defaultWidth}x${p.defaultThickness}mm)`,
        ),
      });
    }

    // 3. defaultThickness manquant avec thickness[] non vide
    const missingDefaultThickness = await this.prisma.$queryRaw<
      { count: bigint }[]
    >`
      SELECT COUNT(*) as count FROM "Panel"
      WHERE "defaultThickness" IS NULL
        AND array_length(thickness, 1) > 0
        AND "isActive" = true
        ${catalogueId ? this.prisma.$queryRaw`AND "catalogueId" = ${catalogueId}` : this.prisma.$queryRaw``}
    `;

    const missingCount = Number(missingDefaultThickness[0]?.count || 0);
    if (missingCount > 0) {
      issues.push({
        type: 'defaultThickness manquant (thickness[] existe)',
        count: missingCount,
        examples: ['Le trigger devrait auto-remplir ces valeurs'],
      });
    }

    return {
      issues,
      healthy: issues.length === 0,
    };
  }
}
