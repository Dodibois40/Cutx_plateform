/**
 * 05-classify-agglomere-auto.ts
 * Classification automatique des panneaux PARTICULE/AGGLOMERE avec rapport détaillé
 *
 * Usage:
 *   npx tsx scripts/reorganization/05-classify-agglomere-auto.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Règles de classification AGGLOMERE (par ordre de priorité)
const AGGLO_RULES = [
  // Hydrofuge
  {
    priority: 1,
    name: 'agglo-hydrofuge',
    keywords: ['hydrofuge', 'ctbh', 'p5', 'moisture', 'water resistant', 'vert'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Ignifuge
  {
    priority: 2,
    name: 'agglo-ignifuge',
    keywords: ['ignifuge', 'm1', 'fire', 'feu'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Rainuré / Dalle
  {
    priority: 3,
    name: 'agglo-rainure',
    keywords: ['rainuré', 'rainure', 'dalle', 'plancher'],
    action: 'CHANGE_CATEGORY' as const
  },
  // Standard (défaut)
  {
    priority: 4,
    name: 'agglo-standard',
    keywords: ['standard', 'brut', 'particule', 'aggloméré', 'agglomere'],
    action: 'CHANGE_CATEGORY' as const
  }
];

interface Change {
  id: string;
  reference: string;
  name: string;
  fromCategory: string;
  toCategory: string;
  reason: string;
  applied: boolean;
}

// Déterminer la catégorie cible pour un panneau
function determineTargetCategory(panel: { name: string | null; category?: { slug: string } | null }): {
  targetCategory: string;
  reason: string;
  action: 'CHANGE_CATEGORY' | 'NONE';
} | null {
  const nameLower = (panel.name || '').toLowerCase();
  const currentCategory = panel.category?.slug || null;

  // Vérifier si déjà dans une catégorie agglo valide
  if (currentCategory?.startsWith('agglo-')) {
    return null; // Déjà dans une catégorie correcte
  }

  for (const rule of AGGLO_RULES) {
    for (const keyword of rule.keywords) {
      if (nameLower.includes(keyword)) {
        return {
          targetCategory: rule.name,
          reason: `contains "${keyword}"`,
          action: 'CHANGE_CATEGORY'
        };
      }
    }
  }

  // Par défaut, classer dans agglo-standard
  return {
    targetCategory: 'agglo-standard',
    reason: 'default classification',
    action: 'CHANGE_CATEGORY'
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     CLASSIFICATION AUTOMATIQUE DES PANNEAUX AGGLOMERE           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Récupérer les catégories Agglo
  const aggloCategories = await prisma.category.findMany({
    where: { slug: { startsWith: 'agglo-' } }
  });
  const categoryMap = new Map(aggloCategories.map(c => [c.slug, c.id]));

  console.log('Catégories disponibles:');
  for (const cat of aggloCategories) {
    console.log(`  ✓ ${cat.slug} (${cat.id})`);
  }
  console.log('');

  // Récupérer les panneaux PARTICULE mal classés
  const panels = await prisma.panel.findMany({
    where: {
      productType: 'PARTICULE',
      NOT: {
        category: { slug: { startsWith: 'agglo-' } }
      }
    },
    include: { category: { select: { slug: true, name: true } } },
    orderBy: { reference: 'asc' }
  });

  console.log(`Panneaux PARTICULE mal classés: ${panels.length}\n`);

  const changes: Change[] = [];
  let skippedCount = 0;

  // Analyser chaque panneau
  console.log('═══ ANALYSE ═══\n');

  for (const panel of panels) {
    const result = determineTargetCategory(panel);

    if (result === null) {
      skippedCount++;
    } else {
      changes.push({
        id: panel.id,
        reference: panel.reference,
        name: panel.name || '',
        fromCategory: panel.category?.slug || 'AUCUNE',
        toCategory: result.targetCategory,
        reason: result.reason,
        applied: false
      });
      console.log(`  → ${panel.reference}: ${panel.category?.slug || 'AUCUNE'} → ${result.targetCategory} (${result.reason})`);
      console.log(`      "${(panel.name || '').substring(0, 60)}"`);
    }
  }

  console.log(`\n═══ RÉSUMÉ AVANT APPLICATION ═══`);
  console.log(`  → Panneaux à reclasser: ${changes.length}`);
  console.log(`  ⏭️ Panneaux ignorés: ${skippedCount}`);

  // Grouper les changements par type
  const changesByTarget: Record<string, Change[]> = {};
  for (const change of changes) {
    if (!changesByTarget[change.toCategory]) {
      changesByTarget[change.toCategory] = [];
    }
    changesByTarget[change.toCategory].push(change);
  }

  console.log('\nChangements par catégorie cible:');
  for (const [target, list] of Object.entries(changesByTarget)) {
    console.log(`  ${target}: ${list.length} panneaux`);
  }

  if (changes.length === 0) {
    console.log('\n✅ Aucun changement nécessaire!');
    await prisma.$disconnect();
    return;
  }

  // Appliquer les changements
  console.log('\n═══ APPLICATION DES CHANGEMENTS ═══\n');

  let applied = 0;
  let errors = 0;

  for (const change of changes) {
    const targetCategoryId = categoryMap.get(change.toCategory);
    if (!targetCategoryId) {
      console.log(`  ❌ ${change.reference}: Catégorie ${change.toCategory} non trouvée!`);
      errors++;
      continue;
    }

    try {
      await prisma.panel.update({
        where: { id: change.id },
        data: { categoryId: targetCategoryId }
      });
      change.applied = true;
      applied++;
      console.log(`  ✅ ${change.reference}: ${change.fromCategory} → ${change.toCategory}`);
    } catch (err) {
      console.log(`  ❌ ${change.reference}: Erreur - ${err}`);
      errors++;
    }
  }

  // Résumé final
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ FINAL                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n  Total panneaux analysés: ${panels.length}`);
  console.log(`  Changements appliqués: ${applied}`);
  console.log(`  Erreurs: ${errors}`);

  // Vérification finale
  console.log('\n═══ VÉRIFICATION ═══');
  const verification = await prisma.panel.groupBy({
    by: ['categoryId'],
    where: { productType: 'PARTICULE' },
    _count: true
  });

  const catNames = await prisma.category.findMany({
    where: { id: { in: verification.map(v => v.categoryId).filter(Boolean) as string[] } },
    select: { id: true, slug: true }
  });
  const catNameMap = new Map(catNames.map(c => [c.id, c.slug]));

  console.log('\nDistribution finale des PARTICULE:');
  for (const v of verification) {
    const catSlug = v.categoryId ? catNameMap.get(v.categoryId) || 'UNKNOWN' : 'AUCUNE';
    console.log(`  ${catSlug.padEnd(25)} ${v._count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
