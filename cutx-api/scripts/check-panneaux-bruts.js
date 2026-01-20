/**
 * Vérification des panneaux bruts
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Chercher toutes les catégories qui contiennent 'brut'
  const cats = await p.category.findMany({
    where: {
      OR: [
        { slug: { contains: 'brut' } },
        { name: { contains: 'Brut', mode: 'insensitive' } }
      ]
    },
    include: {
      _count: { select: { panels: true } },
      children: { select: { slug: true, name: true, _count: { select: { panels: true } } } },
      parent: { select: { slug: true, name: true } }
    }
  });

  console.log('=== CATÉGORIES "BRUT" ===\n');
  for (const cat of cats) {
    console.log(cat.name + ' (' + cat.slug + ')');
    console.log('  Parent: ' + (cat.parent?.name || 'RACINE'));
    console.log('  Panneaux directs: ' + cat._count.panels);
    if (cat.children.length > 0) {
      console.log('  Enfants:');
      for (const child of cat.children) {
        console.log('    - ' + child.slug + ': ' + child._count.panels);
      }
    }
    console.log('');
  }

  // Montrer la structure complète de l'arborescence
  console.log('=== STRUCTURE COMPLETE ===\n');

  const allCats = await p.category.findMany({
    where: { parentId: null },
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

  for (const root of allCats) {
    const rootPanels = root._count.panels;
    if (rootPanels > 0) {
      console.log('❌ ' + root.name + ' (' + root.slug + '): ' + rootPanels + ' panneaux DANS RACINE');
    } else if (root.children.length > 0) {
      console.log('📁 ' + root.name + ' (' + root.slug + ')');
    }

    for (const child of root.children) {
      const childPanels = child._count.panels;
      const hasGrandchildren = child.children.length > 0;

      if (hasGrandchildren && childPanels > 0) {
        console.log('  ❌ ' + child.name + ' (' + child.slug + '): ' + childPanels + ' DANS PARENT');
        for (const gc of child.children) {
          console.log('      ✓ ' + gc.slug + ': ' + gc._count.panels);
        }
      } else if (hasGrandchildren) {
        console.log('  📁 ' + child.name + ' (' + child.slug + ')');
        for (const gc of child.children) {
          const gcPanels = gc._count.panels;
          if (gcPanels > 0) {
            console.log('      ✓ ' + gc.slug + ': ' + gcPanels);
          }
        }
      } else if (childPanels > 0) {
        console.log('  ✓ ' + child.slug + ': ' + childPanels);
      }
    }
  }

  await p.$disconnect();
}

main().catch(console.error);
