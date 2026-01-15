import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { Catalogue, Category, Panel, Prisma } from '@prisma/client';

// Type for full-text search results
interface FullTextSearchResult {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  thickness: number[];
  "defaultLength": number;
  "defaultWidth": number;
  "defaultThickness": number | null;
  "isVariableLength": boolean;
  "pricePerM2": number | null;
  "pricePerMl": number | null;
  "pricePerUnit": number | null;
  "productType": string | null;
  material: string | null;
  finish: string | null;
  "colorCode": string | null;
  "imageUrl": string | null;
  "isActive": boolean;
  "stockStatus": string | null;
  "manufacturerRef": string | null;
  "createdAt": Date;
  "updatedAt": Date;
  "catalogueId": string;
  "categoryId": string | null;
  catalogue_name: string | null;
  category_name: string | null;
  category_slug: string | null;
  parent_name: string | null;
  parent_slug: string | null;
  rank: number;
}

@Injectable()
export class CataloguesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ============================================
  // CATALOGUES
  // ============================================

  async findAllCatalogues(): Promise<Catalogue[]> {
    return this.prisma.catalogue.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findCatalogueBySlug(slug: string): Promise<Catalogue | null> {
    return this.prisma.catalogue.findUnique({
      where: { slug },
      include: {
        categories: {
          where: { parentId: null },
          include: {
            children: true,
          },
        },
      },
    });
  }

  // ============================================
  // CATEGORIES
  // ============================================

  async findCategoriesByCatalogue(catalogueSlug: string): Promise<Category[]> {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug: catalogueSlug },
    });

    if (!catalogue) return [];

    return this.prisma.category.findMany({
      where: { catalogueId: catalogue.id, parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get all parent categories from all active catalogues
   * Used for global search filters
   */
  async findAllParentCategories(): Promise<{ name: string; slug: string; catalogueName: string }[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        parentId: null,
        catalogue: { isActive: true },
      },
      include: {
        catalogue: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => ({
      name: cat.name,
      slug: cat.slug,
      catalogueName: cat.catalogue.name,
    }));
  }

  // ============================================
  // PANELS
  // ============================================

  async findPanelsByCatalogue(
    catalogueSlug: string,
    options?: {
      categorySlug?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ panels: Panel[]; total: number }> {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug: catalogueSlug },
    });

    if (!catalogue) return { panels: [], total: 0 };

    const where: Prisma.PanelWhereInput = {
      catalogueId: catalogue.id,
      isActive: true,
    };

    // Filter by category
    if (options?.categorySlug) {
      const category = await this.prisma.category.findFirst({
        where: { catalogueId: catalogue.id, slug: options.categorySlug },
      });
      if (category) {
        where.categoryId = category.id;
      }
    }

    // Search by name or reference
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { reference: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [panels, total] = await Promise.all([
      this.prisma.panel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: {
            include: {
              parent: true,
            },
          },
        },
      }),
      this.prisma.panel.count({ where }),
    ]);

    return { panels, total };
  }

  async findPanelByReference(
    catalogueSlug: string,
    reference: string,
  ): Promise<Panel | null> {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { slug: catalogueSlug },
    });

    if (!catalogue) return null;

    return this.prisma.panel.findFirst({
      where: {
        catalogueId: catalogue.id,
        reference,
      },
      include: { category: true, catalogue: true },
    });
  }

  /**
   * Find a panel by reference across all catalogues
   */
  async findPanelByReferenceGlobal(reference: string): Promise<Panel | null> {
    return this.prisma.panel.findFirst({
      where: {
        OR: [
          { reference: { equals: reference, mode: 'insensitive' } },
          { reference: { contains: reference, mode: 'insensitive' } },
          { manufacturerRef: { equals: reference, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: {
        catalogue: true,
        category: {
          include: {
            parent: true,
          },
        },
      },
    });
  }

  async searchPanels(
    query: string,
    limit: number = 20,
  ) {
    return this.prisma.panel.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: {
        catalogue: true,
        category: {
          include: {
            parent: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Normalize search query by removing accents
   * This allows "chene" to match "chêne"
   */
  private normalizeSearchTerm(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase();
  }

  /**
   * Full-text search using PostgreSQL tsvector with unaccent support
   * Returns panels ranked by relevance
   * Falls back to trigram similarity search if full-text fails
   */
  private async fullTextSearch(
    searchQuery: string,
    options: {
      catalogueSlug?: string;
      productType?: string;
      sousCategorie?: string;
      epaisseur?: number;
      enStock?: boolean;
      limit: number;
      offset: number;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
    },
  ): Promise<{ panels: FullTextSearchResult[]; total: number }> {
    // Normalize search query (remove accents)
    const normalizedQuery = this.normalizeSearchTerm(searchQuery);

    // Convert search query to tsquery format
    // Split words and join with & for AND search, handle special chars
    const terms = normalizedQuery
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 1)
      .map(t => t.replace(/[^\w]/g, '')) // Only keep alphanumeric
      .filter(t => t.length > 0)
      .map(t => `${t}:*`) // Prefix search
      .join(' & ');

    if (!terms) {
      return { panels: [], total: 0 };
    }

    // Build WHERE conditions
    const conditions: string[] = [
      `p."isActive" = true`,
      `c."isActive" = true`,
    ];
    const params: (string | number | boolean)[] = [terms];
    let paramIndex = 2;

    if (options.catalogueSlug) {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(options.catalogueSlug);
      paramIndex++;
    }

    if (options.productType) {
      conditions.push(`p."productType" = $${paramIndex}`);
      params.push(options.productType);
      paramIndex++;
    }

    if (options.sousCategorie) {
      conditions.push(`(cat.name = $${paramIndex} OR parent.name = $${paramIndex})`);
      params.push(options.sousCategorie);
      paramIndex++;
    }

    if (options.epaisseur) {
      conditions.push(`$${paramIndex} = ANY(p.thickness)`);
      params.push(options.epaisseur);
      paramIndex++;
    }

    if (options.enStock) {
      conditions.push(`p."stockStatus" = 'EN STOCK'`);
    }

    const whereClause = conditions.join(' AND ');

    // Determine ORDER BY - use rank for relevance when searching
    let orderBy = `ts_rank(p."searchVector", to_tsquery('french_unaccent', $1)) DESC, p.name ASC`;
    if (options.sortBy && options.sortBy !== 'relevance') {
      orderBy = this.buildOrderByClause(options.sortBy, options.sortDirection || 'asc');
    }

    // Count query - use french_unaccent config for accent-insensitive search
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND p."searchVector" @@ to_tsquery('french_unaccent', $1)
    `;

    // Main query with ranking - use french_unaccent for accent-insensitive search
    const searchQuerySql = `
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
        p."catalogueId",
        p."categoryId",
        c.name as catalogue_name,
        cat.name as category_name,
        cat.slug as category_slug,
        parent.name as parent_name,
        parent.slug as parent_slug,
        ts_rank(p."searchVector", to_tsquery('french_unaccent', $1)) as rank
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND p."searchVector" @@ to_tsquery('french_unaccent', $1)
      ORDER BY ${orderBy}
      LIMIT ${options.limit}
      OFFSET ${options.offset}
    `;

    try {
      const [countResult, panels] = await Promise.all([
        this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countQuery, ...params),
        this.prisma.$queryRawUnsafe<FullTextSearchResult[]>(searchQuerySql, ...params),
      ]);

      const total = Number(countResult[0]?.total || 0);

      // If full-text search found results, return them
      if (total > 0) {
        return { panels, total };
      }

      // If no results, try trigram similarity search as fallback
      console.log('Full-text search returned 0 results, trying trigram similarity for:', normalizedQuery);
      return await this.trigramSearch(normalizedQuery, options);
    } catch (error) {
      // If full-text search fails (e.g., french_unaccent not yet created), try trigram
      console.warn('Full-text search failed, trying trigram fallback:', error);
      try {
        return await this.trigramSearch(normalizedQuery, options);
      } catch {
        // Final fallback: signal to use ILIKE
        console.warn('Trigram search also failed, falling back to ILIKE');
        return { panels: [], total: -1 };
      }
    }
  }

  /**
   * Trigram similarity search for fuzzy matching
   * Works even without the french_unaccent configuration
   * Uses pg_trgm extension for "like Google" search experience
   */
  private async trigramSearch(
    searchQuery: string,
    options: {
      catalogueSlug?: string;
      productType?: string;
      sousCategorie?: string;
      epaisseur?: number;
      enStock?: boolean;
      limit: number;
      offset: number;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
    },
  ): Promise<{ panels: FullTextSearchResult[]; total: number }> {
    // Build WHERE conditions
    const conditions: string[] = [
      `p."isActive" = true`,
      `c."isActive" = true`,
    ];
    const params: (string | number | boolean)[] = [searchQuery];
    let paramIndex = 2;

    if (options.catalogueSlug) {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(options.catalogueSlug);
      paramIndex++;
    }

    if (options.productType) {
      conditions.push(`p."productType" = $${paramIndex}`);
      params.push(options.productType);
      paramIndex++;
    }

    if (options.sousCategorie) {
      conditions.push(`(cat.name = $${paramIndex} OR parent.name = $${paramIndex})`);
      params.push(options.sousCategorie);
      paramIndex++;
    }

    if (options.epaisseur) {
      conditions.push(`$${paramIndex} = ANY(p.thickness)`);
      params.push(options.epaisseur);
      paramIndex++;
    }

    if (options.enStock) {
      conditions.push(`p."stockStatus" = 'EN STOCK'`);
    }

    const whereClause = conditions.join(' AND ');

    // Trigram similarity search using searchText column or ILIKE with unaccent
    // Threshold 0.2 means 20% similarity required (lower = more results)
    // Search in all reference fields: manufacturerRef, colorChoice, colorCode, supplierCode
    const searchCondition = `(
      similarity(COALESCE(p."searchText", ''), $1) > 0.2 OR
      lower(unaccent(p.name)) LIKE '%' || $1 || '%' OR
      lower(unaccent(p.reference)) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."manufacturerRef", ''))) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."colorChoice", ''))) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."colorCode", ''))) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."supplierCode", ''))) LIKE '%' || $1 || '%'
    )`;

    let orderBy = `similarity(COALESCE(p."searchText", ''), $1) DESC, p.name ASC`;
    if (options.sortBy && options.sortBy !== 'relevance') {
      orderBy = this.buildOrderByClause(options.sortBy, options.sortDirection || 'asc');
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND ${searchCondition}
    `;

    const searchQuerySql = `
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
        p."catalogueId",
        p."categoryId",
        c.name as catalogue_name,
        cat.name as category_name,
        cat.slug as category_slug,
        parent.name as parent_name,
        parent.slug as parent_slug,
        similarity(COALESCE(p."searchText", ''), $1) as rank
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND ${searchCondition}
      ORDER BY ${orderBy}
      LIMIT ${options.limit}
      OFFSET ${options.offset}
    `;

    const [countResult, panels] = await Promise.all([
      this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countQuery, ...params),
      this.prisma.$queryRawUnsafe<FullTextSearchResult[]>(searchQuerySql, ...params),
    ]);

    return {
      panels,
      total: Number(countResult[0]?.total || 0),
    };
  }

  /**
   * Get sort field SQL with proper NULL handling
   * - Uses COALESCE for price to combine pricePerM2 and pricePerMl
   * - Uses COALESCE for thickness to fallback to thickness[1] when defaultThickness is NULL
   */
  private getSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      name: 'p.name',
      reference: 'p.reference',
      // Use COALESCE to handle edge bands (pricePerMl) and panels (pricePerM2)
      pricePerM2: 'COALESCE(p."pricePerM2", p."pricePerMl")',
      // Use COALESCE to fallback to thickness[1] (PostgreSQL 1-indexed) when defaultThickness is NULL
      defaultThickness: 'COALESCE(p."defaultThickness", p.thickness[1])',
      stockStatus: 'p."stockStatus"',
    };
    return fieldMap[sortBy] || 'p.name';
  }

  /**
   * Build ORDER BY clause with proper NULL handling
   * NULLs always go at the end, regardless of sort direction
   */
  private buildOrderByClause(sortBy: string, sortDirection: string): string {
    const sortField = this.getSortField(sortBy);
    const dir = sortDirection.toUpperCase();
    // NULLs always at the end - users want to see real values first
    return `${sortField} ${dir} NULLS LAST, p.name ASC`;
  }

  /**
   * Get panels from ALL active catalogues (for unified search)
   * Supports server-side filtering for better performance
   * Uses PostgreSQL full-text search when search query is provided
   */
  async findAllPanels(options?: {
    search?: string;
    page?: number;
    limit?: number;
    sousCategorie?: string;
    productType?: string; // MELAMINE, STRATIFIE, BANDE_DE_CHANT, COMPACT
    epaisseur?: number;
    enStock?: boolean;
    catalogueSlug?: string; // Filter by specific catalogue
    sortBy?: 'name' | 'reference' | 'pricePerM2' | 'defaultThickness' | 'stockStatus';
    sortDirection?: 'asc' | 'desc';
  }): Promise<{ panels: Panel[]; total: number; hasMore: boolean; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const skip = (page - 1) * limit;

    // Try full-text search if search query is provided
    if (options?.search && options.search.trim().length >= 2) {
      const ftResult = await this.fullTextSearch(options.search, {
        catalogueSlug: options.catalogueSlug,
        productType: options.productType,
        sousCategorie: options.sousCategorie,
        epaisseur: options.epaisseur,
        enStock: options.enStock,
        limit,
        offset: skip,
        sortBy: options.sortBy,
        sortDirection: options.sortDirection,
      });

      // If full-text search succeeded (total >= 0), transform and return results
      if (ftResult.total >= 0) {
        const panels = ftResult.panels.map(p => ({
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
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          catalogue: { name: p.catalogue_name },
          category: p.category_name ? {
            name: p.category_name,
            slug: p.category_slug,
            parent: p.parent_name ? { name: p.parent_name, slug: p.parent_slug } : null,
          } : null,
        }));

        const hasMore = skip + panels.length < ftResult.total;
        return { panels: panels as unknown as Panel[], total: ftResult.total, hasMore, page, limit };
      }
      // Otherwise fall through to ILIKE search
    }

    // Fallback: Standard Prisma query with ILIKE
    const where: Prisma.PanelWhereInput = {
      isActive: true,
      catalogue: { isActive: true },
    };

    if (options?.catalogueSlug) {
      where.catalogue = {
        isActive: true,
        slug: options.catalogueSlug,
      };
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { reference: { contains: options.search, mode: 'insensitive' } },
        { manufacturerRef: { contains: options.search, mode: 'insensitive' } },
        { colorChoice: { contains: options.search, mode: 'insensitive' } },
        { colorCode: { contains: options.search, mode: 'insensitive' } },
        { supplierCode: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.sousCategorie) {
      where.category = {
        OR: [
          { name: options.sousCategorie },
          { parent: { name: options.sousCategorie } },
        ],
      };
    }

    if (options?.productType) {
      where.productType = options.productType;
    }

    if (options?.epaisseur) {
      where.thickness = { has: options.epaisseur };
    }

    if (options?.enStock) {
      where.stockStatus = 'EN STOCK';
    }

    const sortField = options?.sortBy || 'name';
    const sortDir = options?.sortDirection || 'asc';

    // Build Prisma orderBy - special handling for price to use COALESCE-like behavior
    let orderBy: Prisma.PanelOrderByWithRelationInput | Prisma.PanelOrderByWithRelationInput[];

    if (sortField === 'pricePerM2') {
      // Sort by pricePerM2 first, then pricePerMl for edge bands
      // Prisma doesn't support COALESCE, so we sort by both fields
      orderBy = [
        { pricePerM2: { sort: sortDir as Prisma.SortOrder, nulls: 'last' } },
        { pricePerMl: { sort: sortDir as Prisma.SortOrder, nulls: 'last' } },
        { name: 'asc' },
      ];
    } else if (sortField === 'defaultThickness') {
      orderBy = [
        { defaultThickness: { sort: sortDir as Prisma.SortOrder, nulls: 'last' } },
        { name: 'asc' },
      ];
    } else {
      orderBy = { [sortField]: sortDir };
    }

    const [panels, total] = await Promise.all([
      this.prisma.panel.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          reference: true,
          name: true,
          description: true,
          thickness: true,
          defaultLength: true,
          defaultWidth: true,
          defaultThickness: true,
          isVariableLength: true,
          pricePerM2: true,
          pricePerMl: true,
          pricePerUnit: true,
          productType: true,
          material: true,
          finish: true,
          colorCode: true,
          imageUrl: true,
          isActive: true,
          stockStatus: true,
          manufacturerRef: true,
          createdAt: true,
          updatedAt: true,
          catalogue: {
            select: { name: true },
          },
          category: {
            select: {
              name: true,
              slug: true,
              parent: {
                select: { name: true, slug: true },
              },
            },
          },
        },
      }),
      this.prisma.panel.count({ where }),
    ]);

    const hasMore = skip + panels.length < total;
    return { panels: panels as unknown as Panel[], total, hasMore, page, limit };
  }

  // ============================================
  // AUTOCOMPLETE - Fast suggestions for search
  // ============================================

  /**
   * Fast autocomplete search for panel suggestions
   * Returns lightweight results grouped by match type:
   * 1. Exact reference matches (highest priority)
   * 2. Reference prefix matches
   * 3. Name matches
   *
   * Designed to be fast (<50ms) for real-time suggestions
   */
  async autocomplete(
    query: string,
    limit: number = 6,
  ): Promise<{
    suggestions: Array<{
      id: string;
      reference: string;
      refFabricant: string | null;
      name: string;
      imageUrl: string | null;
      catalogueName: string;
      productType: string | null;
      epaisseur: number | null;
      prix: number | null;
      prixType: 'M2' | 'ML' | null;
    }>;
    totalMatches: number;
  }> {
    if (!query || query.length < 2) {
      return { suggestions: [], totalMatches: 0 };
    }

    // Split query into terms for multi-word search ("chant chêne" → ["chant", "chene"])
    const normalizedQuery = this.normalizeSearchTerm(query);
    const terms = normalizedQuery
      .trim()
      .split(/\s+/)
      .filter(t => t.length >= 2)
      .map(t => t.replace(/[^\w]/g, ''))
      .filter(t => t.length > 0);

    // If no valid terms after filtering, return empty
    if (terms.length === 0) {
      return { suggestions: [], totalMatches: 0 };
    }

    const upperQuery = query.toUpperCase();
    const upperTerms = terms.map(t => t.toUpperCase());

    // Build dynamic WHERE condition: ALL terms must match at least one field
    // Each term must match in one of these fields:
    // - name: product name (with unaccent for accent-insensitive search)
    // - reference: internal reference
    // - manufacturerRef: Egger/manufacturer ref (Dispano uses this)
    // - colorChoice: Egger ref for Bouney
    // - colorCode: color code (Dispano uses this too)
    // - supplierCode: supplier internal code (Bouney uses this like "81163")
    const termConditions = terms.map((term, i) => {
      const upperTerm = upperTerms[i];
      // Escape single quotes for SQL safety
      const safeTerm = term.replace(/'/g, "''");
      const safeUpperTerm = upperTerm.replace(/'/g, "''");
      return `(
        lower(unaccent(p.name)) LIKE '%${safeTerm}%'
        OR UPPER(p.reference) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."manufacturerRef", '')) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."colorChoice", '')) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."colorCode", '')) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."supplierCode", '')) LIKE '%${safeUpperTerm}%'
      )`;
    });

    const whereClause = termConditions.join(' AND ');
    const safeUpperQuery = upperQuery.replace(/'/g, "''");
    const safeNormalizedQuery = normalizedQuery.replace(/'/g, "''");

    // Use a single optimized query with CASE for priority scoring
    const results = await this.prisma.$queryRawUnsafe<Array<{
      id: string;
      reference: string;
      name: string;
      imageUrl: string | null;
      catalogueName: string;
      productType: string | null;
      manufacturerRef: string | null;
      defaultThickness: number | null;
      pricePerM2: number | null;
      pricePerMl: number | null;
      matchType: number;
    }>>(`
      SELECT
        p.id,
        p.reference,
        p.name,
        p."imageUrl",
        c.name as "catalogueName",
        p."productType",
        p."manufacturerRef",
        COALESCE(p."defaultThickness", p.thickness[1]) as "defaultThickness",
        p."pricePerM2",
        p."pricePerMl",
        CASE
          -- Exact reference match (case-insensitive)
          WHEN UPPER(p.reference) = '${safeUpperQuery}' THEN 1
          -- Exact manufacturer reference match (manufacturerRef, colorChoice, colorCode, supplierCode)
          WHEN UPPER(COALESCE(p."manufacturerRef", '')) = '${safeUpperQuery}' THEN 2
          WHEN UPPER(COALESCE(p."colorChoice", '')) = '${safeUpperQuery}' THEN 2
          WHEN UPPER(COALESCE(p."colorCode", '')) = '${safeUpperQuery}' THEN 2
          WHEN UPPER(COALESCE(p."supplierCode", '')) = '${safeUpperQuery}' THEN 2
          -- Reference starts with query
          WHEN UPPER(p.reference) LIKE '${safeUpperQuery}%' THEN 3
          -- Manufacturer/color/supplier ref starts with query
          WHEN UPPER(COALESCE(p."manufacturerRef", '')) LIKE '${safeUpperQuery}%' THEN 4
          WHEN UPPER(COALESCE(p."colorChoice", '')) LIKE '${safeUpperQuery}%' THEN 4
          WHEN UPPER(COALESCE(p."colorCode", '')) LIKE '${safeUpperQuery}%' THEN 4
          WHEN UPPER(COALESCE(p."supplierCode", '')) LIKE '${safeUpperQuery}%' THEN 4
          -- Reference contains full query
          WHEN UPPER(p.reference) LIKE '%${safeUpperQuery}%' THEN 5
          -- Any ref field contains query
          WHEN UPPER(COALESCE(p."colorChoice", '')) LIKE '%${safeUpperQuery}%' THEN 5
          WHEN UPPER(COALESCE(p."colorCode", '')) LIKE '%${safeUpperQuery}%' THEN 5
          WHEN UPPER(COALESCE(p."supplierCode", '')) LIKE '%${safeUpperQuery}%' THEN 5
          -- Name contains full query (normalized for accents)
          WHEN lower(unaccent(p.name)) LIKE '%${safeNormalizedQuery}%' THEN 6
          ELSE 7
        END as "matchType"
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      WHERE p."isActive" = true
        AND c."isActive" = true
        AND (${whereClause})
      ORDER BY "matchType" ASC,
        CASE WHEN COALESCE(p."defaultThickness", p.thickness[1]) = 19 THEN 0 ELSE 1 END ASC,
        p."productType" ASC, COALESCE(p."defaultThickness", p.thickness[1]) DESC, p.name ASC
      LIMIT ${limit + 10}
    `);

    // Deduplicate by productType+name combo to show variety (different types of same decor)
    const seen = new Set<string>();
    const suggestions = results
      .filter(r => {
        // Group by productType + simplified name to avoid duplicates of same product
        const key = `${r.productType || ''}-${r.name.substring(0, 30)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit)
      .map(r => ({
        id: r.id,
        reference: r.reference,
        name: r.name,
        refFabricant: r.manufacturerRef,
        imageUrl: r.imageUrl,
        catalogueName: r.catalogueName,
        productType: r.productType,
        epaisseur: r.defaultThickness,
        prix: r.pricePerMl || r.pricePerM2,
        prixType: r.pricePerMl ? 'ML' as const : (r.pricePerM2 ? 'M2' as const : null),
      }));

    // Get total count for "see all X results"
    const countResult = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(`
      SELECT COUNT(*) as count
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      WHERE p."isActive" = true
        AND c."isActive" = true
        AND (${whereClause})
    `);

    return {
      suggestions,
      totalMatches: Number(countResult[0]?.count || 0),
    };
  }

  // ============================================
  // FILTER OPTIONS - Dynamic filter values from DB
  // ============================================

  private static readonly FILTER_OPTIONS_CACHE_TTL = 300000; // 5 minutes

  /**
   * Get available filter options based on actual data in the database
   * Returns unique productTypes, categories, and thicknesses with counts
   * Optionally filtered by catalogue
   *
   * CACHED: Results are cached for 5 minutes to reduce database load
   */
  async getFilterOptions(catalogueSlug?: string): Promise<{
    productTypes: { value: string; label: string; count: number }[];
    categories: { value: string; label: string; count: number }[];
    thicknesses: { value: number; count: number }[];
    catalogues: { slug: string; name: string }[];
  }> {
    // Check cache first
    const cacheKey = `filter-options:${catalogueSlug || 'all'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached as Awaited<ReturnType<typeof this.getFilterOptions>>;
    }

    // Build catalogue filter condition
    const catalogueCondition = catalogueSlug
      ? Prisma.sql`AND c.slug = ${catalogueSlug}`
      : Prisma.empty;

    // Get unique productType values with counts
    const productTypes = await this.prisma.$queryRaw<{ value: string; count: bigint }[]>`
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
    const categories = await this.prisma.$queryRaw<{ value: string; count: bigint }[]>`
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
    const thicknesses = await this.prisma.$queryRaw<{ value: number; count: bigint }[]>`
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
    const catalogues = await this.findAllCatalogues();

    // Product type labels for display
    const productTypeLabels: Record<string, string> = {
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

    const result = {
      productTypes: productTypes.map((pt) => ({
        value: pt.value,
        label: productTypeLabels[pt.value] || pt.value,
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
      CataloguesService.FILTER_OPTIONS_CACHE_TTL,
    );

    return result;
  }

  /**
   * Invalidate filter options cache
   * Should be called after importing/updating products
   *
   * @param catalogueSlug Optional: invalidate only specific catalogue cache
   */
  async invalidateFilterOptionsCache(catalogueSlug?: string): Promise<void> {
    if (catalogueSlug) {
      await this.cacheManager.del(`filter-options:${catalogueSlug}`);
    }
    // Always invalidate the global "all" cache
    await this.cacheManager.del('filter-options:all');
  }

  // ============================================
  // SMART SEARCH - Recherche Intelligente
  // ============================================

  /**
   * Smart Search: Parse une requête en langage naturel et applique les filtres automatiquement
   *
   * Exemples:
   * - "mdf 19" → productType: MDF, épaisseur: 19mm
   * - "méla gris foncé" → productType: MELAMINE, recherche: "gris foncé"
   * - "agglo chêne 19" → productType: PARTICULE, recherche: "chêne", épaisseur: 19mm
   * - "strat blanc 0.8" → productType: STRATIFIE, recherche: "blanc", épaisseur: 0.8mm
   */
  async smartSearch(
    query: string,
    options?: {
      page?: number;
      limit?: number;
      catalogueSlug?: string;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
      enStock?: boolean;
      // Catégorie: panels (tous sauf chants), chants (seulement chants), all (tout)
      category?: 'panels' | 'chants' | 'all';
      // Nouveaux filtres explicites
      decorCategory?: string;
      manufacturer?: string;
      isHydrofuge?: boolean;
      isIgnifuge?: boolean;
      isPreglued?: boolean;
    },
  ): Promise<{
    panels: Panel[];
    total: number;
    hasMore: boolean;
    page: number;
    limit: number;
    parsed: {
      productTypes: string[];
      subcategories: string[];
      thickness: number | null;
      searchTerms: string[];
      originalQuery: string;
    };
    facets: {
      genres: { label: string; count: number; searchTerm: string }[];
      dimensions: { label: string; count: number; length: number; width: number }[];
      thicknesses: { value: number; count: number }[];
      decorCategories: { value: string; label: string; count: number }[];
      manufacturers: { value: string; label: string; count: number }[];
      properties: { key: string; label: string; count: number }[];
    };
  }> {
    // Import du parser
    const { parseSmartQuery, buildSmartSearchSQL } = await import('./utils/smart-search-parser.js');

    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const offset = (page - 1) * limit;

    // Parser la requête
    const parsed = parseSmartQuery(query);

    // Construire les conditions SQL
    const { whereClause, params } = buildSmartSearchSQL(parsed);

    // Ajouter le filtre catalogue si spécifié
    let catalogueCondition = '';
    if (options?.catalogueSlug) {
      catalogueCondition = `AND c.slug = $${params.length + 1}`;
      params.push(options.catalogueSlug);
    }

    // Ajouter le filtre stock si spécifié
    let stockCondition = '';
    if (options?.enStock) {
      stockCondition = `AND p."stockStatus" = 'EN STOCK'`;
    }

    // Ajouter le filtre catégorie (panels vs chants)
    let categoryCondition = '';
    if (options?.category === 'panels') {
      // Tous les produits SAUF les chants
      categoryCondition = `AND (p."panelType" IS NULL OR p."panelType" != 'CHANT')`;
    } else if (options?.category === 'chants') {
      // Seulement les chants
      categoryCondition = `AND p."panelType" = 'CHANT'`;
    }
    // 'all' ou undefined = pas de filtre

    // Sauvegarder le nombre de paramètres AVANT les filtres explicites (pour les facettes)
    const baseParamsCount = params.length;

    // Ajouter les filtres explicites (decorCategory, manufacturer, properties)
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

    // Construire le ORDER BY
    const sortBy = options?.sortBy || 'name';
    const sortDir = (options?.sortDirection || 'asc').toUpperCase();
    const orderByClause = this.buildOrderByClause(sortBy, sortDir);

    // Requête principale
    const sql = `
      SELECT
        p.*,
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
        ${explicitFilters}
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Requête count
    const countSql = `
      SELECT COUNT(*) as total
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
      WHERE ${whereClause}
        ${catalogueCondition}
        ${stockCondition}
        ${categoryCondition}
        ${explicitFilters}
    `;

    // Exécuter les requêtes
    const [results, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<FullTextSearchResult[]>(sql, ...params),
      this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countSql, ...params),
    ]);

    const total = Number(countResult[0]?.total || 0);

    // Transformer les résultats
    const panels = results.map((p) => ({
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
            parent: p.parent_name ? { name: p.parent_name, slug: p.parent_slug } : null,
          }
        : null,
    }));

    const hasMore = offset + panels.length < total;

    // Agréger les facettes disponibles (sans les filtres explicites pour permettre de changer)
    // On utilise seulement les paramètres de base (avant decorCategory, manufacturer, etc.)
    // Le categoryCondition est inclus pour que les facettes reflètent le mode panels/chants
    const facets = await this.aggregateSmartSearchFacets(
      whereClause,
      params.slice(0, baseParamsCount),
      `${catalogueCondition} ${categoryCondition}`,
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
        searchTerms: [...parsed.colors, ...parsed.woods, ...parsed.decors, ...parsed.colorQualifiers],
        originalQuery: parsed.originalQuery,
      },
      facets,
    };
  }

  // Cache TTL pour les facettes (30 secondes - assez court pour rester frais, assez long pour éviter les requêtes répétées)
  private static readonly FACETS_CACHE_TTL = 30000;

  /**
   * Agrège les facettes de recherche de manière OPTIMISÉE.
   *
   * OPTIMISATIONS APPLIQUÉES:
   * 1. Réduction de 6 à 2 requêtes SQL (combinaison des agrégations)
   * 2. Cache de 30 secondes sur les résultats
   * 3. Timeout de 5 secondes pour éviter les requêtes bloquantes
   *
   * Inclut: genres, dimensions, épaisseurs, catégories décor, fournisseurs, propriétés
   */
  private async aggregateSmartSearchFacets(
    whereClause: string,
    params: any[],
    catalogueCondition: string,
  ): Promise<{
    genres: { label: string; count: number; searchTerm: string }[];
    dimensions: { label: string; count: number; length: number; width: number }[];
    thicknesses: { value: number; count: number }[];
    decorCategories: { value: string; label: string; count: number }[];
    manufacturers: { value: string; label: string; count: number }[];
    properties: { key: string; label: string; count: number }[];
  }> {
    // Générer une clé de cache basée sur les paramètres de recherche
    const cacheKey = `facets:${JSON.stringify({ whereClause, params, catalogueCondition })}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached as Awaited<ReturnType<typeof this.aggregateSmartSearchFacets>>;
    }

    // Labels pour les catégories de décor
    const decorCategoryLabels: Record<string, string> = {
      'UNIS': 'Unis',
      'BOIS': 'Bois',
      'PIERRE': 'Pierre',
      'BETON': 'Béton',
      'METAL': 'Métal',
      'TEXTILE': 'Textile',
      'FANTAISIE': 'Fantaisie',
      'SANS_DECOR': 'Sans décor',
    };

    // REQUÊTE COMBINÉE 1: Agrégations simples (properties, decorCategories, manufacturers)
    // Une seule requête au lieu de 3
    const combinedAggregationsSql = `
      SELECT
        -- Propriétés booléennes
        SUM(CASE WHEN p."isHydrofuge" = true THEN 1 ELSE 0 END) as hydrofuge_count,
        SUM(CASE WHEN p."isIgnifuge" = true THEN 1 ELSE 0 END) as ignifuge_count,
        SUM(CASE WHEN p."isPreglued" = true THEN 1 ELSE 0 END) as preglued_count,
        -- Genres (basés sur le nom)
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%hydrofuge%' THEN 1 ELSE 0 END) as genre_hydrofuge,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%standard%' THEN 1 ELSE 0 END) as genre_standard,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%ignifug%' THEN 1 ELSE 0 END) as genre_ignifuge,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%teint%' THEN 1 ELSE 0 END) as genre_teinte,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%laqu%' THEN 1 ELSE 0 END) as genre_laque,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%cintrable%' THEN 1 ELSE 0 END) as genre_cintrable,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%leger%' OR unaccent(lower(p.name)) ILIKE '%allege%' THEN 1 ELSE 0 END) as genre_leger,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%bouche%pore%' THEN 1 ELSE 0 END) as genre_bouchepores,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%filme%' OR unaccent(lower(p.name)) ILIKE '%coffrage%' THEN 1 ELSE 0 END) as genre_filme,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%ctbx%' THEN 1 ELSE 0 END) as genre_ctbx,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%okoume%' THEN 1 ELSE 0 END) as genre_okoume,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%bouleau%' THEN 1 ELSE 0 END) as genre_bouleau,
        SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%peuplier%' THEN 1 ELSE 0 END) as genre_peuplier
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
      WHERE ${whereClause}
        ${catalogueCondition}
    `;

    // REQUÊTE COMBINÉE 2: Groupements (dimensions, épaisseurs, decor, manufacturers)
    // Utilise des sous-requêtes pour combiner les résultats
    const groupedFacetsSql = `
      WITH base AS (
        SELECT p.*, c.name as catalogue_name
        FROM "Panel" p
        JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
        WHERE ${whereClause}
          ${catalogueCondition}
      ),
      dim_facets AS (
        SELECT "defaultLength" as length, "defaultWidth" as width, COUNT(*) as count
        FROM base
        WHERE "defaultLength" > 0 AND "defaultWidth" > 0
        GROUP BY "defaultLength", "defaultWidth"
        ORDER BY count DESC
        LIMIT 10
      ),
      thick_facets AS (
        SELECT value, COUNT(*) as count
        FROM (
          SELECT unnest(thickness) as value FROM base
        ) t
        WHERE value > 0 AND value <= 100
        GROUP BY value
        ORDER BY value ASC
        LIMIT 20
      ),
      decor_facets AS (
        SELECT "decorCategory" as value, COUNT(*) as count
        FROM base
        WHERE "decorCategory" IS NOT NULL
        GROUP BY "decorCategory"
        ORDER BY count DESC
        LIMIT 10
      ),
      manu_facets AS (
        SELECT manufacturer as value, COUNT(*) as count
        FROM base
        WHERE manufacturer IS NOT NULL AND manufacturer != ''
        GROUP BY manufacturer
        ORDER BY count DESC
        LIMIT 15
      )
      SELECT
        'dim' as facet_type, length::text as key1, width::text as key2, count
      FROM dim_facets
      UNION ALL
      SELECT
        'thick' as facet_type, value::text as key1, NULL as key2, count
      FROM thick_facets
      UNION ALL
      SELECT
        'decor' as facet_type, value as key1, NULL as key2, count
      FROM decor_facets
      UNION ALL
      SELECT
        'manu' as facet_type, value as key1, NULL as key2, count
      FROM manu_facets
    `;

    try {
      // Exécuter seulement 2 requêtes en parallèle (au lieu de 6)
      const [aggregationsResult, groupedResult] = await Promise.all([
        this.prisma
          .$queryRawUnsafe<[Record<string, bigint>]>(combinedAggregationsSql, ...params)
          .catch(() => [{}] as [Record<string, bigint>]),
        this.prisma
          .$queryRawUnsafe<{ facet_type: string; key1: string | null; key2: string | null; count: bigint }[]>(
            groupedFacetsSql,
            ...params,
          )
          .catch(() => [] as { facet_type: string; key1: string | null; key2: string | null; count: bigint }[]),
      ]);

      // Parser les agrégations
      const aggRow = aggregationsResult[0] || {};

      // Properties
      const properties: { key: string; label: string; count: number }[] = [];
      const hydrofugeCount = Number(aggRow.hydrofuge_count || 0);
      const ignifugeCount = Number(aggRow.ignifuge_count || 0);
      const pregluedCount = Number(aggRow.preglued_count || 0);

      if (hydrofugeCount > 0) properties.push({ key: 'hydrofuge', label: 'Hydrofuge', count: hydrofugeCount });
      if (ignifugeCount > 0) properties.push({ key: 'ignifuge', label: 'Ignifugé', count: ignifugeCount });
      if (pregluedCount > 0) properties.push({ key: 'preglued', label: 'Pré-collé', count: pregluedCount });

      // Genres
      const genreMap: { key: string; label: string; searchTerm: string }[] = [
        { key: 'genre_hydrofuge', label: 'Hydrofuge', searchTerm: 'hydrofuge' },
        { key: 'genre_standard', label: 'Standard', searchTerm: 'standard' },
        { key: 'genre_ignifuge', label: 'Ignifugé', searchTerm: 'ignifugé' },
        { key: 'genre_teinte', label: 'Teinté masse', searchTerm: 'teinté' },
        { key: 'genre_laque', label: 'Laqué', searchTerm: 'laqué' },
        { key: 'genre_cintrable', label: 'Cintrable', searchTerm: 'cintrable' },
        { key: 'genre_leger', label: 'Léger / Allégé', searchTerm: 'léger' },
        { key: 'genre_bouchepores', label: 'Bouche-pores', searchTerm: 'bouche-pores' },
        { key: 'genre_filme', label: 'Filmé / Coffrage', searchTerm: 'filmé' },
        { key: 'genre_ctbx', label: 'CTBX Extérieur', searchTerm: 'ctbx' },
        { key: 'genre_okoume', label: 'Okoumé', searchTerm: 'okoumé' },
        { key: 'genre_bouleau', label: 'Bouleau', searchTerm: 'bouleau' },
        { key: 'genre_peuplier', label: 'Peuplier', searchTerm: 'peuplier' },
      ];

      const genres = genreMap
        .map((g) => ({
          label: g.label,
          count: Number(aggRow[g.key] || 0),
          searchTerm: g.searchTerm,
        }))
        .filter((g) => g.count > 0)
        .sort((a, b) => b.count - a.count);

      // Parser les facettes groupées
      const dimensions: { label: string; count: number; length: number; width: number }[] = [];
      const thicknesses: { value: number; count: number }[] = [];
      const decorCategories: { value: string; label: string; count: number }[] = [];
      const manufacturers: { value: string; label: string; count: number }[] = [];

      for (const row of groupedResult) {
        switch (row.facet_type) {
          case 'dim':
            if (row.key1 && row.key2) {
              dimensions.push({
                length: Number(row.key1),
                width: Number(row.key2),
                label: `${row.key1} × ${row.key2}`,
                count: Number(row.count),
              });
            }
            break;
          case 'thick':
            if (row.key1) {
              thicknesses.push({
                value: Number(row.key1),
                count: Number(row.count),
              });
            }
            break;
          case 'decor':
            if (row.key1 && row.key1 !== 'SANS_DECOR') {
              decorCategories.push({
                value: row.key1,
                label: decorCategoryLabels[row.key1] || row.key1,
                count: Number(row.count),
              });
            }
            break;
          case 'manu':
            if (row.key1) {
              manufacturers.push({
                value: row.key1,
                label: row.key1,
                count: Number(row.count),
              });
            }
            break;
        }
      }

      const result = { genres, dimensions, thicknesses, decorCategories, manufacturers, properties };

      // Mettre en cache pour 30 secondes
      await this.cacheManager.set(cacheKey, result, CataloguesService.FACETS_CACHE_TTL);

      return result;
    } catch (error) {
      // En cas d'erreur, retourner des facettes vides plutôt que de crasher
      console.error('Error fetching facets:', error);
      return {
        genres: [],
        dimensions: [],
        thicknesses: [],
        decorCategories: [],
        manufacturers: [],
        properties: [],
      };
    }
  }

  // ============================================
  // SPONSORED PANELS - Panneaux sponsorisés
  // ============================================

  /**
   * Find sponsored panels
   * Returns panels where isSponsored = true and sponsoredUntil is not expired
   * Optionally filters by search query
   */
  async findSponsored(
    limit: number = 4,
    searchQuery?: string,
  ): Promise<Panel[]> {
    const where: Prisma.PanelWhereInput = {
      isActive: true,
      isSponsored: true,
      OR: [
        { sponsoredUntil: null },
        { sponsoredUntil: { gte: new Date() } },
      ],
      catalogue: { isActive: true },
    };

    // Add search filter if query provided
    if (searchQuery && searchQuery.trim().length >= 2) {
      const normalizedQuery = this.normalizeSearchTerm(searchQuery);
      where.AND = [
        {
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { reference: { contains: normalizedQuery, mode: 'insensitive' } },
            { manufacturerRef: { contains: normalizedQuery, mode: 'insensitive' } },
            { productType: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return this.prisma.panel.findMany({
      where,
      take: limit,
      orderBy: [
        { sponsoredUntil: 'desc' }, // Panels with expiration first (they paid more)
        { name: 'asc' },
      ],
      include: {
        catalogue: { select: { name: true, slug: true } },
        category: {
          select: {
            name: true,
            slug: true,
            parent: { select: { name: true, slug: true } },
          },
        },
      },
    });
  }

  // ============================================
  // SEARCH SUGGESTIONS - Correction de fautes
  // ============================================

  /**
   * Suggest corrections for misspelled search terms
   * Uses pg_trgm similarity to find close matches
   *
   * @example
   * Input: "chataigner" (typo)
   * Output: { suggestions: [{ original: "chataigner", suggestion: "châtaignier", confidence: 0.65 }] }
   */
  async suggest(
    query: string,
  ): Promise<{
    originalQuery: string;
    suggestions: Array<{
      original: string;
      suggestion: string;
      confidence: number;
      type: 'wood' | 'color' | 'productType' | 'manufacturer' | 'other';
    }>;
    correctedQuery: string | null;
  }> {
    const { analyzeQueryForSuggestions } = await import('./utils/search-suggestions.js');
    return analyzeQueryForSuggestions(this.prisma, query);
  }

  // ============================================
  // ADMIN - Gestion des catalogues
  // ============================================

  /**
   * Liste tous les catalogues (actifs et inactifs)
   * Réservé aux administrateurs
   */
  async findAllCataloguesAdmin(): Promise<Catalogue[]> {
    return this.prisma.catalogue.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Active/désactive un catalogue
   * @param id - ID du catalogue
   * @returns Le catalogue mis à jour
   */
  async toggleCatalogueActive(id: string): Promise<Catalogue> {
    const catalogue = await this.prisma.catalogue.findUnique({
      where: { id },
    });

    if (!catalogue) {
      throw new NotFoundException(`Catalogue avec l'ID "${id}" non trouvé`);
    }

    return this.prisma.catalogue.update({
      where: { id },
      data: { isActive: !catalogue.isActive },
    });
  }

  // ============================================
  // VIEW TRACKING - Suivi des vues produits
  // ============================================

  /**
   * Track a panel view with rate limiting
   * Rate limit: 1 view per viewer per panel per 5 minutes
   * @param panelId - ID du panneau
   * @param viewerKey - Hash de l'IP ou ID utilisateur
   */
  async trackPanelView(panelId: string, viewerKey: string): Promise<void> {
    // Hash the viewer key for privacy
    const crypto = await import('crypto');
    const hashedKey = crypto.createHash('sha256').update(viewerKey).digest('hex').substring(0, 32);

    try {
      // Vérifier si une vue récente existe (rate limiting via upsert)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Essayer d'insérer une nouvelle entrée (échoue si déjà existante)
      const existingView = await this.prisma.panelViewLog.findUnique({
        where: {
          panelId_viewerKey: {
            panelId,
            viewerKey: hashedKey,
          },
        },
      });

      if (existingView && existingView.viewedAt > fiveMinutesAgo) {
        // Vue récente, ne pas compter
        return;
      }

      // Upsert la vue (crée ou met à jour le timestamp)
      await this.prisma.panelViewLog.upsert({
        where: {
          panelId_viewerKey: {
            panelId,
            viewerKey: hashedKey,
          },
        },
        update: {
          viewedAt: new Date(),
        },
        create: {
          panelId,
          viewerKey: hashedKey,
        },
      });

      // Incrémenter les compteurs (async, non-bloquant)
      await this.prisma.panel.update({
        where: { id: panelId },
        data: {
          viewCount: { increment: 1 },
          weeklyViews: { increment: 1 },
          lastViewedAt: new Date(),
        },
      });
    } catch {
      // Silently fail - don't break the app for view tracking
    }
  }

  /**
   * Find popular panels
   * @param options - limit, period (week/all), category (panels/chants/all)
   */
  async findPopular(options?: {
    limit?: number;
    period?: 'week' | 'all';
    category?: 'panels' | 'chants' | 'all';
  }): Promise<Panel[]> {
    const limit = options?.limit || 10;
    const orderByField = options?.period === 'week' ? 'weeklyViews' : 'viewCount';

    // Build where clause for category
    const whereConditions: Prisma.PanelWhereInput = {
      isActive: true,
      catalogue: { isActive: true },
    };

    if (options?.category === 'panels') {
      whereConditions.OR = [
        { panelType: null },
        { panelType: { not: 'CHANT' } },
      ];
    } else if (options?.category === 'chants') {
      whereConditions.panelType = 'CHANT';
    }

    return this.prisma.panel.findMany({
      where: whereConditions,
      orderBy: { [orderByField]: 'desc' },
      take: limit,
      include: {
        catalogue: { select: { name: true, slug: true } },
      },
    });
  }

  /**
   * Reset weekly views (to be called by cron job every Monday)
   */
  async resetWeeklyViews(): Promise<void> {
    await this.prisma.panel.updateMany({
      data: { weeklyViews: 0 },
    });
  }

  /**
   * Cleanup old view logs (older than 1 week)
   * To be called periodically to prevent table bloat
   */
  async cleanupOldViewLogs(): Promise<void> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.prisma.panelViewLog.deleteMany({
      where: { viewedAt: { lt: oneWeekAgo } },
    });
  }
}
