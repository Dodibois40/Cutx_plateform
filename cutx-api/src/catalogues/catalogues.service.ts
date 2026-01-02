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
   * Full-text search using PostgreSQL tsvector
   * Returns panels ranked by relevance
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
    // Convert search query to tsquery format
    // Split words and join with & for AND search, handle special chars
    const terms = searchQuery
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 1)
      .map(t => t.replace(/[^\w\u00C0-\u024F]/g, '')) // Allow accented chars
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
    let orderBy = `ts_rank(p."searchVector", to_tsquery('french', $1)) DESC, p.name ASC`;
    if (options.sortBy && options.sortBy !== 'relevance') {
      const sortField = this.getSortField(options.sortBy);
      const sortDir = options.sortDirection || 'asc';
      orderBy = `${sortField} ${sortDir.toUpperCase()}, p.name ASC`;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND p."searchVector" @@ to_tsquery('french', $1)
    `;

    // Main query with ranking
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
        p."createdAt",
        p."updatedAt",
        p."catalogueId",
        p."categoryId",
        c.name as catalogue_name,
        cat.name as category_name,
        cat.slug as category_slug,
        parent.name as parent_name,
        parent.slug as parent_slug,
        ts_rank(p."searchVector", to_tsquery('french', $1)) as rank
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      LEFT JOIN "Category" cat ON p."categoryId" = cat.id
      LEFT JOIN "Category" parent ON cat."parentId" = parent.id
      WHERE ${whereClause}
        AND p."searchVector" @@ to_tsquery('french', $1)
      ORDER BY ${orderBy}
      LIMIT ${options.limit}
      OFFSET ${options.offset}
    `;

    try {
      const [countResult, panels] = await Promise.all([
        this.prisma.$queryRawUnsafe<[{ total: bigint }]>(countQuery, ...params),
        this.prisma.$queryRawUnsafe<FullTextSearchResult[]>(searchQuerySql, ...params),
      ]);

      return {
        panels,
        total: Number(countResult[0]?.total || 0),
      };
    } catch (error) {
      // Fallback to ILIKE search if full-text fails (e.g., searchVector not yet populated)
      console.warn('Full-text search failed, falling back to ILIKE:', error);
      return { panels: [], total: -1 }; // Signal to use fallback
    }
  }

  private getSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      name: 'p.name',
      reference: 'p.reference',
      pricePerM2: 'p."pricePerM2"',
      defaultThickness: 'p."defaultThickness"',
      stockStatus: 'p."stockStatus"',
    };
    return fieldMap[sortBy] || 'p.name';
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
    const orderBy: Prisma.PanelOrderByWithRelationInput = { [sortField]: sortDir };

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
}
