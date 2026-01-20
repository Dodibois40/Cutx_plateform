/**
 * Check if missing prices correlate with stock status
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('='.repeat(60));
  console.log('CORRÉLATION PRIX / STOCK');
  console.log('='.repeat(60));

  // Get Bouney catalogue
  const bouney = await prisma.catalogue.findFirst({ where: { slug: 'bouney' } });
  if (!bouney) {
    console.log('Catalogue Bouney non trouvé');
    return;
  }

  // Check stockStatus values for panels without price
  console.log('\n📦 Panneaux SANS prix - par stockStatus:\n');

  const noPriceByStock = await prisma.$queryRaw<Array<{ stockStatus: string | null; count: bigint }>>`
    SELECT "stockStatus", COUNT(*) as count
    FROM "Panel"
    WHERE "catalogueId" = ${bouney.id}
      AND "isActive" = true
      AND "pricePerM2" IS NULL
      AND "pricePerPanel" IS NULL
      AND "pricePerMl" IS NULL
      AND "pricePerUnit" IS NULL
    GROUP BY "stockStatus"
    ORDER BY count DESC
  `;

  for (const row of noPriceByStock) {
    console.log(`  ${(row.stockStatus || 'NULL').padEnd(30)} ${row.count}`);
  }

  // Check stockStatus values for panels WITH price
  console.log('\n💰 Panneaux AVEC prix - par stockStatus:\n');

  const withPriceByStock = await prisma.$queryRaw<Array<{ stockStatus: string | null; count: bigint }>>`
    SELECT "stockStatus", COUNT(*) as count
    FROM "Panel"
    WHERE "catalogueId" = ${bouney.id}
      AND "isActive" = true
      AND ("pricePerM2" IS NOT NULL OR "pricePerPanel" IS NOT NULL OR "pricePerMl" IS NOT NULL OR "pricePerUnit" IS NOT NULL)
    GROUP BY "stockStatus"
    ORDER BY count DESC
  `;

  for (const row of withPriceByStock) {
    console.log(`  ${(row.stockStatus || 'NULL').padEnd(30)} ${row.count}`);
  }

  // Show examples of panels without price
  console.log('\n📋 Exemples de panneaux SANS prix:\n');

  const examples = await prisma.panel.findMany({
    where: {
      catalogueId: bouney.id,
      isActive: true,
      pricePerM2: null,
      pricePerPanel: null,
    },
    select: {
      name: true,
      productType: true,
      stockStatus: true,
      stockLocations: true,
    },
    take: 15,
  });

  for (const p of examples) {
    console.log(`  ${p.productType?.padEnd(18) || 'null'.padEnd(18)} stock="${p.stockStatus || '-'}" loc="${p.stockLocations || '-'}"`);
    console.log(`    ${p.name?.substring(0, 50)}`);
  }

  // Show examples of panels WITH price
  console.log('\n📋 Exemples de panneaux AVEC prix:\n');

  const examplesWithPrice = await prisma.panel.findMany({
    where: {
      catalogueId: bouney.id,
      isActive: true,
      OR: [
        { pricePerM2: { not: null } },
        { pricePerPanel: { not: null } },
      ],
    },
    select: {
      name: true,
      productType: true,
      stockStatus: true,
      stockLocations: true,
      pricePerM2: true,
      pricePerPanel: true,
    },
    take: 15,
  });

  for (const p of examplesWithPrice) {
    const price = p.pricePerM2 || p.pricePerPanel || 0;
    console.log(`  ${p.productType?.padEnd(18) || 'null'.padEnd(18)} stock="${p.stockStatus || '-'}" prix=${price.toFixed(2)}€`);
    console.log(`    ${p.name?.substring(0, 50)}`);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
