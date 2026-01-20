/**
 * PHASE 3: CORRECTION COMPLÈTE
 *
 * 1. Corrige les "faux chants" (panneaux épais mal marqués BANDE_DE_CHANT)
 * 2. Réassigne les vrais chants vers les catégories "chants"
 *
 * Usage:
 *   npx ts-node scripts/phase3-fix-all.ts          # DRY RUN
 *   npx ts-node scripts/phase3-fix-all.ts --execute # EXÉCUTION
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// =============================================================================
// CONFIGURATION
// =============================================================================

// Mapping catégorie → productType correct (pour corriger les faux chants)
const CATEGORY_TO_PRODUCT_TYPE: Record<string, string> = {
  melamines: 'MELAMINE',
  'mela-': 'MELAMINE',
  stratif: 'STRATIFIE',
  'strat-': 'STRATIFIE',
  mdf: 'MDF',
  agglom: 'PARTICULE',
  agglo: 'PARTICULE',
  osb: 'OSB',
  contrepla: 'CONTREPLAQUE',
  compact: 'COMPACT',
  solid: 'SOLID_SURFACE',
};

// Seuil d'épaisseur pour considérer qu'un panneau n'est PAS un chant
const THICKNESS_THRESHOLD = 6; // mm

// =============================================================================
// STEP 1: CORRIGER LES FAUX CHANTS
// =============================================================================

interface FalseChant {
  id: string;
  name: string | null;
  categoryPath: string;
  thickness: number[];
  correctProductType: string;
}

async function findFalseChants(): Promise<FalseChant[]> {
  const panels = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      thickness: true,
      category: {
        select: {
          slug: true,
          parent: { select: { slug: true } },
        },
      },
    },
  });

  const falseChants: FalseChant[] = [];

  for (const p of panels) {
    // Check if thickness >= threshold
    if (!p.thickness || !Array.isArray(p.thickness)) continue;
    const maxThickness = Math.max(...p.thickness);
    if (maxThickness < THICKNESS_THRESHOLD) continue;

    // Get category path
    const catPath = p.category?.parent?.slug
      ? `${p.category.parent.slug}/${p.category.slug}`
      : p.category?.slug || 'null';

    // Skip if in a real chant category (might be width, not thickness)
    if (catPath.includes('chant')) continue;

    // Determine correct productType based on category
    let correctType = 'UNKNOWN';
    for (const [pattern, type] of Object.entries(CATEGORY_TO_PRODUCT_TYPE)) {
      if (catPath.toLowerCase().includes(pattern)) {
        correctType = type;
        break;
      }
    }

    if (correctType === 'UNKNOWN') continue; // Skip if we can't determine

    falseChants.push({
      id: p.id,
      name: p.name,
      categoryPath: catPath,
      thickness: p.thickness,
      correctProductType: correctType,
    });
  }

  return falseChants;
}

// =============================================================================
// STEP 2: TROUVER LES CHANTS À RÉASSIGNER
// =============================================================================

interface ChantToReassign {
  id: string;
  name: string | null;
  catalogueId: string;
  catalogueName: string;
  currentCategoryPath: string;
  targetCategoryId: string;
}

async function findChantsToReassign(): Promise<ChantToReassign[]> {
  // Find all BANDE_DE_CHANT not in a "chant" category
  const panels = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      isActive: true,
      NOT: {
        category: {
          OR: [
            { slug: { contains: 'chant' } },
            { parent: { slug: { contains: 'chant' } } },
          ],
        },
      },
    },
    select: {
      id: true,
      name: true,
      thickness: true,
      catalogueId: true,
      category: {
        select: {
          slug: true,
          parent: { select: { slug: true } },
        },
      },
      catalogue: { select: { name: true } },
    },
  });

  // Filter out thick panels (those are false chants, handled in step 1)
  const realChants = panels.filter((p) => {
    if (!p.thickness || !Array.isArray(p.thickness)) return true; // Keep if no thickness
    const maxThickness = Math.max(...p.thickness);
    return maxThickness < THICKNESS_THRESHOLD;
  });

  // Find target "chants" category for each catalogue
  const catalogueIds = [...new Set(realChants.map((p) => p.catalogueId))];

  // First, try to find existing "chants" categories in each catalogue
  const targetCategories = new Map<string, string>();

  for (const catId of catalogueIds) {
    // Look for a category with "chant" in slug at level 1
    let targetCat = await prisma.category.findFirst({
      where: {
        catalogueId: catId,
        slug: { contains: 'chant' },
        parentId: null,
      },
    });

    // If not found, look in CutX catalogue (panels might reference CutX categories)
    if (!targetCat) {
      const cutx = await prisma.catalogue.findFirst({ where: { slug: 'cutx' } });
      if (cutx) {
        targetCat = await prisma.category.findFirst({
          where: {
            catalogueId: cutx.id,
            slug: 'chants',
            parentId: null,
          },
        });
      }
    }

    if (targetCat) {
      targetCategories.set(catId, targetCat.id);
    }
  }

  // Build list of chants to reassign
  const toReassign: ChantToReassign[] = [];

  for (const p of realChants) {
    const targetCatId = targetCategories.get(p.catalogueId);
    if (!targetCatId) continue; // Skip if no target found

    const catPath = p.category?.parent?.slug
      ? `${p.category.parent.slug}/${p.category.slug}`
      : p.category?.slug || 'null';

    toReassign.push({
      id: p.id,
      name: p.name,
      catalogueId: p.catalogueId,
      catalogueName: p.catalogue?.name || 'Unknown',
      currentCategoryPath: catPath,
      targetCategoryId: targetCatId,
    });
  }

  return toReassign;
}

// =============================================================================
// EXECUTION
// =============================================================================

async function displayPlan(falseChants: FalseChant[], chantsToReassign: ChantToReassign[]) {
  console.log('\n' + '='.repeat(70));
  console.log('PLAN DE CORRECTION');
  console.log('='.repeat(70));

  // Step 1 summary
  console.log('\n📦 ÉTAPE 1: Corriger les faux chants (panneaux épais)');
  console.log('-'.repeat(50));

  if (falseChants.length === 0) {
    console.log('  Aucun faux chant à corriger');
  } else {
    // Group by target type
    const byType = new Map<string, number>();
    for (const fc of falseChants) {
      byType.set(fc.correctProductType, (byType.get(fc.correctProductType) || 0) + 1);
    }

    console.log(`  Total: ${falseChants.length} panneaux mal marqués BANDE_DE_CHANT`);
    console.log('  Corrections:');
    for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    → ${type}: ${count}`);
    }
  }

  // Step 2 summary
  console.log('\n📦 ÉTAPE 2: Réassigner les vrais chants');
  console.log('-'.repeat(50));

  if (chantsToReassign.length === 0) {
    console.log('  Aucun chant à réassigner');
  } else {
    // Group by source category
    const bySource = new Map<string, number>();
    for (const c of chantsToReassign) {
      bySource.set(c.currentCategoryPath, (bySource.get(c.currentCategoryPath) || 0) + 1);
    }

    console.log(`  Total: ${chantsToReassign.length} chants à déplacer vers catégorie "chants"`);
    console.log('  Sources actuelles:');
    for (const [src, count] of [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`    ${src}: ${count}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('RÉSUMÉ');
  console.log('='.repeat(70));
  console.log(`  Faux chants à corriger:    ${falseChants.length}`);
  console.log(`  Vrais chants à réassigner: ${chantsToReassign.length}`);
  console.log(`  Total opérations:          ${falseChants.length + chantsToReassign.length}`);
}

async function executeCorrections(falseChants: FalseChant[], chantsToReassign: ChantToReassign[]) {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 EXÉCUTION DES CORRECTIONS');
  console.log('='.repeat(70));

  let totalUpdated = 0;

  // Step 1: Fix false chants
  if (falseChants.length > 0) {
    console.log('\n📦 ÉTAPE 1: Correction des faux chants...');

    // Group by target productType for batch updates
    const byType = new Map<string, string[]>();
    for (const fc of falseChants) {
      const ids = byType.get(fc.correctProductType) || [];
      ids.push(fc.id);
      byType.set(fc.correctProductType, ids);
    }

    for (const [productType, ids] of byType) {
      const result = await prisma.panel.updateMany({
        where: { id: { in: ids } },
        data: { productType },
      });
      console.log(`  ✅ ${result.count} panneaux → productType=${productType}`);
      totalUpdated += result.count;
    }
  }

  // Step 2: Reassign real chants
  if (chantsToReassign.length > 0) {
    console.log('\n📦 ÉTAPE 2: Réassignation des vrais chants...');

    // Group by target category for batch updates
    const byTarget = new Map<string, string[]>();
    for (const c of chantsToReassign) {
      const ids = byTarget.get(c.targetCategoryId) || [];
      ids.push(c.id);
      byTarget.set(c.targetCategoryId, ids);
    }

    for (const [categoryId, ids] of byTarget) {
      const result = await prisma.panel.updateMany({
        where: { id: { in: ids } },
        data: { categoryId },
      });
      console.log(`  ✅ ${result.count} chants → categoryId=${categoryId}`);
      totalUpdated += result.count;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('TERMINÉ');
  console.log('='.repeat(70));
  console.log(`  Total panneaux mis à jour: ${totalUpdated}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');

  console.log('='.repeat(70));
  console.log('PHASE 3: CORRECTION COMPLÈTE DES CHANTS');
  console.log('='.repeat(70));

  if (executeMode) {
    console.log('⚠️  MODE EXÉCUTION - Les changements seront appliqués!');
  } else {
    console.log('🔍 MODE DRY RUN - Aucun changement ne sera effectué');
    console.log('   Utiliser --execute pour appliquer les changements');
  }

  try {
    // Analyze
    console.log('\n📋 Analyse en cours...');

    const falseChants = await findFalseChants();
    console.log(`  Faux chants trouvés: ${falseChants.length}`);

    const chantsToReassign = await findChantsToReassign();
    console.log(`  Chants à réassigner: ${chantsToReassign.length}`);

    // Display plan
    await displayPlan(falseChants, chantsToReassign);

    // Execute if requested
    if (executeMode) {
      console.log('\n⏳ Exécution dans 3 secondes...');
      await new Promise((r) => setTimeout(r, 3000));
      await executeCorrections(falseChants, chantsToReassign);
    } else {
      console.log('\n💡 Pour exécuter: npx ts-node scripts/phase3-fix-all.ts --execute');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
