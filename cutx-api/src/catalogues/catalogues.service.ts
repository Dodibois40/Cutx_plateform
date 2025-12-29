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
        include: { category: true },
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
  ): Promise<Panel[]> {
    return this.prisma.panel.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: { catalogue: true, category: true },
      orderBy: { name: 'asc' },
    });
  }
}
