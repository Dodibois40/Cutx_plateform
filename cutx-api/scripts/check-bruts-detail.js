/**
 * Vérification détaillée des catégories de panneaux bruts
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Chercher TOUTES les catégories MDF, OSB, Aggloméré, Contreplaqués
  const keywords = ['mdf', 'osb', 'agglo', 'contrepla', 'brut'];

  console.log('=== TOUTES LES CATÉGORIES PANNEAUX BRUTS ===\n');

  for (const kw of keywords) {
    const cats = await p.category.findMany({
      where: { slug: { contains: kw } },
      include: {
        _count: { select: { panels: true } },
        parent: { select: { name: true, slug: true } },
        children: {
          select: {
            slug: true,
            name: true,
            _count: { select: { panels: true } }
          }
        }
      }
    });

    console.log('--- Catégories "' + kw + '" ---');
    for (const cat of cats) {
      const parentInfo = cat.parent ? '(parent: ' + cat.parent.slug + ')' : '(RACINE)';
      const childCount = cat.children.length;
      console.log(cat.slug + ' ' + parentInfo);
      console.log('  Panneaux: ' + cat._count.panels + ' | Enfants: ' + childCount);

      if (childCount > 0) {
        for (const child of cat.children) {
          console.log('    - ' + child.slug + ': ' + child._count.panels);
        }
      }
    }
    console.log('');
  }

  // Résumé global
  console.log('=== RÉSUMÉ GLOBAL ===\n');

  const allCats = await p.category.findMany({
    include: {
      _count: { select: { panels: true } },
      parent: { select: { slug: true } },
      children: { select: { slug: true } }
    }
  });

  const withPanels = allCats.filter(c => c._count.panels > 0);
  const parentsWithPanels = withPanels.filter(c => c.children.length > 0);

  console.log('Total catégories: ' + allCats.length);
  console.log('Catégories avec panneaux: ' + withPanels.length);
  console.log('PARENTS avec panneaux (PROBLÈME): ' + parentsWithPanels.length);

  if (parentsWithPanels.length > 0) {
    console.log('\nDétail des parents problématiques:');
    for (const cat of parentsWithPanels) {
      console.log('  ❌ ' + cat.slug + ': ' + cat._count.panels + ' panneaux');
    }
  }

  await p.$disconnect();
}

main().catch(console.error);
