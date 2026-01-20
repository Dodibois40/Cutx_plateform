/**
 * 02-classify-mdf-auto.ts
 * Classification automatique des panneaux MDF avec rapport détaillé
 *
 * Usage:
 *   npx tsx scripts/reorganization/02-classify-mdf-auto.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Règles de classification MDF (par ordre de priorité)
const MDF_RULES = [
  {
    priority: 1,
    name: 'SHOULD_BE_MELAMINE',
    targetType: 'MELAMINE',
    keywords: ['mélamine', 'melamine'],
    action: 'CHANGE_TYPE' as const
  },
  {
    priority: 2,
    name: 'mdf-hydrofuge',
    keywords: ['hydrofuge', 'hydro', 'ctbh', 'p5', 'moisture'],
    action: 'CHANGE_CATEGORY' as const
  },
  {
    priority: 3,
    name: 'mdf-ignifuge',
    keywords: ['ignifuge', 'm1', 'b-s', 'fire', 'feu'],
    action: 'CHANGE_CATEGORY' as const
  },
  {
    priority: 4,
    name: 'mdf-a-laquer',
    keywords: ['lac', 'laquer', 'lacquer', 'e-z', 'ez', 'fibralac', 'fibraplast', 'bouche pores', 'bouche-pores', 'bouchepores'],
    action: 'CHANGE_CATEGORY' as const
  },
  {
    priority: 5,
    name: 'mdf-teinte-couleurs',
    keywords: ['teinté', 'teinte', 'colour', 'color', 'fibracolour', 'valchromat', 'couleur', 'colored', 'coloured'],
    action: 'CHANGE_CATEGORY' as const
  },
  {
    priority: 6,
    name: 'mdf-cintrable',
    keywords: ['cintrable', 'flexible', 'flex', 'bendable'],
    action: 'CHANGE_CATEGORY' as const
  },
  {
    priority: 7,
    name: 'mdf-leger',
    keywords: ['léger', 'leger', 'light', 'ultralight', 'allégé'],
    action: 'CHANGE_CATEGORY' as const
  },
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
  targetType?: string;
  reason: string;
  action: 'CHANGE_CATEGORY' | 'CHANGE_TYPE' | 'NONE';
} | null {
  const nameLower = (panel.name || '').toLowerCase();
  const currentCategory = panel.category?.slug || null;

  for (const rule of MDF_RULES) {
    for (const keyword of rule.keywords) {
      if (nameLower.includes(keyword)) {
        if (rule.action === 'CHANGE_CATEGORY' && currentCategory === rule.name) {
          return null; // Déjà correct
        }
        if (rule.action === 'CHANGE_TYPE') {
          return {
            targetCategory: 'unis-blanc',
            targetType: rule.targetType,
            reason: `contains "${keyword}"`,
            action: 'CHANGE_TYPE'
          };
        }
        return {
          targetCategory: rule.name,
          reason: `contains "${keyword}"`,
          action: 'CHANGE_CATEGORY'
        };
      }
    }
  }

  return null; // Pas de changement nécessaire
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         CLASSIFICATION AUTOMATIQUE DES PANNEAUX MDF             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Récupérer les catégories MDF
  const mdfCategories = await prisma.category.findMany({
    where: { slug: { startsWith: 'mdf-' } }
  });
  const categoryMap = new Map(mdfCategories.map(c => [c.slug, c.id]));

  // Vérifier que toutes les catégories existent
  console.log('Catégories disponibles:');
  for (const cat of mdfCategories) {
    console.log(`  ✓ ${cat.slug} (${cat.id})`);
  }
  console.log('');

  // Récupérer tous les panneaux MDF
  const panels = await prisma.panel.findMany({
    where: { productType: 'MDF' },
    include: { category: { select: { slug: true, name: true } } },
    orderBy: { reference: 'asc' }
  });

  console.log(`Total panneaux MDF: ${panels.length}\n`);

  const changes: Change[] = [];
  const typeChanges: { reference: string; name: string; suggestedType: string }[] = [];
  let correctCount = 0;

  // Analyser chaque panneau
  console.log('═══ ANALYSE ═══\n');

  for (const panel of panels) {
    const result = determineTargetCategory(panel);

    if (result === null) {
      correctCount++;
    } else if (result.action === 'CHANGE_TYPE') {
      // Panneau qui devrait changer de type (MDF → MELAMINE)
      typeChanges.push({
        reference: panel.reference,
        name: panel.name || '',
        suggestedType: result.targetType || 'MELAMINE'
      });
      console.log(`  ⚠️ ${panel.reference}: Devrait être ${result.targetType} (${result.reason})`);
    } else {
      // Changement de catégorie
      changes.push({
        id: panel.id,
        reference: panel.reference,
        name: panel.name || '',
        fromCategory: panel.category?.slug || 'AUCUNE',
        toCategory: result.targetCategory,
        reason: result.reason,
        applied: false
      });
    }
  }

  console.log(`\n═══ RÉSUMÉ AVANT APPLICATION ═══`);
  console.log(`  ✓ Panneaux déjà corrects: ${correctCount}`);
  console.log(`  → Changements de catégorie: ${changes.length}`);
  console.log(`  ⚠️ Changements de type suggérés: ${typeChanges.length}`);

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
  console.log(`  Déjà corrects: ${correctCount}`);
  console.log(`  Changements appliqués: ${applied}`);
  console.log(`  Erreurs: ${errors}`);

  if (typeChanges.length > 0) {
    console.log(`\n⚠️ ATTENTION: ${typeChanges.length} panneau(x) devraient changer de productType:`);
    for (const tc of typeChanges) {
      console.log(`    ${tc.reference}: MDF → ${tc.suggestedType}`);
      console.log(`      "${tc.name.substring(0, 60)}..."`);
    }
    console.log('\n  Ces panneaux doivent être traités manuellement ou via un script dédié.');
  }

  // Vérification finale
  console.log('\n═══ VÉRIFICATION ═══');
  const verification = await prisma.panel.groupBy({
    by: ['categoryId'],
    where: { productType: 'MDF' },
    _count: true
  });

  const catNames = await prisma.category.findMany({
    where: { id: { in: verification.map(v => v.categoryId).filter(Boolean) as string[] } },
    select: { id: true, slug: true }
  });
  const catNameMap = new Map(catNames.map(c => [c.id, c.slug]));

  console.log('\nDistribution finale des MDF:');
  for (const v of verification) {
    const catSlug = v.categoryId ? catNameMap.get(v.categoryId) || 'UNKNOWN' : 'AUCUNE';
    console.log(`  ${catSlug.padEnd(25)} ${v._count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
