/**
 * DIAGNOSTIC: Vérifie que les panneaux sont bien dans les sous-catégories
 * et pas dans les catégories parentes
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Get all categories that have children (parent categories)
  const parents = await p.category.findMany({
    where: {
      children: { some: {} }
    },
    include: {
      _count: { select: { panels: true } },
      children: {
        include: {
          _count: { select: { panels: true } },
          children: {
            include: {
              _count: { select: { panels: true } }
            }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== DIAGNOSTIC ARBORESCENCE ===\n');
  console.log('Catégories parentes avec panneaux DIRECTEMENT assignés (PROBLÈME) :\n');

  let totalProblems = 0;
  const problemCategories = [];

  for (const parent of parents) {
    if (parent._count.panels > 0) {
      totalProblems += parent._count.panels;
      problemCategories.push({
        name: parent.name,
        slug: parent.slug,
        count: parent._count.panels,
        children: parent.children
      });

      console.log('❌ ' + parent.name + ' (' + parent.slug + ')');
      console.log('   → ' + parent._count.panels + ' panneaux DANS le parent au lieu des sous-catégories');

      // Show children counts
      const childrenWithPanels = parent.children.filter(c => c._count.panels > 0);
      if (childrenWithPanels.length > 0) {
        console.log('   Sous-catégories disponibles:');
        for (const child of parent.children) {
          const mark = child._count.panels > 0 ? '✓' : '○';
          console.log('     ' + mark + ' ' + child.slug + ': ' + child._count.panels + ' panneaux');
        }
      } else {
        console.log('   Sous-catégories disponibles:');
        for (const child of parent.children) {
          console.log('     ○ ' + child.slug + ': ' + child._count.panels + ' panneaux');
        }
      }
      console.log('');
    }
  }

  if (totalProblems === 0) {
    console.log('✅ Aucun problème - tous les panneaux sont dans des sous-catégories\n');
  } else {
    console.log('\n=== TOTAL: ' + totalProblems + ' panneaux mal assignés ===\n');
  }

  // Also show leaf categories (no children) with panels - this is CORRECT
  console.log('=== CATÉGORIES FEUILLES (CORRECT) ===\n');

  const leaves = await p.category.findMany({
    where: {
      children: { none: {} },
      panels: { some: {} }
    },
    include: {
      _count: { select: { panels: true } },
      parent: { select: { name: true, slug: true } }
    },
    orderBy: [
      { parent: { name: 'asc' } },
      { name: 'asc' }
    ]
  });

  let currentParent = '';
  let leafTotal = 0;
  for (const leaf of leaves) {
    const parentName = leaf.parent?.name || '(racine)';
    if (parentName !== currentParent) {
      if (currentParent) console.log('');
      console.log('📁 ' + parentName);
      currentParent = parentName;
    }
    console.log('   ✓ ' + leaf.slug + ': ' + leaf._count.panels);
    leafTotal += leaf._count.panels;
  }

  console.log('\n=== RÉSUMÉ ===');
  console.log('Panneaux correctement assignés (feuilles): ' + leafTotal);
  console.log('Panneaux mal assignés (parents): ' + totalProblems);
  console.log('Total: ' + (leafTotal + totalProblems));

  await p.$disconnect();
}

main().catch(console.error);
