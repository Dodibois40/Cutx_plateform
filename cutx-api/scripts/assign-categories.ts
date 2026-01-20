/**
 * Script d'assignation automatique des panneaux aux catégories
 *
 * Usage:
 *   npx ts-node scripts/assign-categories.ts --dry-run    # Simulation
 *   npx ts-node scripts/assign-categories.ts              # Exécution réelle
 *   npx ts-node scripts/assign-categories.ts --stats      # Statistiques seulement
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// MAPPINGS PRODUCTTYPE → CATEGORY SLUG
// =============================================================================

/**
 * Mapping principal: productType → slug de catégorie
 * Ces slugs doivent correspondre exactement aux slugs dans la table Category
 */
const PRODUCT_TYPE_TO_CATEGORY: Record<string, string> = {
  // Panneaux Décors (mélaminés)
  MELAMINE: 'panneaux-decors',

  // Panneaux Bruts
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  AGGLO_BRUT: 'agglomere',
  OSB: 'osb',
  CONTREPLAQUE: 'contreplaques',
  LATTE: 'latte',
  PANNEAU_CONSTRUCTION: 'agglomere',

  // Panneaux Bois Massif
  MASSIF: 'panneaux-bois-massif',
  PANNEAU_MASSIF: 'lamelle-colle',
  PANNEAU_3_PLIS: '3-plis',

  // Panneaux Plaqués Bois
  PLACAGE: 'panneaux-plaques-bois',
  PANNEAU_DECO: 'panneaux-plaques-bois',

  // Panneaux Muraux
  PANNEAU_MURAL: 'panneaux-muraux',

  // Panneaux Spéciaux
  COMPACT: 'compacts-hpl',
  PANNEAU_DECORATIF: 'decoratifs',
  PANNEAU_SPECIAL: 'alveolaires',
  PANNEAU_ALVEOLAIRE: 'alveolaires',
  CIMENT_BOIS: 'ciment-bois',
  PANNEAU_ISOLANT: 'isolants',

  // Plans de Travail
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  SOLID_SURFACE: 'pdt-solid-surface',

  // Feuilles & Placages
  STRATIFIE: 'feuilles-stratifiees',

  // Chants
  CHANT: 'chants',
  BANDE_DE_CHANT: 'chants',
};

// =============================================================================
// MAPPINGS D'AFFINAGE (sous-catégories)
// =============================================================================

/**
 * Affinage des mélaminés par decorCategory
 */
const MELAMINE_DECOR_TO_CATEGORY: Record<string, string> = {
  BOIS: 'decors-bois',
  UNIS: 'decors-unis',
  PIERRE: 'decors-pierres-marbres',
  BETON: 'decors-pierres-marbres',
  METAL: 'decors-metal-textile',
  TEXTILE: 'decors-metal-textile',
  FANTAISIE: 'decors-fantaisie',
  SANS_DECOR: 'panneaux-decors', // Fallback
};

/**
 * Affinage des stratifiés par finish/description
 */
const STRATIFIE_FINISH_TO_CATEGORY: Record<string, string> = {
  uni: 'strat-unis',
  unis: 'strat-unis',
  bois: 'strat-bois',
  fantaisie: 'strat-fantaisie',
  pierre: 'strat-pierre-metal',
  metal: 'strat-pierre-metal',
  marbre: 'strat-pierre-metal',
  beton: 'strat-pierre-metal',
};

/**
 * Affinage des chants par panelSubType
 */
const CHANT_SUBTYPE_TO_CATEGORY: Record<string, string> = {
  CHANT_ABS: 'chants-abs',
  CHANT_PVC: 'chants-pvc',
  CHANT_MELAMINE: 'chants-melamines',
  CHANT_BOIS: 'chants-plaques-bois',
};

/**
 * Affinage des placages par essence (dans material ou name)
 */
const ESSENCE_TO_PLAQUE_CATEGORY: Record<string, string> = {
  chene: 'plaque-chene',
  chêne: 'plaque-chene',
  noyer: 'plaque-noyer',
  hetre: 'plaque-hetre',
  hêtre: 'plaque-hetre',
  frene: 'plaque-frene',
  frêne: 'plaque-frene',
  erable: 'plaque-erable',
  érable: 'plaque-erable',
  merisier: 'plaque-merisier',
  sapelli: 'plaque-exotiques',
  acajou: 'plaque-exotiques',
  wenge: 'plaque-exotiques',
  teck: 'plaque-exotiques',
  zebrano: 'plaque-exotiques',
  palissandre: 'plaque-exotiques',
  bambou: 'plaque-exotiques',
};

/**
 * Plans de travail par type
 */
const PDT_TYPE_TO_CATEGORY: Record<string, string> = {
  stratifie: 'pdt-stratifies',
  stratifié: 'pdt-stratifies',
  compact: 'pdt-compacts',
  massif: 'pdt-bois-massif',
  bois: 'pdt-bois-massif',
  solid: 'pdt-solid-surface',
  corian: 'pdt-solid-surface',
  krion: 'pdt-solid-surface',
};

// =============================================================================
// LOGIQUE D'ASSIGNATION
// =============================================================================

interface CategoryCache {
  [slug: string]: string; // slug → id
}

interface AssignmentResult {
  panelId: string;
  panelName: string;
  productType: string;
  oldCategoryId: string | null;
  newCategorySlug: string;
  newCategoryId: string;
  reason: string;
}

/**
 * Charge toutes les catégories en cache
 */
async function loadCategoryCache(): Promise<CategoryCache> {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });

  const cache: CategoryCache = {};
  for (const cat of categories) {
    cache[cat.slug] = cat.id;
  }

  console.log(`📚 ${Object.keys(cache).length} catégories chargées`);
  return cache;
}

/**
 * Détermine la meilleure catégorie pour un panneau
 */
function determineCategorySlug(panel: {
  productType: string | null;
  panelSubType: string | null;
  decorCategory: string | null;
  material: string | null;
  finish: string | null;
  name: string;
  description: string | null;
}): { slug: string; reason: string } | null {
  const productType = panel.productType;

  if (!productType) {
    return null;
  }

  // 1. Affinage des mélaminés par decorCategory
  if (productType === 'MELAMINE' && panel.decorCategory) {
    const slug = MELAMINE_DECOR_TO_CATEGORY[panel.decorCategory];
    if (slug) {
      return { slug, reason: `MELAMINE + decorCategory=${panel.decorCategory}` };
    }
  }

  // 2. Affinage des stratifiés par finish/name
  if (productType === 'STRATIFIE') {
    const textToSearch = `${panel.finish || ''} ${panel.name || ''} ${panel.description || ''}`.toLowerCase();
    for (const [keyword, slug] of Object.entries(STRATIFIE_FINISH_TO_CATEGORY)) {
      if (textToSearch.includes(keyword)) {
        return { slug, reason: `STRATIFIE + keyword="${keyword}"` };
      }
    }
    // Fallback stratifié
    return { slug: 'feuilles-stratifiees', reason: 'STRATIFIE (default)' };
  }

  // 3. Affinage des chants par panelSubType
  if (productType === 'CHANT' || productType === 'BANDE_DE_CHANT') {
    if (panel.panelSubType && CHANT_SUBTYPE_TO_CATEGORY[panel.panelSubType]) {
      return {
        slug: CHANT_SUBTYPE_TO_CATEGORY[panel.panelSubType],
        reason: `CHANT + subType=${panel.panelSubType}`
      };
    }
    // Fallback chants
    return { slug: 'chants', reason: 'CHANT (default)' };
  }

  // 4. Affinage des placages par essence
  if (productType === 'PLACAGE' || productType === 'PANNEAU_DECO') {
    const textToSearch = `${panel.material || ''} ${panel.name || ''}`.toLowerCase();
    for (const [essence, slug] of Object.entries(ESSENCE_TO_PLAQUE_CATEGORY)) {
      if (textToSearch.includes(essence)) {
        return { slug, reason: `PLACAGE + essence="${essence}"` };
      }
    }
    // Fallback placages
    return { slug: 'panneaux-plaques-bois', reason: 'PLACAGE (default)' };
  }

  // 5. Affinage des plans de travail
  if (productType === 'PLAN_DE_TRAVAIL') {
    const textToSearch = `${panel.material || ''} ${panel.name || ''}`.toLowerCase();
    for (const [keyword, slug] of Object.entries(PDT_TYPE_TO_CATEGORY)) {
      if (textToSearch.includes(keyword)) {
        return { slug, reason: `PDT + keyword="${keyword}"` };
      }
    }
    // Fallback PDT
    return { slug: 'plans-de-travail', reason: 'PDT (default)' };
  }

  // 6. Mapping direct par productType
  const directSlug = PRODUCT_TYPE_TO_CATEGORY[productType];
  if (directSlug) {
    return { slug: directSlug, reason: `productType=${productType}` };
  }

  return null;
}

/**
 * Affiche les statistiques actuelles
 */
async function showStats() {
  console.log('\n📊 STATISTIQUES ACTUELLES\n');

  // Total panneaux
  const totalPanels = await prisma.panel.count();
  console.log(`Total panneaux: ${totalPanels}`);

  // Avec/sans catégorie
  const withCategory = await prisma.panel.count({ where: { categoryId: { not: null } } });
  const withoutCategory = await prisma.panel.count({ where: { categoryId: null } });
  console.log(`Avec catégorie: ${withCategory} (${((withCategory / totalPanels) * 100).toFixed(1)}%)`);
  console.log(`Sans catégorie: ${withoutCategory} (${((withoutCategory / totalPanels) * 100).toFixed(1)}%)`);

  // Distribution par productType
  console.log('\n📦 Distribution par productType:');
  const byProductType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true,
    orderBy: { _count: { productType: 'desc' } },
  });

  for (const item of byProductType) {
    const pct = ((item._count / totalPanels) * 100).toFixed(1);
    const mapping = PRODUCT_TYPE_TO_CATEGORY[item.productType || ''] || '❌ NON MAPPÉ';
    console.log(`  ${item.productType || 'NULL'}: ${item._count} (${pct}%) → ${mapping}`);
  }

  // Distribution par catégorie actuelle
  console.log('\n📁 Distribution par catégorie:');
  const byCategory = await prisma.panel.groupBy({
    by: ['categoryId'],
    _count: true,
    orderBy: { _count: { categoryId: 'desc' } },
  });

  const categoryIds = byCategory.map(c => c.categoryId).filter(Boolean) as string[];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, slug: true },
  });
  const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

  for (const item of byCategory.slice(0, 15)) {
    const cat = item.categoryId ? categoryMap[item.categoryId] : null;
    const name = cat ? `${cat.name} (${cat.slug})` : 'AUCUNE';
    console.log(`  ${name}: ${item._count}`);
  }
}

/**
 * Exécute l'assignation (dry-run ou réelle)
 */
async function assignCategories(dryRun: boolean) {
  console.log(`\n🚀 ${dryRun ? 'SIMULATION' : 'EXÉCUTION RÉELLE'} DE L'ASSIGNATION\n`);

  // Charger le cache des catégories
  const categoryCache = await loadCategoryCache();

  // Récupérer les panneaux sans catégorie
  const panels = await prisma.panel.findMany({
    where: { categoryId: null },
    select: {
      id: true,
      name: true,
      productType: true,
      panelSubType: true,
      decorCategory: true,
      material: true,
      finish: true,
      description: true,
    },
  });

  console.log(`📋 ${panels.length} panneaux sans catégorie à traiter\n`);

  const results: AssignmentResult[] = [];
  const errors: { panelId: string; name: string; reason: string }[] = [];
  const stats: Record<string, number> = {};

  for (const panel of panels) {
    const determination = determineCategorySlug({
      productType: panel.productType,
      panelSubType: panel.panelSubType,
      decorCategory: panel.decorCategory,
      material: panel.material,
      finish: panel.finish,
      name: panel.name,
      description: panel.description,
    });

    if (!determination) {
      errors.push({
        panelId: panel.id,
        name: panel.name,
        reason: `productType inconnu: ${panel.productType}`,
      });
      continue;
    }

    const categoryId = categoryCache[determination.slug];
    if (!categoryId) {
      errors.push({
        panelId: panel.id,
        name: panel.name,
        reason: `Catégorie slug "${determination.slug}" non trouvée`,
      });
      continue;
    }

    results.push({
      panelId: panel.id,
      panelName: panel.name,
      productType: panel.productType || 'NULL',
      oldCategoryId: null,
      newCategorySlug: determination.slug,
      newCategoryId: categoryId,
      reason: determination.reason,
    });

    // Stats
    stats[determination.slug] = (stats[determination.slug] || 0) + 1;
  }

  // Afficher les stats d'assignation
  console.log('📊 Résumé des assignations:');
  const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  for (const [slug, count] of sortedStats) {
    console.log(`  ${slug}: ${count} panneaux`);
  }

  console.log(`\n✅ ${results.length} panneaux à assigner`);
  console.log(`❌ ${errors.length} panneaux en erreur`);

  // Afficher quelques erreurs
  if (errors.length > 0) {
    console.log('\n⚠️ Exemples d\'erreurs:');
    for (const err of errors.slice(0, 10)) {
      console.log(`  - ${err.name}: ${err.reason}`);
    }
    if (errors.length > 10) {
      console.log(`  ... et ${errors.length - 10} autres`);
    }
  }

  // Exécuter si pas dry-run
  if (!dryRun && results.length > 0) {
    console.log('\n⏳ Exécution des mises à jour...');

    // Grouper par categoryId pour des updates batch
    const byCategory: Record<string, string[]> = {};
    for (const result of results) {
      if (!byCategory[result.newCategoryId]) {
        byCategory[result.newCategoryId] = [];
      }
      byCategory[result.newCategoryId].push(result.panelId);
    }

    let updated = 0;
    for (const [categoryId, panelIds] of Object.entries(byCategory)) {
      await prisma.panel.updateMany({
        where: { id: { in: panelIds } },
        data: { categoryId },
      });
      updated += panelIds.length;
      process.stdout.write(`\r  ${updated}/${results.length} panneaux mis à jour...`);
    }

    console.log(`\n\n✅ ${updated} panneaux assignés avec succès!`);
  }

  return { results, errors, stats };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const statsOnly = args.includes('--stats');

  try {
    if (statsOnly) {
      await showStats();
    } else {
      await showStats();
      await assignCategories(dryRun);

      if (dryRun) {
        console.log('\n💡 Pour exécuter réellement: npx ts-node scripts/assign-categories.ts');
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
