const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Distribution par decorCategory
  const byDecor = await p.panel.groupBy({
    by: ['decorCategory'],
    where: { productType: 'MELAMINE', categoryId: null },
    _count: true,
    orderBy: { _count: { decorCategory: 'desc' } }
  });

  console.log('=== MELAMINE PAR DECOR CATEGORY ===\n');
  for (const d of byDecor) {
    console.log((d.decorCategory || 'NULL').padEnd(15) + ': ' + d._count);
  }

  // Catégories disponibles pour mélaminés
  console.log('\n=== CATÉGORIES DÉCORS DISPONIBLES ===');
  const cats = await p.category.findMany({
    where: {
      OR: [
        { slug: 'panneaux-decors' },
        { parent: { slug: 'panneaux-decors' } }
      ]
    },
    include: { parent: { select: { slug: true } } }
  });

  for (const c of cats) {
    console.log(c.slug + (c.parent ? ' (sous ' + c.parent.slug + ')' : ''));
  }

  // Exemples par decorCategory
  console.log('\n=== EXEMPLES PAR DECOR ===');

  for (const decor of ['BOIS', 'UNIS', 'FANTAISIE', 'PIERRE', null]) {
    const examples = await p.panel.findMany({
      where: {
        productType: 'MELAMINE',
        categoryId: null,
        decorCategory: decor
      },
      select: { reference: true, name: true },
      take: 3
    });

    console.log('\n' + (decor || 'NULL') + ':');
    for (const e of examples) {
      console.log('  ' + e.reference + ': ' + e.name.substring(0, 50));
    }
  }

  await p.$disconnect();
}
main();
