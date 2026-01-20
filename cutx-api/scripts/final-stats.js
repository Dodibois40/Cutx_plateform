const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Total panneaux
  const total = await p.panel.count();
  const assigned = await p.panel.count({ where: { categoryId: { not: null } } });
  const unassigned = await p.panel.count({ where: { categoryId: null } });

  console.log('=== RÉSUMÉ FINAL ===\n');
  console.log('Total panneaux      : ' + total);
  console.log('Avec catégorie      : ' + assigned + ' (' + (assigned/total*100).toFixed(1) + '%)');
  console.log('Sans catégorie      : ' + unassigned + ' (' + (unassigned/total*100).toFixed(1) + '%)');

  // Top catégories
  console.log('\n=== TOP CATÉGORIES ===');
  const topCats = await p.category.findMany({
    include: { _count: { select: { panels: true } } },
    orderBy: { panels: { _count: 'desc' } },
    take: 20
  });

  for (const c of topCats) {
    if (c._count.panels > 0) {
      console.log(c.slug.padEnd(25) + ': ' + c._count.panels);
    }
  }

  await p.$disconnect();
}
main();
