/**
 * SCRIPT DE CORRECTION COMPLÈTE DES CATÉGORIES
 *
 * 1. Réassigne les panneaux dans des catégories non-CutX → vers CutX
 * 2. Corrige les sous-catégories CutX (ex: chêne dans "Divers" → vers "Chêne")
 *
 * Usage:
 *   npx ts-node scripts/fix-all-categories.ts          # DRY RUN
 *   npx ts-node scripts/fix-all-categories.ts --execute # EXÉCUTION
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// =============================================================================
// RÈGLES DE CLASSIFICATION
// =============================================================================

interface ClassificationRule {
  namePattern: RegExp;
  targetSlug: string;
}

// Règles pour déterminer la sous-catégorie basée sur le nom du panneau
const CLASSIFICATION_RULES: Record<string, ClassificationRule[]> = {
  // === 3 PLIS ===
  '3-plis': [
    { namePattern: /ch[êe]ne/i, targetSlug: '3-plis-chene' },
    { namePattern: /[ée]pic[ée]a/i, targetSlug: '3-plis-epicea' },
    { namePattern: /douglas/i, targetSlug: '3-plis-divers' },
    { namePattern: /h[êe]tre/i, targetSlug: '3-plis-divers' },
    { namePattern: /./i, targetSlug: '3-plis-divers' },
  ],

  // === LAMELLÉS-COLLÉS ===
  'lamelles-colles': [
    { namePattern: /ch[êe]ne/i, targetSlug: 'lc-chene' },
    { namePattern: /h[êe]tre/i, targetSlug: 'lc-hetre' },
    { namePattern: /[ée]pic[ée]a/i, targetSlug: 'lc-epicea' },
    { namePattern: /./i, targetSlug: 'lc-divers' },
  ],

  // === MDF ===
  'mdf': [
    { namePattern: /hydro/i, targetSlug: 'mdf-hydrofuge' },
    { namePattern: /ignif/i, targetSlug: 'mdf-ignifuge' },
    { namePattern: /laqu/i, targetSlug: 'mdf-laquer' },
    { namePattern: /l[ée]ger|light/i, targetSlug: 'mdf-leger' },
    { namePattern: /teint|noir|color/i, targetSlug: 'mdf-teinte' },
    { namePattern: /./i, targetSlug: 'mdf-standard' },
  ],

  // === CONTREPLAQUÉS ===
  'contreplaque': [
    { namePattern: /bouleau/i, targetSlug: 'cp-bouleau' },
    { namePattern: /okoum[ée]/i, targetSlug: 'cp-okoume' },
    { namePattern: /peuplier/i, targetSlug: 'cp-peuplier' },
    { namePattern: /film[ée]|coffrage/i, targetSlug: 'cp-filme' },
    { namePattern: /marine|ctbx/i, targetSlug: 'cp-marine' },
    { namePattern: /cintr/i, targetSlug: 'cp-cintrable' },
    { namePattern: /pin/i, targetSlug: 'cp-pin' },
    { namePattern: /exoti/i, targetSlug: 'cp-exotique' },
  ],

  // === AGGLOMÉRÉ ===
  'agglomere': [
    { namePattern: /hydro|ctbh/i, targetSlug: 'agglo-hydrofuge' },
    { namePattern: /ignif/i, targetSlug: 'agglo-ignifuge' },
    { namePattern: /./i, targetSlug: 'agglo-standard' },
  ],

  // === OSB ===
  'osb': [
    { namePattern: /hydro|osb.?3/i, targetSlug: 'osb-hydrofuge' },
    { namePattern: /./i, targetSlug: 'osb-standard' },
  ],

  // === MÉLAMINÉS ===
  'melamines': [
    { namePattern: /uni\b|blanc\b|noir\b|gris\b|beige|anthracite|ivoire/i, targetSlug: 'mela-unis' },
    { namePattern: /ch[êe]ne|noyer|h[êe]tre|fr[êe]ne|bois|teck|weng|[ée]rable|merisier|acacia|bambou/i, targetSlug: 'mela-bois' },
    { namePattern: /pierre|b[ée]ton|marbre|granit|ardoise/i, targetSlug: 'mela-pierre' },
    { namePattern: /./i, targetSlug: 'mela-fantaisie' },
  ],

  // === STRATIFIÉS ===
  'stratifies-hpl': [
    { namePattern: /uni\b|blanc\b|noir\b|gris\b/i, targetSlug: 'strat-unis' },
    { namePattern: /ch[êe]ne|noyer|bois|h[êe]tre|fr[êe]ne/i, targetSlug: 'strat-bois' },
    { namePattern: /pierre|m[ée]tal|inox|alu/i, targetSlug: 'strat-pierre' },
    { namePattern: /./i, targetSlug: 'strat-fantaisie' },
  ],

  // === PLACAGES ===
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

  // === CHANTS ABS ===
  'chants-abs': [
    { namePattern: /uni\b|blanc\b|noir\b|gris\b|beige|ivoire|cr[èe]me/i, targetSlug: 'abs-unis' },
    { namePattern: /ch[êe]ne|noyer|bois|h[êe]tre|fr[êe]ne|teck|weng|acacia|zebra/i, targetSlug: 'abs-bois' },
    { namePattern: /./i, targetSlug: 'abs-fantaisie' },
  ],

  // === CHANTS BOIS ===
  'chants-bois': [
    { namePattern: /ch[êe]ne/i, targetSlug: 'chant-chene' },
    { namePattern: /noyer/i, targetSlug: 'chant-noyer' },
    { namePattern: /./i, targetSlug: 'chants-bois-divers' },
  ],

  // === SOLID SURFACE ===
  'solid-surface': [
    { namePattern: /corian/i, targetSlug: 'corian' },
    { namePattern: /./i, targetSlug: 'autres-ss' },
  ],
};

// Mapping productType → catégorie CutX de base
const PRODUCT_TYPE_TO_CATEGORY: Record<string, string> = {
  MELAMINE: 'melamines',
  STRATIFIE: 'stratifies-hpl',
  COMPACT: 'compacts-hpl',
  PANNEAU_DECORATIF: 'melamines',
  CONTREPLAQUE: 'contreplaque',
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  OSB: 'osb',
  LATTE: 'latte',
  PANNEAU_MASSIF: 'panneautes',
  PANNEAU_3_PLIS: '3-plis',
  PLACAGE: 'plaques-bois',
  SOLID_SURFACE: 'solid-surface',
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  PANNEAU_MURAL: 'panneaux-muraux',
  PANNEAU_CONSTRUCTION: 'panneaux-speciaux',
  PANNEAU_ALVEOLAIRE: 'alveolaire',
  CIMENT_BOIS: 'bois-ciment',
  PANNEAU_ISOLANT: 'isolant',
  PANNEAU_SPECIAL: 'panneaux-speciaux',
  BANDE_DE_CHANT: 'chants',
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

function findTargetCategory(
  panelName: string,
  currentCategorySlug: string,
  categoryMap: Map<string, string>
): string | null {
  // Get rules for the current category's parent
  // First, check if current category has rules directly
  let rules = CLASSIFICATION_RULES[currentCategorySlug];

  // If not, try to find parent category rules
  if (!rules) {
    // Find parent slug (everything before last hyphen segment for subcategories)
    for (const parentSlug of Object.keys(CLASSIFICATION_RULES)) {
      if (currentCategorySlug.startsWith(parentSlug + '-') || currentCategorySlug === parentSlug) {
        rules = CLASSIFICATION_RULES[parentSlug];
        break;
      }
    }
  }

  if (!rules) return null;

  // Apply rules
  for (const rule of rules) {
    if (rule.namePattern.test(panelName)) {
      const targetId = categoryMap.get(rule.targetSlug);
      if (targetId) return targetId;
    }
  }

  return null;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const executeMode = args.includes('--execute');

  console.log('='.repeat(70));
  console.log('CORRECTION COMPLÈTE DES CATÉGORIES');
  console.log('='.repeat(70));

  if (executeMode) {
    console.log('⚠️  MODE EXÉCUTION');
  } else {
    console.log('🔍 MODE DRY RUN');
  }

  // Get CutX catalogue
  const cutx = await prisma.catalogue.findFirst({ where: { slug: 'cutx' } });
  if (!cutx) {
    console.log('❌ Catalogue CutX non trouvé!');
    return;
  }

  // Build category map
  const categories = await prisma.category.findMany({
    where: { catalogueId: cutx.id },
    select: { id: true, slug: true, name: true, parentId: true },
  });

  const categoryMap = new Map<string, string>();
  const categoryNameMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.slug, cat.id);
    categoryNameMap.set(cat.id, cat.name);
  }

  // Get parent category for each category
  const parentSlugMap = new Map<string, string>();
  for (const cat of categories) {
    if (cat.parentId) {
      const parent = categories.find((c) => c.id === cat.parentId);
      if (parent) parentSlugMap.set(cat.slug, parent.slug);
    }
  }

  console.log(`\n📁 ${categories.length} catégories CutX chargées`);

  // ==========================================================================
  // PHASE 1: Panneaux dans catégories non-CutX
  // ==========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1: PANNEAUX DANS CATÉGORIES NON-CUTX');
  console.log('='.repeat(70));

  const nonCutxPanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      categoryId: { not: null },
      category: { catalogueId: { not: cutx.id } },
    },
    select: {
      id: true,
      name: true,
      productType: true,
      category: { select: { slug: true } },
    },
  });

  console.log(`\n📋 ${nonCutxPanels.length} panneaux à migrer vers CutX`);

  const phase1Updates: Array<{ id: string; categoryId: string; from: string; to: string }> = [];

  for (const panel of nonCutxPanels) {
    const baseSlug = PRODUCT_TYPE_TO_CATEGORY[panel.productType || ''];
    if (!baseSlug) continue;

    // Try to find specific subcategory
    const rules = CLASSIFICATION_RULES[baseSlug];
    let targetSlug = baseSlug;

    if (rules) {
      for (const rule of rules) {
        if (rule.namePattern.test(panel.name || '')) {
          targetSlug = rule.targetSlug;
          break;
        }
      }
    }

    const targetId = categoryMap.get(targetSlug);
    if (targetId) {
      phase1Updates.push({
        id: panel.id,
        categoryId: targetId,
        from: panel.category?.slug || 'null',
        to: targetSlug,
      });
    }
  }

  // Summary Phase 1
  const phase1Summary: Record<string, Record<string, number>> = {};
  for (const u of phase1Updates) {
    if (!phase1Summary[u.from]) phase1Summary[u.from] = {};
    phase1Summary[u.from][u.to] = (phase1Summary[u.from][u.to] || 0) + 1;
  }

  for (const [from, tos] of Object.entries(phase1Summary)) {
    console.log(`\n${from}:`);
    for (const [to, count] of Object.entries(tos).sort((a, b) => b[1] - a[1])) {
      console.log(`  → ${to}: ${count}`);
    }
  }

  // ==========================================================================
  // PHASE 2: Panneaux dans mauvaises sous-catégories CutX
  // ==========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: CORRECTION DES SOUS-CATÉGORIES');
  console.log('='.repeat(70));

  // Find categories that have subcategory rules
  const categoriesWithRules = Object.keys(CLASSIFICATION_RULES);

  const phase2Updates: Array<{ id: string; categoryId: string; from: string; to: string }> = [];

  for (const parentSlug of categoriesWithRules) {
    // Find all subcategories of this parent
    const subcategorySlugs = Object.values(CLASSIFICATION_RULES[parentSlug]).map((r) => r.targetSlug);
    const parentId = categoryMap.get(parentSlug);

    // Get panels in this parent category or its subcategories
    const panelsInCategory = await prisma.panel.findMany({
      where: {
        isActive: true,
        category: {
          catalogueId: cutx.id,
          OR: [
            { slug: parentSlug },
            { slug: { in: subcategorySlugs } },
            { parent: { slug: parentSlug } },
          ],
        },
      },
      select: {
        id: true,
        name: true,
        category: { select: { slug: true, id: true } },
      },
    });

    for (const panel of panelsInCategory) {
      const currentSlug = panel.category?.slug || '';

      // Find correct subcategory based on name
      const rules = CLASSIFICATION_RULES[parentSlug];
      for (const rule of rules) {
        if (rule.namePattern.test(panel.name || '')) {
          const targetId = categoryMap.get(rule.targetSlug);
          if (targetId && targetId !== panel.category?.id) {
            phase2Updates.push({
              id: panel.id,
              categoryId: targetId,
              from: currentSlug,
              to: rule.targetSlug,
            });
          }
          break;
        }
      }
    }
  }

  // Summary Phase 2
  const phase2Summary: Record<string, Record<string, number>> = {};
  for (const u of phase2Updates) {
    if (!phase2Summary[u.from]) phase2Summary[u.from] = {};
    phase2Summary[u.from][u.to] = (phase2Summary[u.from][u.to] || 0) + 1;
  }

  if (Object.keys(phase2Summary).length > 0) {
    console.log('\nCorrections de sous-catégories:');
    for (const [from, tos] of Object.entries(phase2Summary)) {
      console.log(`\n${from}:`);
      for (const [to, count] of Object.entries(tos).sort((a, b) => b[1] - a[1])) {
        console.log(`  → ${to}: ${count}`);
      }
    }
  } else {
    console.log('\n✅ Aucune correction de sous-catégorie nécessaire');
  }

  // ==========================================================================
  // RÉSUMÉ FINAL
  // ==========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('RÉSUMÉ FINAL');
  console.log('='.repeat(70));

  console.log(`\nPhase 1 (non-CutX → CutX): ${phase1Updates.length} panneaux`);
  console.log(`Phase 2 (sous-catégories): ${phase2Updates.length} panneaux`);
  console.log(`Total: ${phase1Updates.length + phase2Updates.length} panneaux à corriger`);

  // ==========================================================================
  // EXÉCUTION
  // ==========================================================================
  if (executeMode) {
    console.log('\n⏳ Exécution dans 3 secondes...');
    await new Promise((r) => setTimeout(r, 3000));

    // Combine all updates
    const allUpdates = [...phase1Updates, ...phase2Updates];

    // Group by target category
    const byTarget = new Map<string, string[]>();
    for (const u of allUpdates) {
      const ids = byTarget.get(u.categoryId) || [];
      ids.push(u.id);
      byTarget.set(u.categoryId, ids);
    }

    let totalUpdated = 0;
    for (const [categoryId, panelIds] of byTarget) {
      const result = await prisma.panel.updateMany({
        where: { id: { in: panelIds } },
        data: { categoryId },
      });
      totalUpdated += result.count;

      const catName = categoryNameMap.get(categoryId) || categoryId;
      console.log(`✅ ${result.count} panneaux → ${catName}`);
    }

    console.log(`\n🎉 Total mis à jour: ${totalUpdated}`);
  } else {
    console.log('\n💡 Pour exécuter: npx ts-node scripts/fix-all-categories.ts --execute');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
