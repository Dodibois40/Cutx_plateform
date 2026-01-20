const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Par productType
  const byType = await p.panel.groupBy({
    by: ['productType'],
    where: { categoryId: null },
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });

  console.log('=== PANNEAUX SANS CATÉGORIE PAR TYPE ===\n');
  let total = 0;
  for (const t of byType) {
    console.log((t.productType || 'NULL').padEnd(25) + ': ' + t._count);
    total += t._count;
  }
  console.log('-'.repeat(40));
  console.log('TOTAL'.padEnd(25) + ': ' + total);

  await p.$disconnect();
}
main();
