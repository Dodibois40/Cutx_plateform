/**
 * ViewTrackingService - Handles panel view tracking and popularity
 *
 * Extracted from CataloguesService for better separation of concerns.
 * Provides:
 * - View tracking with rate limiting (1 view per viewer per panel per 5 minutes)
 * - Popular panels query
 * - Weekly views reset (for cron jobs)
 * - Old view logs cleanup
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Panel, Prisma } from '@prisma/client';

@Injectable()
export class ViewTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track a panel view with rate limiting
   * Rate limit: 1 view per viewer per panel per 5 minutes
   *
   * @param panelId - ID du panneau
   * @param viewerKey - Hash de l'IP ou ID utilisateur
   */
  async track(panelId: string, viewerKey: string): Promise<void> {
    // Hash the viewer key for privacy
    const hashedKey = crypto
      .createHash('sha256')
      .update(viewerKey)
      .digest('hex')
      .substring(0, 32);

    try {
      // Check if a recent view exists (rate limiting via upsert)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Try to find existing view entry
      const existingView = await this.prisma.panelViewLog.findUnique({
        where: {
          panelId_viewerKey: {
            panelId,
            viewerKey: hashedKey,
          },
        },
      });

      if (existingView && existingView.viewedAt > fiveMinutesAgo) {
        // Recent view exists, don't count
        return;
      }

      // Upsert the view (create or update the timestamp)
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

      // Increment counters (async, non-blocking)
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
   *
   * @param options - limit, period (week/all), category (panels/chants/all)
   */
  async findPopular(options?: {
    limit?: number;
    period?: 'week' | 'all';
    category?: 'panels' | 'chants' | 'all';
  }): Promise<Panel[]> {
    const limit = options?.limit || 10;
    const orderByField =
      options?.period === 'week' ? 'weeklyViews' : 'viewCount';

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
