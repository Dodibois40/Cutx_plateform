/**
 * Show productType distribution
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('=== DISTRIBUTION DES PRODUCT TYPES ===\n');
  for (const t of types) {
    console.log((t.productType || 'null').padEnd(25) + t._count);
  }

  const total = types.reduce((sum, t) => sum + t._count, 0);
  console.log('-'.repeat(35));
  console.log('TOTAL'.padEnd(25) + total);

  await prisma.$disconnect();
}

main().catch(console.error);
