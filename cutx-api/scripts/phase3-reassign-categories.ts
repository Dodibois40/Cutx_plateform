/**
 * PHASE 3: RÉASSIGNATION DES CATÉGORIES
 *
 * Ce script réassigne les panneaux vers les bonnes catégories
 * basées sur leur productType.
 *
 * SÉCURITÉ:
 * - Mode DRY RUN par défaut (ne fait rien, montre seulement)
 * - Utiliser --execute pour vraiment appliquer les changements
 * - Log détaillé de chaque opération
 * - Ne crée PAS de nouvelles catégories (erreur si manquante)
 *
 * Usage:
 *   npx ts-node scripts/phase3-reassign-categories.ts          # DRY RUN
 *   npx ts-node scripts/phase3-reassign-categories.ts --execute # VRAIE EXÉCUTION
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// =============================================================================
// CONFIGURATION - Mapping productType → slug de catégorie attendu
// =============================================================================

const PRODUCT_TYPE_TO_EXPECTED_CATEGORY: Record<string, string> = {
  // Matières brutes
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  OSB: 'osb',
  CONTREPLAQUE: 'contreplaque',

  // Panneaux décorés
  MELAMINE: 'melamines',
  STRATIFIE: 'stratifies-hpl',
  COMPACT: 'compacts-hpl',

  // Autres produits
  BANDE_DE_CHANT: 'chants',
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  PANNEAU_MASSIF: 'bois-massifs',
  SOLID_SURFACE: 'solid-surface',
  PLACAGE: 'plaques-bois',

  // Phase 2 - Nouveaux types
  PANNEAU_MURAL: 'panneaux-muraux',
  PANNEAU_DECORATIF: 'panneaux-decoratifs',
  PANNEAU_3_PLIS: 'panneaux-3-plis',
  LATTE: 'panneaux-lattes',
  PANNEAU_ISOLANT: 'panneaux-isolants',
  PANNEAU_ALVEOLAIRE: 'panneaux-alveolaires',
  CIMENT_BOIS: 'ciment-bois',
};

// =============================================================================
// TYPES
// =============================================================================

interface PanelToReassign {
  id: string;
  name: string;
  catalogueName: string;
  catalogueId: string;
  currentCategorySlug: string;
  currentCategoryPath: string;
  targetCategorySlug: string;
  targetCategoryId: string | null;
}

interface ReassignmentPlan {
  productType: string;
  expectedSlug: string;
  panels: PanelToReassign[];
  canReassign: PanelToReassign[];
  cannotReassign: PanelToReassign[]; // No target category found
}

// =============================================================================
// MAIN LOGIC
// =============================================================================

async function buildReassignmentPlan(): Promise<ReassignmentPlan[]> {
  const plans: ReassignmentPlan[] = [];

  console.log('\n📋 Construction du plan de réassignation...\n');

  for (const [productType, expectedSlug] of Object.entries(PRODUCT_TYPE_TO_EXPECTED_CATEGORY)) {
    // Trouver les panneaux MAL classés pour ce productType
    const wrongPanels = await prisma.panel.findMany({
      where: {
        productType,
        isActive: true,
        NOT: {
          category: {
            OR: [
              { slug: expectedSlug },
              { parent: { slug: expectedSlug } },
            ],
          },
        },
      },
      select: {
        id: true,
        name: true,
        catalogueId: true,
        categoryId: true,
        category: {
          select: {
            slug: true,
            name: true,
            parent: { select: { slug: true, name: true } },
          },
        },
        catalogue: { select: { name: true } },
      },
    });

    if (wrongPanels.length === 0) {
      continue; // Tous les panneaux sont bien classés
    }

    // Trouver les catégories cibles dans chaque catalogue
    const catalogueIds = [...new Set(wrongPanels.map((p) => p.catalogueId))];
    const targetCategories = await prisma.category.findMany({
      where: {
        slug: expectedSlug,
        catalogueId: { in: catalogueIds },
      },
      select: { id: true, slug: true, catalogueId: true },
    });

    // Map catalogueId → categoryId cible
    const targetByCatalogue = new Map<string, string>();
    for (const cat of targetCategories) {
      targetByCatalogue.set(cat.catalogueId, cat.id);
    }

    // Construire la liste des panneaux à réassigner
    const panels: PanelToReassign[] = wrongPanels.map((panel) => {
      const currentSlug = panel.category?.slug || 'SANS_CATEGORIE';
      const parentSlug = panel.category?.parent?.slug || '';
      const currentPath = parentSlug ? `${parentSlug}/${currentSlug}` : currentSlug;

      return {
        id: panel.id,
        name: panel.name || '(sans nom)',
        catalogueName: panel.catalogue?.name || 'Unknown',
        catalogueId: panel.catalogueId,
        currentCategorySlug: currentSlug,
        currentCategoryPath: currentPath,
        targetCategorySlug: expectedSlug,
        targetCategoryId: targetByCatalogue.get(panel.catalogueId) || null,
      };
    });

    const canReassign = panels.filter((p) => p.targetCategoryId !== null);
    const cannotReassign = panels.filter((p) => p.targetCategoryId === null);

    plans.push({
      productType,
      expectedSlug,
      panels,
      canReassign,
      cannotReassign,
    });
  }

  return plans;
}

function displayPlan(plans: ReassignmentPlan[], verbose: boolean = false): void {
  console.log('='.repeat(70));
  console.log('PLAN DE RÉASSIGNATION DES CATÉGORIES');
  console.log('='.repeat(70));

  let totalCanReassign = 0;
  let totalCannotReassign = 0;

  for (const plan of plans) {
    console.log(`\n📦 ${plan.productType} → "${plan.expectedSlug}"`);
    console.log(`   Total mal classés: ${plan.panels.length}`);
    console.log(`   ✅ Peuvent être réassignés: ${plan.canReassign.length}`);

    if (plan.cannotReassign.length > 0) {
      console.log(`   ⚠️  SANS catégorie cible: ${plan.cannotReassign.length}`);

      // Grouper par catalogue pour les "cannotReassign"
      const byCatalogue = new Map<string, number>();
      for (const p of plan.cannotReassign) {
        byCatalogue.set(p.catalogueName, (byCatalogue.get(p.catalogueName) || 0) + 1);
      }
      for (const [cat, count] of byCatalogue) {
        console.log(`      - ${cat}: ${count} (catégorie "${plan.expectedSlug}" n'existe pas)`);
      }
    }

    totalCanReassign += plan.canReassign.length;
    totalCannotReassign += plan.cannotReassign.length;

    // Détail des migrations si verbose
    if (verbose && plan.canReassign.length > 0) {
      // Grouper par (catalogue, source → target)
      const migrations = new Map<string, number>();
      for (const p of plan.canReassign) {
        const key = `${p.catalogueName}: ${p.currentCategoryPath} → ${p.targetCategorySlug}`;
        migrations.set(key, (migrations.get(key) || 0) + 1);
      }
      console.log('   Migrations:');
      for (const [migration, count] of [...migrations.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`      ${count}x ${migration}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('RÉSUMÉ');
  console.log('='.repeat(70));
  console.log(`✅ Total pouvant être réassignés: ${totalCanReassign}`);
  console.log(`⚠️  Total sans catégorie cible:   ${totalCannotReassign}`);
  console.log(`📊 Total mal classés:             ${totalCanReassign + totalCannotReassign}`);
}

async function executeReassignment(plans: ReassignmentPlan[]): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 EXÉCUTION DES RÉASSIGNATIONS');
  console.log('='.repeat(70));

  let totalUpdated = 0;
  let totalErrors = 0;

  for (const plan of plans) {
    if (plan.canReassign.length === 0) continue;

    console.log(`\n📦 ${plan.productType} → "${plan.expectedSlug}" (${plan.canReassign.length} panneaux)`);

    // Grouper par targetCategoryId pour faire des updates en batch
    const byTargetCategory = new Map<string, string[]>();
    for (const p of plan.canReassign) {
      if (!p.targetCategoryId) continue;
      const ids = byTargetCategory.get(p.targetCategoryId) || [];
      ids.push(p.id);
      byTargetCategory.set(p.targetCategoryId, ids);
    }

    for (const [targetCategoryId, panelIds] of byTargetCategory) {
      try {
        const result = await prisma.panel.updateMany({
          where: { id: { in: panelIds } },
          data: { categoryId: targetCategoryId },
        });

        console.log(`   ✅ ${result.count} panneaux → categoryId=${targetCategoryId}`);
        totalUpdated += result.count;
      } catch (error) {
        console.error(`   ❌ Erreur pour categoryId=${targetCategoryId}:`, error);
        totalErrors += panelIds.length;
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('RÉSULTAT FINAL');
  console.log('='.repeat(70));
  console.log(`✅ Panneaux mis à jour: ${totalUpdated}`);
  if (totalErrors > 0) {
    console.log(`❌ Erreurs: ${totalErrors}`);
  }
}

// =============================================================================
// ENTRY POINT
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');
  const verbose = args.includes('--verbose') || args.includes('-v');

  console.log('='.repeat(70));
  console.log('PHASE 3: RÉASSIGNATION DES CATÉGORIES');
  console.log('='.repeat(70));

  if (executeMode) {
    console.log('⚠️  MODE EXÉCUTION - Les changements seront appliqués!');
  } else {
    console.log('🔍 MODE DRY RUN - Aucun changement ne sera effectué');
    console.log('   Utiliser --execute pour appliquer les changements');
  }

  try {
    // 1. Construire le plan
    const plans = await buildReassignmentPlan();

    if (plans.length === 0) {
      console.log('\n✅ Tous les panneaux sont déjà bien classés!');
      return;
    }

    // 2. Afficher le plan
    displayPlan(plans, verbose);

    // 3. Exécuter si demandé
    if (executeMode) {
      console.log('\n⏳ Attente 3 secondes avant exécution...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await executeReassignment(plans);
    } else {
      console.log('\n💡 Pour exécuter: npx ts-node scripts/phase3-reassign-categories.ts --execute');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
