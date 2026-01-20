import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Liste des décors connus pour extraction depuis le nom
const DECORS_CONNUS = [
  'chêne',
  'noyer',
  'châtaignier',
  'hêtre',
  'frêne',
  'érable',
  'merisier',
  'bouleau',
  'acacia',
  'teck',
  'wengé',
  'zebrano',
  'orme',
  'pin',
  'sapin',
  'mélèze',
  'olivier',
  'cerisier',
  'aulne',
  'tilleul',
  'peuplier',
  'bambou',
  'blanc',
  'noir',
  'gris',
  'beige',
  'anthracite',
  'crème',
  'taupe',
  'sable',
  'béton',
  'marbre',
  'pierre',
  'ardoise',
  'granit',
  'onyx',
];

/**
 * Extrait le décor d'un nom de panneau en cherchant des mots-clés connus
 */
function extractDecorFromName(name: string): string | null {
  const nameLower = name.toLowerCase();
  for (const decor of DECORS_CONNUS) {
    if (nameLower.includes(decor)) {
      return decor.charAt(0).toUpperCase() + decor.slice(1);
    }
  }
  return null;
}

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

        // Admin verification
        verificationNote: true,
        reviewStatus: true,

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
   *
   * Strategy (in order of priority):
   * 1. Match by decorCode if available
   * 2. Match by decorName if available
   * 3. Extract decor from name and search by text
   */
  async findRelated(id: string, limit = 10) {
    const panel = await this.prisma.panel.findUnique({
      where: { id },
      select: {
        decorCode: true,
        decorName: true,
        name: true,
        manufacturer: true,
        panelType: true,
      },
    });

    if (!panel) {
      return [];
    }

    const selectFields = {
      id: true,
      reference: true,
      name: true,
      productType: true,
      panelType: true,
      panelSubType: true,
      defaultThickness: true,
      pricePerM2: true,
      pricePerMl: true,
      imageUrl: true,
      manufacturer: true,
      decorCode: true,
      decorName: true,
      catalogue: {
        select: { name: true },
      },
    };

    // Strategy 1: Match by decorCode
    if (panel.decorCode) {
      const related = await this.prisma.panel.findMany({
        where: {
          decorCode: panel.decorCode,
          id: { not: id },
          isActive: true,
        },
        take: limit,
        select: selectFields,
        orderBy: [{ panelType: 'asc' }, { defaultThickness: 'asc' }],
      });

      if (related.length > 0) {
        return { panels: related, matchedBy: 'decorCode', decor: panel.decorCode };
      }
    }

    // Strategy 2: Match by decorName
    if (panel.decorName) {
      const related = await this.prisma.panel.findMany({
        where: {
          decorName: { equals: panel.decorName, mode: 'insensitive' },
          id: { not: id },
          isActive: true,
        },
        take: limit,
        select: selectFields,
        orderBy: [{ panelType: 'asc' }, { defaultThickness: 'asc' }],
      });

      if (related.length > 0) {
        return { panels: related, matchedBy: 'decorName', decor: panel.decorName };
      }
    }

    // Strategy 3: Extract decor from name and search
    const extractedDecor = extractDecorFromName(panel.name);
    if (extractedDecor) {
      const related = await this.prisma.panel.findMany({
        where: {
          name: { contains: extractedDecor, mode: 'insensitive' },
          id: { not: id },
          isActive: true,
        },
        take: limit,
        select: selectFields,
        orderBy: [{ panelType: 'asc' }, { defaultThickness: 'asc' }],
      });

      if (related.length > 0) {
        return { panels: related, matchedBy: 'nameExtraction', decor: extractedDecor };
      }
    }

    return { panels: [], matchedBy: null, decor: null };
  }

  /**
   * Get suggested decor for a panel (used by frontend to pre-fill chant search)
   */
  async getSuggestedDecor(id: string): Promise<{ decor: string | null; source: string | null }> {
    const panel = await this.prisma.panel.findUnique({
      where: { id },
      select: { decorCode: true, decorName: true, name: true },
    });

    if (!panel) {
      return { decor: null, source: null };
    }

    // Priority: decorName > decorCode > extracted from name
    if (panel.decorName) {
      return { decor: panel.decorName, source: 'decorName' };
    }

    if (panel.decorCode) {
      return { decor: panel.decorCode, source: 'decorCode' };
    }

    const extracted = extractDecorFromName(panel.name);
    if (extracted) {
      return { decor: extracted, source: 'nameExtraction' };
    }

    return { decor: null, source: null };
  }

  /**
   * Find the best matching edge band (chant) for a panel
   *
   * Logic:
   * - If panel is PLACAGE (real wood veneer) → prioritize "Chant Bois" (wood edge bands)
   * - Match by decor (chêne, hêtre, noyer, etc.)
   * - Return the best match with explanation
   */
  async findBestMatchingChant(id: string) {
    const panel = await this.prisma.panel.findUnique({
      where: { id },
      select: {
        name: true,
        productType: true,
        decorCode: true,
        decorName: true,
        defaultThickness: true, // Panel thickness to calculate required chant width
      },
    });

    if (!panel) {
      throw new NotFoundException(`Panel with ID "${id}" not found`);
    }

    // Extract decor from panel
    const decor = panel.decorName || panel.decorCode || extractDecorFromName(panel.name);
    if (!decor) {
      return { chant: null, reason: 'Impossible de déterminer le décor du panneau' };
    }

    // Determine if panel is real wood (PLACAGE)
    const isRealWood = panel.productType === 'PLACAGE' ||
                       panel.name.toLowerCase().includes('plaquage') ||
                       panel.name.toLowerCase().includes('placage');

    // Calculate required chant width: panel thickness + 3-5mm for trimming (affleurer)
    // Standard widths are typically: 23mm, 33mm, 43mm, etc.
    const panelThickness = panel.defaultThickness || 19;
    const minChantWidth = panelThickness + 3;
    const maxChantWidth = panelThickness + 8; // Allow some flexibility

    const selectFields = {
      id: true,
      reference: true,
      name: true,
      productType: true,
      defaultThickness: true,
      defaultWidth: true,
      pricePerMl: true,
      imageUrl: true,
      stockStatus: true,
      catalogue: { select: { name: true } },
    };

    // Search for edge bands matching the decor
    const decorLower = decor.toLowerCase();

    // First, search specifically for real wood chants (Chant Bois) with correct width
    const woodChants = await this.prisma.panel.findMany({
      where: {
        productType: 'BANDE_DE_CHANT',
        isActive: true,
        name: {
          contains: decorLower,
          mode: 'insensitive',
        },
        // Width must be >= panel thickness + 3mm for trimming
        defaultWidth: { gte: minChantWidth, lte: maxChantWidth },
        OR: [
          { name: { contains: 'chant bois', mode: 'insensitive' } },
          { name: { contains: 'bois véritable', mode: 'insensitive' } },
          { name: { contains: 'placage', mode: 'insensitive' } },
        ],
      },
      select: selectFields,
      take: 20,
    });

    // Then search for other non-ABS chants with correct width
    const otherChants = await this.prisma.panel.findMany({
      where: {
        productType: 'BANDE_DE_CHANT',
        isActive: true,
        name: {
          contains: decorLower,
          mode: 'insensitive',
        },
        defaultWidth: { gte: minChantWidth, lte: maxChantWidth },
        NOT: [
          { name: { contains: 'abs', mode: 'insensitive' } },
          { name: { contains: 'chant bois', mode: 'insensitive' } },
          { name: { contains: 'bois véritable', mode: 'insensitive' } },
        ],
      },
      select: selectFields,
      take: 20,
    });

    // Finally search for ABS chants with correct width
    const absChants = await this.prisma.panel.findMany({
      where: {
        productType: 'BANDE_DE_CHANT',
        isActive: true,
        name: {
          contains: decorLower,
          mode: 'insensitive',
        },
        defaultWidth: { gte: minChantWidth, lte: maxChantWidth },
        AND: [
          { name: { contains: 'abs', mode: 'insensitive' } },
        ],
      },
      select: selectFields,
      take: 20,
    });

    if (woodChants.length === 0 && otherChants.length === 0 && absChants.length === 0) {
      return {
        chant: null,
        reason: `Aucun chant trouvé pour le décor "${decor}"`,
        searchedDecor: decor,
      };
    }

    // Extract wood pattern keywords from panel name for better matching
    const panelNameLower = panel.name.toLowerCase();
    const patternKeywords = ['quartier', 'fil', 'maille', 'dosse', 'veiné'];
    const panelPatterns = patternKeywords.filter(kw => panelNameLower.includes(kw));

    // Score chants by how well they match the panel's pattern
    const scoreChant = (chant: typeof woodChants[0]) => {
      const chantNameLower = chant.name.toLowerCase();
      let score = 0;
      // Bonus for matching pattern keywords
      for (const pattern of panelPatterns) {
        if (chantNameLower.includes(pattern)) score += 10;
      }
      // Bonus for "de fil" which is the most common real wood pattern
      if (panelPatterns.length === 0 && chantNameLower.includes('de fil')) score += 5;
      return score;
    };

    // Sort each category by pattern match score
    woodChants.sort((a, b) => scoreChant(b) - scoreChant(a));
    otherChants.sort((a, b) => scoreChant(b) - scoreChant(a));
    absChants.sort((a, b) => scoreChant(b) - scoreChant(a));

    let bestChant: typeof woodChants[0] | null = null;
    let reason = '';

    if (isRealWood) {
      // For real wood panels, prioritize wood edge bands
      if (woodChants.length > 0) {
        bestChant = woodChants[0];
        const patternMatch = panelPatterns.length > 0 &&
          panelPatterns.some(p => bestChant!.name.toLowerCase().includes(p));
        reason = patternMatch
          ? `Chant bois ${decor} avec motif similaire`
          : `Chant bois ${decor} recommandé pour panneau plaqué`;
      } else if (otherChants.length > 0) {
        bestChant = otherChants[0];
        reason = `Chant ${decor} (pas de chant bois véritable disponible)`;
      } else if (absChants.length > 0) {
        bestChant = absChants[0];
        reason = `Chant ABS ${decor} (alternative - préférez un chant bois)`;
      }
    } else {
      // For melamine/other panels, ABS is fine
      if (absChants.length > 0) {
        bestChant = absChants[0];
        reason = `Chant ABS ${decor} recommandé`;
      } else if (otherChants.length > 0) {
        bestChant = otherChants[0];
        reason = `Chant ${decor}`;
      } else if (woodChants.length > 0) {
        bestChant = woodChants[0];
        reason = `Chant bois ${decor} disponible`;
      }
    }

    // Find all thickness variants of the best chant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let thicknessVariants: { thickness: number; chant: any }[] = [];

    if (bestChant) {
      // Get the main decor word from the best chant name
      const chantDecorMatch = DECORS_CONNUS.find(d =>
        bestChant!.name.toLowerCase().includes(d),
      );

      if (chantDecorMatch) {
        // Build type filter based on the best chant type
        const isAbs = bestChant.name.toLowerCase().includes('abs');
        const isWoodChant =
          bestChant.name.toLowerCase().includes('chant bois') ||
          bestChant.name.toLowerCase().includes('bois véritable');

        // Build the AND conditions for type matching
        const typeConditions: Prisma.PanelWhereInput[] = isAbs
          ? [{ name: { contains: 'abs', mode: 'insensitive' as Prisma.QueryMode } }]
          : isWoodChant
            ? [
                {
                  OR: [
                    { name: { contains: 'chant bois', mode: 'insensitive' as Prisma.QueryMode } },
                    { name: { contains: 'bois véritable', mode: 'insensitive' as Prisma.QueryMode } },
                  ],
                },
              ]
            : [];

        // Find all chants with same decor, same width, but potentially different thickness
        const allThicknessVariants = await this.prisma.panel.findMany({
          where: {
            productType: 'BANDE_DE_CHANT',
            isActive: true,
            defaultWidth: bestChant.defaultWidth, // Same width
            AND: [
              // Must contain the decor
              { name: { contains: chantDecorMatch, mode: 'insensitive' } },
              // Must match the same type (ABS vs wood vs other)
              ...typeConditions,
            ],
          },
          select: selectFields,
          orderBy: { defaultThickness: 'asc' },
          take: 10,
        });

        // Group by thickness and pick the best match for each
        const byThickness = new Map<number, (typeof allThicknessVariants)[0]>();
        for (const variant of allThicknessVariants) {
          const thickness = variant.defaultThickness || 1;
          if (!byThickness.has(thickness)) {
            byThickness.set(thickness, variant);
          }
        }

        thicknessVariants = Array.from(byThickness.entries())
          .map(([thickness, chant]) => ({ thickness, chant }))
          .sort((a, b) => a.thickness - b.thickness);
      }
    }

    return {
      chant: bestChant,
      reason,
      searchedDecor: decor,
      panelIsRealWood: isRealWood,
      panelThickness,
      requiredWidth: { min: minChantWidth, max: maxChantWidth },
      thicknessVariants, // All available thicknesses for this chant
      alternatives: {
        woodChants: woodChants.length,
        absChants: absChants.length,
        otherChants: otherChants.length,
      },
    };
  }
}
