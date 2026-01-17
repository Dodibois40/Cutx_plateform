/**
 * FiltersService - Handles filter options for the search interface
 *
 * Extracted from CataloguesService for better separation of concerns.
 * Provides dynamic filter values based on actual database content:
 * - productTypes, categories, thicknesses, catalogues
 *
 * CACHED: Results are cached for 5 minutes to reduce database load
 */

import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface FilterOptions {
  productTypes: { value: string; label: string; count: number }[];
  categories: { value: string; label: string; count: number }[];
  thicknesses: { value: number; count: number }[];
  catalogues: { slug: string; name: string }[];
}

@Injectable()
export class FiltersService {
  private static readonly FILTER_OPTIONS_CACHE_TTL = 300000; // 5 minutes

  // Product type labels for display
  private static readonly PRODUCT_TYPE_LABELS: Record<string, string> = {
    MELAMINE: 'Mélaminé',
    STRATIFIE: 'Stratifié',
    PLACAGE: 'Placage / Essence Fine',
    BANDE_DE_CHANT: 'Bande de chant',
    COMPACT: 'Compact',
    MDF: 'MDF',
    CONTREPLAQUE: 'Contreplaqué',
    PANNEAU_MASSIF: 'Panneau massif',
    OSB: 'OSB',
    PARTICULE: 'Particule',
    PLAN_DE_TRAVAIL: 'Plan de travail',
    PANNEAU_DECORATIF: 'Panneau décoratif',
    PANNEAU_3_PLIS: 'Panneau 3 plis',
    SOLID_SURFACE: 'Solid Surface',
    PANNEAU_SPECIAL: 'Panneau spécial',
    PANNEAU_CONSTRUCTION: 'Panneau construction',
    PANNEAU_ISOLANT: 'Panneau isolant',
    CIMENT_BOIS: 'Ciment bois',
    LATTE: 'Latte',
    PANNEAU_ALVEOLAIRE: 'Panneau alvéolaire',
    ALVEOLAIRE: 'Alvéolaire',
    PVC: 'PVC',
    SANITAIRE: 'Sanitaire',
    PORTE: 'Porte',
    COLLE: 'Colle',
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get available filter options based on actual data in the database
   * Returns unique productTypes, categories, and thicknesses with counts
   * Optionally filtered by catalogue
   */
  async getOptions(catalogueSlug?: string): Promise<FilterOptions> {
    // Check cache first
    const cacheKey = `filter-options:${catalogueSlug || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached as FilterOptions;
    }

    // Build catalogue filter condition
    const catalogueCondition = catalogueSlug
      ? Prisma.sql`AND c.slug = ${catalogueSlug}`
      : Prisma.empty;

    // Get unique productType values with counts
    const productTypes = await this.prisma.$queryRaw<
      { value: string; count: bigint }[]
    >`
      SELECT
        p."productType" as value,
        COUNT(*) as count
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      WHERE p."isActive" = true
        AND c."isActive" = true
        AND p."productType" IS NOT NULL
        ${catalogueCondition}
      GROUP BY p."productType"
      ORDER BY count DESC
    `;

    // Get unique category names (using parent category if exists) with counts
    const categories = await this.prisma.$queryRaw<
      { value: string; count: bigint }[]
    >`
      SELECT
        COALESCE(parent.name, cat.name) as value,
        COUNT(*) as count
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE p."isActive" = true
        AND c."isActive" = true
        ${catalogueCondition}
      GROUP BY COALESCE(parent.name, cat.name)
      HAVING COALESCE(parent.name, cat.name) IS NOT NULL
      ORDER BY count DESC
    `;

    // Get unique thickness values from the thickness array with counts
    // Filter out aberrant values (> 100mm are likely data errors - product refs stored as thickness)
    const thicknesses = await this.prisma.$queryRaw<
      { value: number; count: bigint }[]
    >`
      SELECT
        thickness_val as value,
        COUNT(DISTINCT p.id) as count
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id,
      UNNEST(p.thickness) as thickness_val
      WHERE p."isActive" = true
        AND c."isActive" = true
        AND thickness_val > 0
        AND thickness_val <= 100
        ${catalogueCondition}
      GROUP BY thickness_val
      ORDER BY thickness_val ASC
    `;

    // Get all active catalogues
    const catalogues = await this.prisma.catalogue.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true },
    });

    const result: FilterOptions = {
      productTypes: productTypes.map((pt) => ({
        value: pt.value,
        label: FiltersService.PRODUCT_TYPE_LABELS[pt.value] || pt.value,
        count: Number(pt.count),
      })),
      categories: categories.map((cat) => ({
        value: cat.value,
        label: cat.value,
        count: Number(cat.count),
      })),
      thicknesses: thicknesses.map((t) => ({
        value: Number(t.value),
        count: Number(t.count),
      })),
      catalogues: catalogues.map((c) => ({ slug: c.slug, name: c.name })),
    };

    // Store in cache
    await this.cacheManager.set(
      cacheKey,
      result,
      FiltersService.FILTER_OPTIONS_CACHE_TTL,
    );

    return result;
  }

  /**
   * Invalidate filter options cache
   * Should be called after importing/updating products
   *
   * @param catalogueSlug Optional: invalidate only specific catalogue cache
   */
  async invalidateCache(catalogueSlug?: string): Promise<void> {
    if (catalogueSlug) {
      await this.cacheManager.del(`filter-options:${catalogueSlug}`);
    }
    // Always invalidate the global "all" cache
    await this.cacheManager.del('filter-options:all');
  }
}
