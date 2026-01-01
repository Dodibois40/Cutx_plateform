import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Catalogue, Category, Panel, Prisma } from '@prisma/client';

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
   * Get panels from ALL active catalogues (for unified search)
   * Supports server-side filtering for better performance
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
  }): Promise<{ panels: Panel[]; total: number }> {
    const where: Prisma.PanelWhereInput = {
      isActive: true,
      catalogue: { isActive: true },
    };

    // Filter by catalogue slug if provided
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

    const page = options?.page || 1;
    const limit = options?.limit || 10000;
    const skip = (page - 1) * limit;

    const [panels, total] = await Promise.all([
      this.prisma.panel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
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

    return { panels: panels as unknown as Panel[], total };
  }
}
