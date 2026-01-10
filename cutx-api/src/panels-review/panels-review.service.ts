import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePanelDto } from './dto';
import { PanelReviewStatus } from '@prisma/client';

@Injectable()
export class PanelsReviewService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get review statistics
   */
  async getStats() {
    const [total, nonVerifie, verifie, aCorriger] = await Promise.all([
      this.prisma.panel.count({ where: { isActive: true } }),
      this.prisma.panel.count({
        where: { isActive: true, reviewStatus: 'NON_VERIFIE' },
      }),
      this.prisma.panel.count({
        where: { isActive: true, reviewStatus: 'VERIFIE' },
      }),
      this.prisma.panel.count({
        where: { isActive: true, reviewStatus: 'A_CORRIGER' },
      }),
    ]);

    return {
      total,
      nonVerifie,
      verifie,
      aCorriger,
      progressPercent: total > 0 ? Math.round((verifie / total) * 100) : 0,
    };
  }

  /**
   * Get a random panel for review
   */
  async getRandomPanel(status?: PanelReviewStatus) {
    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    if (status) {
      where.reviewStatus = status;
    }

    // Count panels matching criteria
    const count = await this.prisma.panel.count({ where });

    if (count === 0) {
      return null;
    }

    // Get random offset
    const randomOffset = Math.floor(Math.random() * count);

    // Fetch random panel with relations
    const panel = await this.prisma.panel.findFirst({
      where,
      skip: randomOffset,
      include: {
        catalogue: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    return panel;
  }

  /**
   * Get a panel by ID with relations
   */
  async getPanel(id: string) {
    const panel = await this.prisma.panel.findUnique({
      where: { id },
      include: {
        catalogue: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
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
   * Update a panel
   */
  async updatePanel(id: string, dto: UpdatePanelDto) {
    // Check panel exists
    await this.getPanel(id);

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Copy all non-undefined fields
    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    // Always update updatedAt
    updateData.updatedAt = new Date();

    const updated = await this.prisma.panel.update({
      where: { id },
      data: updateData,
      include: {
        catalogue: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Mark panel as verified and get next random panel
   */
  async verifyPanel(id: string, reviewedBy: string) {
    // Update current panel
    await this.prisma.panel.update({
      where: { id },
      data: {
        reviewStatus: 'VERIFIE',
        reviewedAt: new Date(),
        reviewedBy,
      },
    });

    // Get next random unverified panel
    const nextPanel = await this.getRandomPanel('NON_VERIFIE');

    // Get updated stats
    const stats = await this.getStats();

    return {
      verified: true,
      nextPanel,
      stats,
    };
  }

  /**
   * Mark panel for correction
   */
  async markForCorrection(id: string, reviewedBy: string, notes?: string) {
    const panel = await this.prisma.panel.update({
      where: { id },
      data: {
        reviewStatus: 'A_CORRIGER',
        reviewedAt: new Date(),
        reviewedBy,
        // Store notes in metadata if provided
        metadata: notes
          ? JSON.stringify({
              ...JSON.parse(
                (await this.prisma.panel.findUnique({ where: { id } }))
                  ?.metadata || '{}',
              ),
              reviewNotes: notes,
            })
          : undefined,
      },
      include: {
        catalogue: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    // Get next random unverified panel
    const nextPanel = await this.getRandomPanel('NON_VERIFIE');

    return {
      markedForCorrection: true,
      panel,
      nextPanel,
    };
  }

  /**
   * Reset panel to non-verified status
   */
  async resetReviewStatus(id: string) {
    const panel = await this.prisma.panel.update({
      where: { id },
      data: {
        reviewStatus: 'NON_VERIFIE',
        reviewedAt: null,
        reviewedBy: null,
      },
      include: {
        catalogue: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    return panel;
  }

  /**
   * Get all categories for dropdown
   */
  async getCategories() {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        catalogueId: true,
        parentId: true,
        parent: {
          select: { id: true, name: true },
        },
        catalogue: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ catalogue: { name: 'asc' } }, { name: 'asc' }],
    });

    return categories;
  }

  /**
   * Get panels marked for correction
   */
  async getPanelsToCorrect(limit = 50) {
    const panels = await this.prisma.panel.findMany({
      where: {
        isActive: true,
        reviewStatus: 'A_CORRIGER',
      },
      take: limit,
      orderBy: { reviewedAt: 'desc' },
      include: {
        catalogue: {
          select: { id: true, name: true, slug: true },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return panels;
  }
}
