import { Injectable } from '@nestjs/common';
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
  constructor(private prisma: PrismaService) {}

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
    const searchCondition = `(
      similarity(COALESCE(p."searchText", ''), $1) > 0.2 OR
      lower(unaccent(p.name)) LIKE '%' || $1 || '%' OR
      lower(unaccent(p.reference)) LIKE '%' || $1 || '%' OR
      lower(unaccent(COALESCE(p."manufacturerRef", ''))) LIKE '%' || $1 || '%'
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
   * - Does NOT use COALESCE for thickness (NULLs go to end via NULLS LAST)
   */
  private getSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      name: 'p.name',
      reference: 'p.reference',
      // Use COALESCE to handle edge bands (pricePerMl) and panels (pricePerM2)
      pricePerM2: 'COALESCE(p."pricePerM2", p."pricePerMl")',
      // Don't use COALESCE - let NULLS LAST handle NULL values
      defaultThickness: 'p."defaultThickness"',
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
    // Each term must match in name OR reference OR manufacturerRef
    const termConditions = terms.map((term, i) => {
      const upperTerm = upperTerms[i];
      // Escape single quotes for SQL safety
      const safeTerm = term.replace(/'/g, "''");
      const safeUpperTerm = upperTerm.replace(/'/g, "''");
      return `(
        lower(unaccent(p.name)) LIKE '%${safeTerm}%'
        OR UPPER(p.reference) LIKE '%${safeUpperTerm}%'
        OR UPPER(COALESCE(p."manufacturerRef", '')) LIKE '%${safeUpperTerm}%'
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
          -- Exact manufacturer reference match
          WHEN UPPER(COALESCE(p."manufacturerRef", '')) = '${safeUpperQuery}' THEN 2
          -- Reference starts with query
          WHEN UPPER(p.reference) LIKE '${safeUpperQuery}%' THEN 3
          -- Manufacturer ref starts with query
          WHEN UPPER(COALESCE(p."manufacturerRef", '')) LIKE '${safeUpperQuery}%' THEN 4
          -- Reference contains full query
          WHEN UPPER(p.reference) LIKE '%${safeUpperQuery}%' THEN 5
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
}
