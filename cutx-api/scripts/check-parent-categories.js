const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Trouver les catégories parentes qui ont des panneaux ET des sous-catégories
  const parentCats = await p.category.findMany({
    where: {
      children: { some: {} },  // A des enfants
      panels: { some: {} }     // A des panneaux directement
    },
    include: {
      _count: { select: { panels: true, children: true } },
      children: {
        include: { _count: { select: { panels: true } } }
      }
    }
  });

  console.log('=== CATÉGORIES PARENTES AVEC PANNEAUX DIRECTS ===\n');
  console.log('(Ces panneaux devraient être dans les sous-catégories)\n');

  for (const cat of parentCats) {
    const childTotal = cat.children.reduce((sum, c) => sum + c._count.panels, 0);

    console.log(cat.slug + ':');
    console.log('  Panneaux directs: ' + cat._count.panels);
    console.log('  Sous-catégories: ' + cat._count.children);
    console.log('  Panneaux dans enfants: ' + childTotal);

    if (cat._count.panels > 50) {
      console.log('  ⚠️  À REDISTRIBUER');
    }
    console.log('');
  }

  await p.$disconnect();
}
main();
