import { randomUUID } from 'crypto';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  InitialGroupeData,
  LignePrestationV3,
  PanneauCatalogue,
  ParsedDebit,
  ParsedPanel,
} from '../types/ai-types';

/**
 * Maps productType to categorie for frontend compatibility
 */
function mapProductTypeToCategorie(productType: string | null): string {
  const mapping: Record<string, string> = {
    MELAMINE: 'melamine',
    STRATIFIE: 'stratifie',
    MDF: 'mdf',
    MDF_HYDRO: 'mdf',
    PARTICULE: 'agglomere',
    CONTREPLAQUE: 'contreplaque',
    PLACAGE: 'placage',
    COMPACT: 'compact',
    SOLID_SURFACE: 'solid_surface',
    OSB: 'osb',
    BANDE_DE_CHANT: 'chant',
  };
  return mapping[productType || ''] || 'autre';
}

/**
 * Builds price map from panel data
 */
function buildPrixM2(thicknesses: number[], pricePerM2: number | null): Record<string, number> {
  const prixM2: Record<string, number> = {};
  const defaultPrice = pricePerM2 || 0;

  for (const thickness of thicknesses) {
    prixM2[thickness.toString()] = defaultPrice;
  }

  return prixM2;
}

/**
 * Creates a single ligne from debit data
 */
function createLigneFromDebit(
  debit: ParsedDebit,
  panneau: PanneauCatalogue,
  index: number,
): LignePrestationV3 {
  const thickness = panneau.epaisseurs[0] || 19;

  return {
    id: randomUUID(),
    reference:
      debit.quantity > 1 ? `${debit.reference} (${index}/${debit.quantity})` : debit.reference,
    typeLigne: 'panneau',
    ligneParentId: null,
    materiau: panneau.nom,
    dimensions: {
      longueur: debit.longueur,
      largeur: debit.largeur,
      epaisseur: thickness,
    },
    chants: debit.chants,
    sensDuFil: 'longueur',
    forme: 'rectangle',
    chantsConfig: { type: 'rectangle', edges: debit.chants },
    dimensionsLShape: null,
    dimensionsTriangle: null,
    formeCustom: null,
    usinages: [],
    percage: false,
    avecFourniture: true,
    panneauId: panneau.id,
    panneauNom: panneau.nom,
    panneauImageUrl: panneau.imageUrl || null,
    prixPanneauM2: Object.values(panneau.prixM2)[0] || 0,
    avecFinition: false,
    typeFinition: null,
    finition: null,
    teinte: null,
    codeCouleurLaque: null,
    brillance: null,
    nombreFaces: 1,
    // Calculated fields (will be recalculated by frontend)
    surfaceM2: 0,
    surfaceFacturee: 0,
    metresLineairesChants: 0,
    prixPanneau: 0,
    prixFaces: 0,
    prixChants: 0,
    prixUsinages: 0,
    prixPercage: 0,
    prixFournitureHT: 0,
    prixPrestationHT: 0,
    prixHT: 0,
    prixTTC: 0,
  };
}

/**
 * Finds the best matching panel in the database based on Claude's criteria
 */
async function findMatchingPanel(
  prisma: PrismaService,
  criteria: ParsedPanel['criteria'],
  productType: string,
): Promise<{
  id: string;
  name: string;
  productType: string | null;
  thickness: number[];
  pricePerM2: number | null;
  defaultLength: number | null;
  defaultWidth: number | null;
  imageUrl: string | null;
  description: string | null;
  isActive: boolean;
  catalogue: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  // Build search query from keywords
  const searchTerms = criteria.keywords.join(' ');

  // First try exact productType match with keywords
  const panel = await prisma.panel.findFirst({
    where: {
      isActive: true,
      productType: productType,
      OR: searchTerms
        ? [
            { name: { contains: searchTerms, mode: 'insensitive' } },
            { finish: { contains: searchTerms, mode: 'insensitive' } },
            { colorCode: { contains: searchTerms, mode: 'insensitive' } },
          ]
        : undefined,
      // Filter by thickness if specified
      ...(criteria.thickness ? { thickness: { has: criteria.thickness } } : {}),
    },
    include: {
      catalogue: { select: { name: true } },
    },
    orderBy: [{ pricePerM2: 'asc' }, { name: 'asc' }],
  });

  if (panel) return panel;

  // Fallback: just productType without keyword filter
  const fallbackPanel = await prisma.panel.findFirst({
    where: {
      isActive: true,
      productType: productType,
      ...(criteria.thickness ? { thickness: { has: criteria.thickness } } : {}),
    },
    include: {
      catalogue: { select: { name: true } },
    },
    orderBy: [{ pricePerM2: 'asc' }, { name: 'asc' }],
  });

  return fallbackPanel;
}

/**
 * Builds InitialGroupeData[] from Claude's recommendation
 */
export async function buildGroupeDataFromClaude(
  recommendation: { panels: ParsedPanel[]; debits: ParsedDebit[] },
  prisma: PrismaService,
): Promise<InitialGroupeData[]> {
  const groupes: InitialGroupeData[] = [];

  for (const panel of recommendation.panels) {
    // Search for matching panel in database
    const dbPanel = await findMatchingPanel(prisma, panel.criteria, panel.productType);

    if (!dbPanel) {
      console.warn(`[AI Assistant] Panel not found for: ${panel.role} (${panel.productType})`);
      continue;
    }

    // Convert to PanneauCatalogue format
    const panneauCatalogue: PanneauCatalogue = {
      id: dbPanel.id,
      nom: dbPanel.name,
      categorie: mapProductTypeToCategorie(dbPanel.productType),
      essence: null,
      epaisseurs: dbPanel.thickness,
      prixM2: buildPrixM2(dbPanel.thickness, dbPanel.pricePerM2),
      fournisseur: dbPanel.catalogue?.name || null,
      disponible: dbPanel.isActive,
      description: dbPanel.description,
      ordre: 0,
      longueur: dbPanel.defaultLength,
      largeur: dbPanel.defaultWidth,
      createdAt: dbPanel.createdAt.toISOString(),
      updatedAt: dbPanel.updatedAt.toISOString(),
      imageUrl: dbPanel.imageUrl || undefined,
    };

    // Build lignes for this panel
    const debitsForPanel = recommendation.debits.filter((d) => d.panelRole === panel.role);
    const lignes: LignePrestationV3[] = [];

    for (const debit of debitsForPanel) {
      for (let i = 0; i < debit.quantity; i++) {
        lignes.push(createLigneFromDebit(debit, panneauCatalogue, i + 1));
      }
    }

    groupes.push({
      panneau: { type: 'catalogue', panneau: panneauCatalogue },
      lignes,
    });
  }

  return groupes;
}
