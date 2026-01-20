/**
 * Vérifier l'assignation des catégories par catalogue
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Get all productTypes with counts
  const types = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('=== PRODUCT TYPES ===\n');
  for (const t of types) {
    console.log('  ' + (t.productType || 'null').padEnd(25) + t._count);
  }

  // Check how many panels from each catalogue are in CutX categories vs own categories
  console.log('\n=== PANELS PAR CATALOGUE → CATALOGUE CATÉGORIE ===\n');

  const stats = await prisma.$queryRaw<
    Array<{ panel_catalogue: string | null; category_catalogue: string | null; count: bigint }>
  >`
    SELECT
      pc.name as panel_catalogue,
      cc.name as category_catalogue,
      COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" pc ON p."catalogueId" = pc.id
    LEFT JOIN "Category" cat ON p."categoryId" = cat.id
    LEFT JOIN "Catalogue" cc ON cat."catalogueId" = cc.id
    WHERE p."isActive" = true
    GROUP BY pc.name, cc.name
    ORDER BY pc.name, count DESC
  `;

  for (const row of stats) {
    console.log(
      '  ' +
        (row.panel_catalogue || '?').padEnd(12) +
        ' → ' +
        (row.category_catalogue || 'NULL').padEnd(10) +
        ': ' +
        row.count
    );
  }

  await prisma.$disconnect();
}

check().catch(console.error);
