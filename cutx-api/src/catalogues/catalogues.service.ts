import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { Catalogue, Category, Panel, Prisma } from '@prisma/client';
// Constants available in ./catalogues.constants if needed
// Smart search parsing now handled by SmartSearchService
import { analyzeQueryForSuggestions } from './utils/search-suggestions';

// Type for category tree with panel counts
export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  catalogueSlug?: string;
  catalogueName?: string;
  panelCount: number;
  children: CategoryTreeNode[];
}
import {
  SearchService,
  AutocompleteService,
  FiltersService,
  ViewTrackingService,
  SmartSearchService,
  FullTextSearchResult,
} from './services';

// FullTextSearchResult type imported from ./services

@Injectable()
export class CataloguesService {
  constructor(
    private prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly autocompleteService: AutocompleteService,
    private readonly filtersService: FiltersService,
    private readonly viewTrackingService: ViewTrackingService,
    private readonly smartSearchService: SmartSearchService,
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
  async findAllParentCategories(): Promise<
    { name: string; slug: string; catalogueName: string }[]
  > {
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

  /**
   * Get full category tree with panel counts
   * Used for tree navigation in Command Search
   * Defaults to CutX unified catalogue for consistent navigation
   * @param supplierSlugs - Filter panel counts by supplier catalogue slugs (e.g., ['dispano', 'bouney', 'barrillet'])
   */
  async getCategoriesTree(
    catalogueSlug?: string,
    supplierSlugs?: string[],
  ): Promise<CategoryTreeNode[]> {
    // Default to CutX unified catalogue for tree navigation
    const effectiveSlug = catalogueSlug || 'cutx';

    const whereClause: Prisma.CategoryWhereInput = {
      parentId: null,
      catalogue: {
        isActive: true,
        slug: effectiveSlug,
      },
    };

    // Use sortOrder first (from admin drag & drop), then name as fallback
    const orderBy = [
      { sortOrder: 'asc' as const },
      { name: 'asc' as const },
    ] as any;

    // Build panel count filter based on supplier slugs
    // This filters _count to only count panels from selected suppliers
    const panelCountFilter = supplierSlugs?.length
      ? {
          where: {
            isActive: true,
            catalogue: { slug: { in: supplierSlugs } },
          },
        }
      : { where: { isActive: true } };

    // Helper for _count select with supplier filter
    const countSelect = { select: { panels: panelCountFilter } };

    // Deep nesting to match admin view (5 levels)
    const categories = await this.prisma.category.findMany({
      where: whereClause,
      include: {
        children: {
          include: {
            children: {
              include: {
                children: {
                  include: {
                    children: {
                      include: {
                        _count: countSelect,
                      },
                      orderBy,
                    },
                    _count: countSelect,
                  },
                  orderBy,
                },
                _count: countSelect,
              },
              orderBy,
            },
            _count: countSelect,
          },
          orderBy,
        },
        _count: countSelect,
        catalogue: { select: { name: true, slug: true } },
      },
      orderBy,
    });

    return this.buildTreeWithCounts(categories);
  }

  private buildTreeWithCounts(categories: any[]): CategoryTreeNode[] {
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      catalogueSlug: cat.catalogue?.slug,
      catalogueName: cat.catalogue?.name,
      panelCount: cat._count?.panels || 0,
      children: cat.children ? this.buildTreeWithCounts(cat.children) : [],
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

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    // Use full-text search when search query is provided (handles accents properly)
    if (options?.search && options.search.trim().length >= 2) {
      const ftResult = await this.fullTextSearch(options.search, {
        catalogueSlug,
        limit,
        offset: skip,
      });

      // If full-text search succeeded, transform and return results
      if (ftResult.total >= 0) {
        const panels = ftResult.panels.map((p) => ({
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
          catalogueId: p.catalogueId,
          categoryId: p.categoryId,
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

        return { panels: panels as unknown as Panel[], total: ftResult.total };
      }
      // Fall through to Prisma ILIKE if full-text fails
    }

    // Fallback: Standard Prisma query with ILIKE
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

    // Search by name or reference (fallback ILIKE)
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { reference: { contains: options.search, mode: 'insensitive' } },
        { supplierCode: { contains: options.search, mode: 'insensitive' } },
      ];
    }

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

  /**
   * @deprecated Utiliser findAllPanels() pour une recherche plus complète
   * Cette méthode est conservée pour la rétrocompatibilité avec /api/catalogues/search
   */
  async searchPanels(query: string, limit: number = 20) {
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
   * Full-text search with 3-level fallback (full-text → trigram → ILIKE)
   * DELEGATED to SearchService
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
    return this.searchService.fullTextSearch(searchQuery, options);
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
    sortBy?:
      | 'name'
      | 'reference'
      | 'pricePerM2'
      | 'defaultThickness'
      | 'stockStatus';
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    panels: Panel[];
    total: number;
    hasMore: boolean;
    page: number;
    limit: number;
  }> {
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
        const panels = ftResult.panels.map((p) => ({
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

        const hasMore = skip + panels.length < ftResult.total;
        return {
          panels: panels as unknown as Panel[],
          total: ftResult.total,
          hasMore,
          page,
          limit,
        };
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
    let orderBy:
      | Prisma.PanelOrderByWithRelationInput
      | Prisma.PanelOrderByWithRelationInput[];

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
        {
          defaultThickness: {
            sort: sortDir as Prisma.SortOrder,
            nulls: 'last',
          },
        },
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
    return {
      panels: panels as unknown as Panel[],
      total,
      hasMore,
      page,
      limit,
    };
  }

  // ============================================
  // AUTOCOMPLETE - Fast suggestions for search
  // ============================================

  /**
   * Fast autocomplete search for panel suggestions
   * DELEGATED to AutocompleteService (with 60s cache)
   */
  async autocomplete(query: string, limit: number = 6) {
    return this.autocompleteService.search(query, limit);
  }

  // ============================================
  // FILTER OPTIONS - DELEGATED to FiltersService
  // ============================================

  /**
   * Get available filter options (5min cache)
   * DELEGATED to FiltersService
   */
  async getFilterOptions(catalogueSlug?: string) {
    return this.filtersService.getOptions(catalogueSlug);
  }

  /**
   * Invalidate filter options cache
   * DELEGATED to FiltersService
   */
  async invalidateFilterOptionsCache(catalogueSlug?: string): Promise<void> {
    return this.filtersService.invalidateCache(catalogueSlug);
  }

  // ============================================
  // SMART SEARCH - DELEGATED to SmartSearchService
  // ============================================

  /**
   * Smart Search: Parse natural language query and apply filters automatically
   * DELEGATED to SmartSearchService
   *
   * @example
   * - "mdf 19" → productType: MDF, thickness: 19mm
   * - "méla gris foncé" → productType: MELAMINE, search: "gris foncé"
   */
  async smartSearch(
    query: string,
    options?: {
      page?: number;
      limit?: number;
      catalogueSlug?: string;
      catalogueSlugs?: string[]; // Multiple catalogues filter
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
      enStock?: boolean;
      category?: 'panels' | 'chants' | 'all';
      /** Slug de catégorie sélectionnée dans l'arborescence */
      categorySlug?: string;
      decorCategory?: string;
      manufacturer?: string;
      isHydrofuge?: boolean;
      isIgnifuge?: boolean;
      isPreglued?: boolean;
      chantMaterial?: string;
    },
  ) {
    return this.smartSearchService.search(query, options);
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
      OR: [{ sponsoredUntil: null }, { sponsoredUntil: { gte: new Date() } }],
      catalogue: { isActive: true },
    };

    // Add search filter if query provided
    if (searchQuery && searchQuery.trim().length >= 2) {
      const normalizedQuery =
        this.searchService.normalizeSearchTerm(searchQuery);
      where.AND = [
        {
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { reference: { contains: normalizedQuery, mode: 'insensitive' } },
            {
              manufacturerRef: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
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
  async suggest(query: string): Promise<{
    originalQuery: string;
    suggestions: Array<{
      original: string;
      suggestion: string;
      confidence: number;
      type: 'wood' | 'color' | 'productType' | 'manufacturer' | 'other';
    }>;
    correctedQuery: string | null;
  }> {
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
  // VIEW TRACKING - DELEGATED to ViewTrackingService
  // ============================================

  /**
   * Track a panel view with rate limiting (5min)
   * DELEGATED to ViewTrackingService
   */
  async trackPanelView(panelId: string, viewerKey: string): Promise<void> {
    return this.viewTrackingService.track(panelId, viewerKey);
  }

  /**
   * Find popular panels
   * DELEGATED to ViewTrackingService
   */
  async findPopular(options?: {
    limit?: number;
    period?: 'week' | 'all';
    category?: 'panels' | 'chants' | 'all';
  }) {
    return this.viewTrackingService.findPopular(options);
  }

  /**
   * Reset weekly views (cron job)
   * DELEGATED to ViewTrackingService
   */
  async resetWeeklyViews(): Promise<void> {
    return this.viewTrackingService.resetWeeklyViews();
  }

  /**
   * Cleanup old view logs
   * DELEGATED to ViewTrackingService
   */
  async cleanupOldViewLogs(): Promise<void> {
    return this.viewTrackingService.cleanupOldViewLogs();
  }

  // ============================================
  // ADMIN CATEGORIES - Gestion de l'arborescence
  // ============================================

  /**
   * Get all categories with full tree structure for admin
   * Returns root categories with nested children (up to 4 levels)
   * Only returns categories from the 'cutx' catalogue
   * @param catalogueSlugs - Filter panel counts by catalogue slugs (e.g., ['dispano', 'bouney', 'barrillet'])
   */
  async getAllCategoriesForAdmin(catalogueSlugs?: string[]): Promise<Category[]> {
    // Get the cutx catalogue ID
    const cutxCatalogue = await this.prisma.catalogue.findFirst({
      where: { slug: 'cutx' },
    });

    if (!cutxCatalogue) {
      return [];
    }

    // Note: orderBy uses sortOrder field added to schema
    // After server restart and prisma generate, TypeScript will recognize it
    const orderBy = [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] as any;

    // Build panel filter based on catalogue slugs
    // This filters the _count to only count panels from selected catalogues
    const panelCountFilter = catalogueSlugs?.length
      ? {
          where: {
            isActive: true,
            catalogue: { slug: { in: catalogueSlugs } },
          },
        }
      : { where: { isActive: true } };

    // Helper to build _count with filter
    const countSelect = { select: { panels: panelCountFilter } };

    return this.prisma.category.findMany({
      where: {
        parentId: null,
        catalogueId: cutxCatalogue.id,
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: {
                  include: {
                    children: {
                      include: {
                        _count: countSelect,
                      },
                      orderBy,
                    },
                    _count: countSelect,
                  },
                  orderBy,
                },
                _count: countSelect,
              },
              orderBy,
            },
            _count: countSelect,
          },
          orderBy,
        },
        _count: countSelect,
      },
      orderBy,
    });
  }

  /**
   * Create a new category
   */
  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    // Get default catalogue (cutx) if not specified
    let catalogueId = dto.catalogueId;
    if (!catalogueId) {
      const cutx = await this.prisma.catalogue.findFirst({
        where: { slug: 'cutx' },
      });
      if (!cutx) {
        throw new BadRequestException('Catalogue CutX non trouvé');
      }
      catalogueId = cutx.id;
    }

    // Check if slug already exists in this catalogue
    const existing = await this.prisma.category.findFirst({
      where: { slug: dto.slug, catalogueId },
    });
    if (existing) {
      throw new BadRequestException(`Le slug "${dto.slug}" existe déjà`);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        parentId: dto.parentId || null,
        catalogueId,
      },
      include: {
        _count: { select: { panels: true } },
      },
    });
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${id}" non trouvée`);
    }

    // If updating slug, check for duplicates
    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.prisma.category.findFirst({
        where: {
          slug: dto.slug,
          catalogueId: category.catalogueId,
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestException(`Le slug "${dto.slug}" existe déjà`);
      }
    }

    // Prevent setting parent to self or descendant
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Une catégorie ne peut pas être son propre parent');
      }
      // Check if new parent is a descendant
      const descendants = await this.getDescendantIds(id);
      if (descendants.includes(dto.parentId)) {
        throw new BadRequestException('Impossible de déplacer une catégorie vers un de ses descendants');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include: {
        _count: { select: { panels: true } },
      },
    });
  }

  /**
   * Delete a category (only if empty and no children)
   */
  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: { select: { panels: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${id}" non trouvée`);
    }

    if (category.children.length > 0) {
      throw new BadRequestException(
        'Impossible de supprimer : la catégorie contient des sous-catégories',
      );
    }

    if (category._count.panels > 0) {
      throw new BadRequestException(
        `Impossible de supprimer : la catégorie contient ${category._count.panels} panneau(x)`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Move a category to a new parent
   */
  async moveCategory(
    id: string,
    newParentId: string | null,
  ): Promise<Category> {
    return this.updateCategory(id, { parentId: newParentId });
  }

  /**
   * Reorder categories - update sortOrder for multiple categories
   * Used for drag & drop reordering
   */
  async reorderCategories(
    updates: Array<{ id: string; sortOrder: number; parentId?: string | null }>,
  ): Promise<{ success: boolean }> {
    console.log(`Reordering ${updates.length} categories...`);

    // Validate all category IDs exist before updating
    const ids = updates.map((u) => u.id);
    const existingCategories = await this.prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const existingIds = new Set(existingCategories.map((c) => c.id));
    const missingIds = ids.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      throw new Error(`Categories not found: ${missingIds.join(', ')}`);
    }

    try {
      // Use transaction to update all categories atomically
      await this.prisma.$transaction(
        updates.map((update) =>
          this.prisma.category.update({
            where: { id: update.id },
            data: {
              sortOrder: update.sortOrder,
              ...(update.parentId !== undefined && { parentId: update.parentId }),
            },
          }),
        ),
      );

      console.log('Reorder successful');
      return { success: true };
    } catch (error) {
      console.error('Reorder categories error:', error);
      throw error;
    }
  }

  /**
   * Assign multiple panels to a category
   * Used for drag & drop panel organization in admin
   */
  async assignPanelsToCategory(
    panelIds: string[],
    categoryId: string,
  ): Promise<{ success: number; failed: number; categoryId: string }> {
    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Catégorie ${categoryId} non trouvée`);
    }

    // Batch update panels
    const result = await this.prisma.panel.updateMany({
      where: { id: { in: panelIds } },
      data: { categoryId },
    });

    console.log(
      `Assigned ${result.count} panels to category "${category.name}" (${categoryId})`,
    );

    return {
      success: result.count,
      failed: panelIds.length - result.count,
      categoryId,
    };
  }

  /**
   * Update verification note for a panel
   * Used for flagging panels that need review/correction
   */
  async updatePanelVerificationNote(
    panelId: string,
    note: string | null,
  ): Promise<{ id: string; verificationNote: string | null }> {
    const panel = await this.prisma.panel.findUnique({
      where: { id: panelId },
    });

    if (!panel) {
      throw new NotFoundException(`Panel ${panelId} non trouvé`);
    }

    const updated = await this.prisma.panel.update({
      where: { id: panelId },
      data: {
        verificationNote: note,
        // Optionally update review status if adding a note
        ...(note ? { reviewStatus: 'A_CORRIGER' } : {}),
      },
      select: { id: true, verificationNote: true },
    });

    console.log(
      `Updated verification note for panel ${panelId}: ${note ? note.substring(0, 50) + '...' : '(cleared)'}`,
    );

    return updated;
  }

  /**
   * Get all panels with a verification note
   * Used for reviewing flagged panels
   */
  async getPanelsWithVerificationNote(): Promise<
    {
      id: string;
      reference: string;
      name: string;
      verificationNote: string;
      categoryId: string | null;
      catalogueSlug: string;
    }[]
  > {
    const panels = await this.prisma.panel.findMany({
      where: {
        verificationNote: { not: null },
      },
      select: {
        id: true,
        reference: true,
        name: true,
        verificationNote: true,
        categoryId: true,
        catalogue: { select: { slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return panels.map((p) => ({
      id: p.id,
      reference: p.reference,
      name: p.name,
      verificationNote: p.verificationNote!,
      categoryId: p.categoryId,
      catalogueSlug: p.catalogue.slug,
    }));
  }

  /**
   * Get all descendant IDs of a category (for circular reference check)
   * @param maxDepth - Maximum recursion depth to prevent stack overflow (default: 10)
   */
  private async getDescendantIds(
    categoryId: string,
    maxDepth: number = 10,
  ): Promise<string[]> {
    const descendants: string[] = [];
    const visited = new Set<string>();

    const collectDescendants = async (parentId: string, depth: number) => {
      // Prevent infinite recursion
      if (depth > maxDepth || visited.has(parentId)) {
        return;
      }
      visited.add(parentId);

      const children = await this.prisma.category.findMany({
        where: { parentId },
        select: { id: true },
      });

      for (const child of children) {
        if (!visited.has(child.id)) {
          descendants.push(child.id);
          await collectDescendants(child.id, depth + 1);
        }
      }
    };

    await collectDescendants(categoryId, 0);
    return descendants;
  }

  /**
   * Delete a single panel
   */
  async deletePanel(panelId: string): Promise<void> {
    const panel = await this.prisma.panel.findUnique({
      where: { id: panelId },
      select: { id: true, reference: true },
    });

    if (!panel) {
      throw new NotFoundException(`Panel with ID "${panelId}" not found`);
    }

    await this.prisma.panel.delete({ where: { id: panelId } });
    console.log(`Deleted panel: ${panel.reference} (${panelId})`);
  }

  /**
   * Delete multiple panels (batch)
   */
  async deletePanels(panelIds: string[]): Promise<{ deleted: number }> {
    if (!panelIds || panelIds.length === 0) {
      return { deleted: 0 };
    }

    const result = await this.prisma.panel.deleteMany({
      where: { id: { in: panelIds } },
    });

    console.log(`Batch deleted ${result.count} panels`);
    return { deleted: result.count };
  }
}
