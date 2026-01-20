/**
 * SCRIPT DE CORRECTION DES CATÉGORIES
 *
 * Réassigne les panneaux qui sont dans des catégories de leur catalogue source
 * vers les catégories CutX correspondantes.
 *
 * Usage:
 *   npx ts-node scripts/fix-category-assignments.ts          # DRY RUN
 *   npx ts-node scripts/fix-category-assignments.ts --execute # EXÉCUTION
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// =============================================================================
// MAPPING productType → catégorie CutX (niveau 2)
// =============================================================================

const PRODUCT_TYPE_TO_CUTX_CATEGORY: Record<string, string> = {
  // Panneaux décorés
  MELAMINE: 'melamines',
  STRATIFIE: 'stratifies-hpl',
  COMPACT: 'compacts-hpl',
  PANNEAU_DECORATIF: 'melamines',

  // Panneaux bruts
  CONTREPLAQUE: 'contreplaque',
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  OSB: 'osb',
  LATTE: 'latte',

  // Bois massifs
  PANNEAU_MASSIF: 'panneautes', // fallback, sera affiné
  PANNEAU_3_PLIS: '3-plis',
  PLACAGE: 'plaques-bois',

  // Spéciaux
  SOLID_SURFACE: 'solid-surface',
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  PANNEAU_MURAL: 'panneaux-muraux',
  PANNEAU_CONSTRUCTION: 'panneaux-speciaux',
  PANNEAU_ALVEOLAIRE: 'alveolaire',
  CIMENT_BOIS: 'bois-ciment',
  PANNEAU_ISOLANT: 'isolant',
  PANNEAU_SPECIAL: 'panneaux-speciaux',

  // Chants
  BANDE_DE_CHANT: 'chants',
};

// =============================================================================
// RÈGLES D'AFFINAGE pour les sous-catégories (niveau 3)
// =============================================================================

interface SubcategoryRule {
  namePattern: RegExp;
  targetSlug: string;
}

const SUBCATEGORY_RULES: Record<string, SubcategoryRule[]> = {
  // 3 Plis
  '3-plis': [
    { namePattern: /ch[êe]ne/i, targetSlug: '3-plis-chene' },
    { namePattern: /[ée]pic[ée]a/i, targetSlug: '3-plis-epicea' },
    { namePattern: /./i, targetSlug: '3-plis-divers' }, // fallback
  ],

  // Lamellés-collés
  'lamelles-colles': [
    { namePattern: /ch[êe]ne/i, targetSlug: 'lc-chene' },
    { namePattern: /h[êe]tre/i, targetSlug: 'lc-hetre' },
    { namePattern: /[ée]pic[ée]a/i, targetSlug: 'lc-epicea' },
    { namePattern: /./i, targetSlug: 'lc-divers' },
  ],

  // MDF
  'mdf': [
    { namePattern: /hydro/i, targetSlug: 'mdf-hydrofuge' },
    { namePattern: /ignif/i, targetSlug: 'mdf-ignifuge' },
    { namePattern: /laqu/i, targetSlug: 'mdf-laquer' },
    { namePattern: /l[ée]ger/i, targetSlug: 'mdf-leger' },
    { namePattern: /teint/i, targetSlug: 'mdf-teinte' },
    { namePattern: /./i, targetSlug: 'mdf-standard' },
  ],

  // Contreplaqués
  'contreplaque': [
    { namePattern: /bouleau/i, targetSlug: 'cp-bouleau' },
    { namePattern: /okoum[ée]/i, targetSlug: 'cp-okoume' },
    { namePattern: /peuplier/i, targetSlug: 'cp-peuplier' },
    { namePattern: /film[ée]/i, targetSlug: 'cp-filme' },
    { namePattern: /marine|ctbx/i, targetSlug: 'cp-marine' },
    { namePattern: /cintr/i, targetSlug: 'cp-cintrable' },
    { namePattern: /pin/i, targetSlug: 'cp-pin' },
    { namePattern: /./i, targetSlug: 'contreplaque' }, // Keep in parent
  ],

  // Aggloméré
  'agglomere': [
    { namePattern: /hydro/i, targetSlug: 'agglo-hydrofuge' },
    { namePattern: /ignif/i, targetSlug: 'agglo-ignifuge' },
    { namePattern: /./i, targetSlug: 'agglo-standard' },
  ],

  // OSB
  'osb': [
    { namePattern: /hydro|osb.?3/i, targetSlug: 'osb-hydrofuge' },
    { namePattern: /./i, targetSlug: 'osb-standard' },
  ],

  // Mélaminés
  'melamines': [
    { namePattern: /uni|blanc|noir|gris|beige|anthracite/i, targetSlug: 'mela-unis' },
    { namePattern: /ch[êe]ne|noyer|h[êe]tre|bois|fr[êe]ne|teck|weng/i, targetSlug: 'mela-bois' },
    { namePattern: /pierre|b[ée]ton|marbre|granit/i, targetSlug: 'mela-pierre' },
    { namePattern: /./i, targetSlug: 'mela-fantaisie' },
  ],

  // Stratifiés
  'stratifies-hpl': [
    { namePattern: /uni|blanc|noir|gris/i, targetSlug: 'strat-unis' },
    { namePattern: /ch[êe]ne|noyer|bois/i, targetSlug: 'strat-bois' },
    { namePattern: /pierre|m[ée]tal/i, targetSlug: 'strat-pierre' },
    { namePattern: /./i, targetSlug: 'strat-fantaisie' },
  ],

  // Placages
  'plaques-bois': [
    { namePattern: /ch[êe]ne/i, targetSlug: 'placage-chene' },
    { namePattern: /h[êe]tre/i, targetSlug: 'placage-hetre' },
    { namePattern: /noyer/i, targetSlug: 'placage-noyer' },
    { namePattern: /fr[êe]ne/i, targetSlug: 'placage-frene' },
    { namePattern: /merisier/i, targetSlug: 'placage-merisier' },
    { namePattern: /[ée]rable/i, targetSlug: 'placage-erable' },
    { namePattern: /teck/i, targetSlug: 'placage-teck' },
    { namePattern: /weng/i, targetSlug: 'placage-wenge' },
    { namePattern: /./i, targetSlug: 'placages-divers' },
  ],

  // Chants
  'chants': [
    { namePattern: /abs/i, targetSlug: 'chants-abs' },
    { namePattern: /pvc/i, targetSlug: 'chants-pvc' },
    { namePattern: /bois|ch[êe]ne|noyer|h[êe]tre/i, targetSlug: 'chants-bois' },
    { namePattern: /m[ée]lamin/i, targetSlug: 'chants-melamines' },
    { namePattern: /./i, targetSlug: 'chants-abs' }, // Default to ABS
  ],

  // Sous-catégories ABS
  'chants-abs': [
    { namePattern: /uni|blanc|noir|gris/i, targetSlug: 'abs-unis' },
    { namePattern: /ch[êe]ne|noyer|bois|h[êe]tre/i, targetSlug: 'abs-bois' },
    { namePattern: /./i, targetSlug: 'abs-fantaisie' },
  ],

  // Chants bois
  'chants-bois': [
    { namePattern: /ch[êe]ne/i, targetSlug: 'chant-chene' },
    { namePattern: /noyer/i, targetSlug: 'chant-noyer' },
    { namePattern: /./i, targetSlug: 'chants-bois-divers' },
  ],

  // Solid Surface
  'solid-surface': [
    { namePattern: /corian/i, targetSlug: 'corian' },
    { namePattern: /./i, targetSlug: 'autres-ss' },
  ],
};

// =============================================================================
// FONCTION PRINCIPALE
// =============================================================================

interface PanelToReassign {
  id: string;
  name: string | null;
  productType: string | null;
  currentCategorySlug: string | null;
  currentCatalogueName: string | null;
  targetCategorySlug: string;
  targetCategoryId: string | null;
}

async function findBestCategory(
  panel: { name: string | null; productType: string | null },
  cutxCategories: Map<string, string>
): Promise<string | null> {
  const productType = panel.productType || '';
  const name = panel.name || '';

  // 1. Get base category from productType
  let baseCategorySlug = PRODUCT_TYPE_TO_CUTX_CATEGORY[productType];
  if (!baseCategorySlug) {
    // Unknown productType - skip
    return null;
  }

  // 2. Try to find a more specific subcategory
  let targetSlug = baseCategorySlug;

  // Apply subcategory rules
  const rules = SUBCATEGORY_RULES[baseCategorySlug];
  if (rules) {
    for (const rule of rules) {
      if (rule.namePattern.test(name)) {
        targetSlug = rule.targetSlug;
        break;
      }
    }
  }

  // If we're in a "chants-*" category, try deeper matching
  if (targetSlug.startsWith('chants-') && SUBCATEGORY_RULES[targetSlug]) {
    const deepRules = SUBCATEGORY_RULES[targetSlug];
    for (const rule of deepRules) {
      if (rule.namePattern.test(name)) {
        targetSlug = rule.targetSlug;
        break;
      }
    }
  }

  // 3. Check if the target category exists in CutX
  const categoryId = cutxCategories.get(targetSlug);
  if (!categoryId) {
    // Try the base category
    const baseId = cutxCategories.get(baseCategorySlug);
    return baseId || null;
  }

  return categoryId;
}

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');

  console.log('='.repeat(70));
  console.log('CORRECTION DES ASSIGNATIONS DE CATÉGORIES');
  console.log('='.repeat(70));

  if (executeMode) {
    console.log('⚠️  MODE EXÉCUTION - Les changements seront appliqués!');
  } else {
    console.log('🔍 MODE DRY RUN - Aucun changement ne sera effectué');
    console.log('   Utiliser --execute pour appliquer les changements');
  }

  try {
    // 1. Get CutX catalogue and all its categories
    const cutx = await prisma.catalogue.findFirst({ where: { slug: 'cutx' } });
    if (!cutx) {
      console.log('❌ Catalogue CutX non trouvé!');
      return;
    }

    const cutxCategories = await prisma.category.findMany({
      where: { catalogueId: cutx.id },
      select: { id: true, slug: true, name: true },
    });

    const cutxCategoryMap = new Map<string, string>();
    for (const cat of cutxCategories) {
      cutxCategoryMap.set(cat.slug, cat.id);
    }

    console.log(`\n📁 Catégories CutX disponibles: ${cutxCategories.length}`);

    // 2. Find panels in non-CutX categories
    const panelsInOwnCategories = await prisma.panel.findMany({
      where: {
        isActive: true,
        categoryId: { not: null },
        category: { catalogueId: { not: cutx.id } },
      },
      include: {
        category: {
          select: {
            slug: true,
            name: true,
            catalogue: { select: { name: true } },
          },
        },
      },
    });

    console.log(`\n📋 Panneaux à réassigner: ${panelsInOwnCategories.length}`);

    // 3. Determine target categories
    const reassignments: PanelToReassign[] = [];
    const unresolved: Array<{ name: string | null; productType: string | null }> = [];

    for (const panel of panelsInOwnCategories) {
      const targetCategoryId = await findBestCategory(
        { name: panel.name, productType: panel.productType },
        cutxCategoryMap
      );

      if (targetCategoryId) {
        // Find target slug for display
        const targetSlug = [...cutxCategoryMap.entries()].find(
          ([_, id]) => id === targetCategoryId
        )?.[0] || 'unknown';

        reassignments.push({
          id: panel.id,
          name: panel.name,
          productType: panel.productType,
          currentCategorySlug: panel.category?.slug || null,
          currentCatalogueName: panel.category?.catalogue?.name || null,
          targetCategorySlug: targetSlug,
          targetCategoryId,
        });
      } else {
        unresolved.push({ name: panel.name, productType: panel.productType });
      }
    }

    // 4. Display summary
    console.log('\n' + '='.repeat(70));
    console.log('RÉSUMÉ DES RÉASSIGNATIONS');
    console.log('='.repeat(70));

    // Group by source → target
    const transitions: Record<string, Record<string, number>> = {};
    for (const r of reassignments) {
      const source = r.currentCategorySlug || 'null';
      const target = r.targetCategorySlug;
      if (!transitions[source]) transitions[source] = {};
      transitions[source][target] = (transitions[source][target] || 0) + 1;
    }

    for (const [source, targets] of Object.entries(transitions)) {
      console.log(`\n${source}:`);
      for (const [target, count] of Object.entries(targets)) {
        console.log(`  → ${target}: ${count}`);
      }
    }

    if (unresolved.length > 0) {
      console.log(`\n⚠️ Non résolus: ${unresolved.length} panneaux`);
      // Show sample
      for (const u of unresolved.slice(0, 5)) {
        console.log(`  - [${u.productType}] ${u.name?.substring(0, 40)}`);
      }
    }

    // 5. Execute if requested
    if (executeMode && reassignments.length > 0) {
      console.log('\n⏳ Exécution dans 3 secondes...');
      await new Promise((r) => setTimeout(r, 3000));

      // Group by target category for batch updates
      const byTarget = new Map<string, string[]>();
      for (const r of reassignments) {
        if (r.targetCategoryId) {
          const ids = byTarget.get(r.targetCategoryId) || [];
          ids.push(r.id);
          byTarget.set(r.targetCategoryId, ids);
        }
      }

      let totalUpdated = 0;
      for (const [categoryId, panelIds] of byTarget) {
        const result = await prisma.panel.updateMany({
          where: { id: { in: panelIds } },
          data: { categoryId },
        });
        totalUpdated += result.count;

        // Find category name for logging
        const catName = cutxCategories.find((c) => c.id === categoryId)?.name || categoryId;
        console.log(`  ✅ ${result.count} panneaux → ${catName}`);
      }

      console.log('\n' + '='.repeat(70));
      console.log('TERMINÉ');
      console.log('='.repeat(70));
      console.log(`Total mis à jour: ${totalUpdated}`);
    } else if (!executeMode) {
      console.log('\n💡 Pour exécuter: npx ts-node scripts/fix-category-assignments.ts --execute');
    }

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
