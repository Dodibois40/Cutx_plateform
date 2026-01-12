import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PanelsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get panel details by ID - public endpoint
   * Returns all classification fields for display
   */
  async findOne(id: string) {
    const panel = await this.prisma.panel.findUnique({
      where: { id, isActive: true },
      select: {
        // Core identifiers
        id: true,
        reference: true,
        name: true,
        description: true,
        manufacturerRef: true,

        // Classification - Type
        productType: true,
        panelType: true,
        panelSubType: true,
        productCategory: true,

        // Classification - Decor
        decorCode: true,
        decorName: true,
        decorCategory: true,
        decorSubCategory: true,
        decor: true,

        // Classification - Finish
        finish: true,
        finishCode: true,
        finishName: true,

        // Classification - Core
        coreType: true,
        coreColor: true,
        material: true,

        // Classification - Wood specific
        grainDirection: true,
        lamellaType: true,

        // Technical attributes
        isHydrofuge: true,
        isIgnifuge: true,
        isPreglued: true,
        isSynchronized: true,
        isFullRoll: true,

        // Dimensions
        defaultLength: true,
        defaultWidth: true,
        defaultThickness: true,
        thickness: true,
        isVariableLength: true,

        // Pricing
        pricePerM2: true,
        pricePerMl: true,
        pricePerUnit: true,
        pricePerPanel: true,

        // Media
        imageUrl: true,

        // Stock
        stockStatus: true,

        // Manufacturer (brand)
        manufacturer: true,
        colorCode: true,
        supportQuality: true,
        certification: true,

        // Relations
        catalogue: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!panel) {
      throw new NotFoundException(`Panel with ID "${id}" not found`);
    }

    return panel;
  }

  /**
   * Find related panels (same decor code, different types)
   * e.g., If looking at a melamine panel H1180, find matching edge bands
   */
  async findRelated(id: string, limit = 10) {
    const panel = await this.prisma.panel.findUnique({
      where: { id },
      select: { decorCode: true, manufacturer: true, panelType: true },
    });

    if (!panel || !panel.decorCode) {
      return [];
    }

    // Find panels with same decor code but different type
    const related = await this.prisma.panel.findMany({
      where: {
        decorCode: panel.decorCode,
        id: { not: id },
        isActive: true,
      },
      take: limit,
      select: {
        id: true,
        reference: true,
        name: true,
        panelType: true,
        panelSubType: true,
        defaultThickness: true,
        pricePerM2: true,
        pricePerMl: true,
        imageUrl: true,
        manufacturer: true,
        catalogue: {
          select: { name: true },
        },
      },
      orderBy: [
        { panelType: 'asc' },
        { defaultThickness: 'asc' },
      ],
    });

    return related;
  }
}
