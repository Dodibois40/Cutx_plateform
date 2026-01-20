/**
 * SmartSearchService - Handles intelligent natural language search
 *
 * Extracted from CataloguesService for better separation of concerns.
 * Provides smart search that parses natural language queries:
 * - "mdf 19" → productType: MDF, thickness: 19mm
 * - "méla gris foncé" → productType: MELAMINE, search: "gris foncé"
 * - "agglo chêne 19" → productType: PARTICULE, search: "chêne", thickness: 19mm
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Panel } from '@prisma/client';
import {
  parseSmartQuery,
  buildSmartSearchSQL,
} from '../utils/smart-search-parser';
import { SearchService } from './search.service';
import { FacetsService, FacetsResult } from './facets.service';
import { FullTextSearchResult } from './types';

export interface SmartSearchOptions {
  page?: number;
  limit?: number;
  catalogueSlug?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  enStock?: boolean;
  // Category: panels (all except chants), chants (only chants), all (everything)
  category?: 'panels' | 'chants' | 'all';
  // Category slug from tree navigation (e.g. 'chants-abs', 'essences-chene')
  categorySlug?: string;
  // Explicit filters
  decorCategory?: string;
  manufacturer?: string;
  isHydrofuge?: boolean;
  isIgnifuge?: boolean;
  isPreglued?: boolean;
  // Chant material filter: 'ABS' | 'BOIS' | 'MELAMINE' | 'PVC'
  // Maps to panelSubType: CHANT_ABS, CHANT_BOIS, CHANT_MELAMINE, CHANT_PVC
  chantMaterial?: string;
}

export interface SmartSearchParsed {
  productTypes: string[];
  subcategories: string[];
  thickness: number | null;
  searchTerms: string[];
  originalQuery: string;
}

export interface SmartSearchResult {
  panels: Panel[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
  parsed: SmartSearchParsed;
  facets: FacetsResult;
}

@Injectable()
export class SmartSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly facetsService: FacetsService,
  ) {}

  /**
   * Smart Search: Parse natural language query and apply filters automatically
   *
   * @example
   * - "mdf 19" → productType: MDF, thickness: 19mm
   * - "méla gris foncé" → productType: MELAMINE, search: "gris foncé"
   * - "agglo chêne 19" → productType: PARTICULE, search: "chêne", thickness: 19mm
   * - "strat blanc 0.8" → productType: STRATIFIE, search: "blanc", thickness: 0.8mm
   */
  async search(
    query: string,
    options?: SmartSearchOptions,
  ): Promise<SmartSearchResult> {
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const offset = (page - 1) * limit;

    // Parse the query
    const parsed = parseSmartQuery(query);

    // Build SQL conditions
    const { whereClause, params } = buildSmartSearchSQL(parsed);

    // Add catalogue filter if specified
    let catalogueCondition = '';
    if (options?.catalogueSlug) {
      catalogueCondition = `AND c.slug = $${params.length + 1}`;
      params.push(options.catalogueSlug);
    }

    // Add stock filter if specified
    let stockCondition = '';
    if (options?.enStock) {
      stockCondition = `AND p."stockStatus" = 'EN STOCK'`;
    }

    // Add category filter (panels vs chants)
    let categoryCondition = '';
    if (options?.category === 'panels') {
      // All products EXCEPT chants
      categoryCondition = `AND (p."panelType" IS NULL OR p."panelType" != 'CHANT')`;
    } else if (options?.category === 'chants') {
      // Only chants
      categoryCondition = `AND p."panelType" = 'CHANT'`;
    }
    // 'all' or undefined = no filter

    // Add tree category slug filter (matches category or parent category)
    let treeCategoryCondition = '';
    if (options?.categorySlug) {
      treeCategoryCondition = `AND (cat.slug = $${params.length + 1} OR parent.slug = $${params.length + 1})`;
      params.push(options.categorySlug);
    }

    // Save param count BEFORE explicit filters (for facets)
    const baseParamsCount = params.length;

    // Add explicit filters (decorCategory, manufacturer, properties)
    let explicitFilters = '';
    if (options?.decorCategory) {
      // Cast to enum type for PostgreSQL comparison
      explicitFilters += ` AND p."decorCategory" = $${params.length + 1}::"DecorCategory"`;
      params.push(options.decorCategory);
    }
    if (options?.manufacturer) {
      explicitFilters += ` AND p.manufacturer = $${params.length + 1}`;
      params.push(options.manufacturer);
    }
    if (options?.isHydrofuge) {
      explicitFilters += ` AND p."isHydrofuge" = true`;
    }
    if (options?.isIgnifuge) {
      explicitFilters += ` AND p."isIgnifuge" = true`;
    }
    if (options?.isPreglued) {
      explicitFilters += ` AND p."isPreglued" = true`;
    }
    // Chant material filter - maps short names to panelSubType enum
    if (options?.chantMaterial) {
      const chantMaterialMap: Record<string, string> = {
        ABS: 'CHANT_ABS',
        BOIS: 'CHANT_BOIS',
        MELAMINE: 'CHANT_MELAMINE',
        PVC: 'CHANT_PVC',
        // Also accept full enum names
        CHANT_ABS: 'CHANT_ABS',
        CHANT_BOIS: 'CHANT_BOIS',
        CHANT_MELAMINE: 'CHANT_MELAMINE',
        CHANT_PVC: 'CHANT_PVC',
      };
      const subType =
        chantMaterialMap[options.chantMaterial.toUpperCase()] ||
        options.chantMaterial;
      explicitFilters += ` AND p."panelSubType" = $${params.length + 1}::"ProductSubType"`;
      params.push(subType);
    }

    // Build ORDER BY
    const sortBy = options?.sortBy || 'name';
    const sortDir = (options?.sortDirection || 'asc').toUpperCase();
    const orderByClause = this.searchService.buildOrderByClause(
      sortBy,
      sortDir,
    );

    // Main query - explicit columns (avoids searchVector tsvector)
    const sql = `
      SELECT
        p.id,
        p.reference,
        p.name,
        p.description,
        p.thickness,
        p."defaultLength",
        p."defaultWidth",
        p."defaultThickness",
        p."isVariableLength",
        p."pricePerM2",
        p."pricePerMl",
        p."pricePerUnit",
        p."productType",
        p.material,
        p.finish,
        p."colorCode",
        p."imageUrl",
        p."isActive",
        p."stockStatus",
        p."manufacturerRef",
        p."createdAt",
        p."updatedAt",
        c.name as catalogue_name,
        cat.name as category_name,
        cat.slug as category_slug,
        parent.name as parent_name,
        parent.slug as parent_slug
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        ${catalogueCondition}
        ${stockCondition}
        ${categoryCondition}
        ${treeCategoryCondition}
        ${explicitFilters}
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        ${catalogueCondition}
        ${stockCondition}
        ${categoryCondition}
        ${treeCategoryCondition}
        ${explicitFilters}
    `;

    // Execute queries
    const [results, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<FullTextSearchResult[]>(sql, ...params),
      this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countSql, ...params),
    ]);

    const total = Number(countResult[0]?.total || 0);

    // Transform results
    const panels = this.transformResults(results);

    const hasMore = offset + panels.length < total;

    // Aggregate available facets (without explicit filters to allow changes)
    // Only use base params (before decorCategory, manufacturer, etc.)
    // categoryCondition and treeCategoryCondition are included so facets reflect the current filter state
    const facets = await this.facetsService.aggregate(
      whereClause,
      params.slice(0, baseParamsCount),
      `${catalogueCondition} ${categoryCondition} ${treeCategoryCondition}`,
    );

    return {
      panels: panels as unknown as Panel[],
      total,
      hasMore,
      page,
      limit,
      parsed: {
        productTypes: parsed.productTypes,
        subcategories: parsed.subcategories,
        thickness: parsed.thickness,
        searchTerms: [
          ...parsed.colors,
          ...parsed.woods,
          ...parsed.decors,
          ...parsed.colorQualifiers,
        ],
        originalQuery: parsed.originalQuery,
      },
      facets,
    };
  }

  /**
   * Transform raw SQL results to panel objects
   */
  private transformResults(results: FullTextSearchResult[]): object[] {
    return results.map((p) => ({
      id: p.id,
      reference: p.reference,
      name: p.name,
      description: p.description,
      thickness: p.thickness,
      defaultLength: p.defaultLength,
      defaultWidth: p.defaultWidth,
      defaultThickness: p.defaultThickness,
      isVariableLength: p.isVariableLength,
      pricePerM2: p.pricePerM2,
      pricePerMl: p.pricePerMl,
      pricePerUnit: p.pricePerUnit,
      productType: p.productType,
      material: p.material,
      finish: p.finish,
      colorCode: p.colorCode,
      imageUrl: p.imageUrl,
      isActive: p.isActive,
      stockStatus: p.stockStatus,
      manufacturerRef: p.manufacturerRef,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      catalogue: { name: p.catalogue_name },
      category: p.category_name
        ? {
            name: p.category_name,
            slug: p.category_slug,
            parent: p.parent_name
              ? { name: p.parent_name, slug: p.parent_slug }
              : null,
          }
        : null,
    }));
  }
}
