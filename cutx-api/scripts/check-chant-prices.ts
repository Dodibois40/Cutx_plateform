import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking edge band prices...\n');

  // Check a sample of edge bands
  const chants = await prisma.panel.findMany({
    where: { productType: 'BANDE_DE_CHANT' },
    select: {
      reference: true,
      name: true,
      pricePerM2: true,
      pricePerMl: true,
      pricePerUnit: true,
      defaultLength: true,
      metadata: true,
    },
    take: 20,
  });

  console.log('Sample of edge band prices:\n');
  let withPricePerMl = 0;
  let withPricePerUnit = 0;
  let noPrices = 0;

  chants.forEach((c) => {
    console.log(`${c.reference}:`);
    console.log(`  pricePerM2: ${c.pricePerM2 ?? 'null'}`);
    console.log(`  pricePerMl: ${c.pricePerMl ?? 'null'}`);
    console.log(`  pricePerUnit: ${c.pricePerUnit ?? 'null'}`);
    console.log(`  defaultLength: ${c.defaultLength}mm (${c.defaultLength / 1000}m)`);

    // Parse metadata for longueurRouleau
    if (c.metadata) {
      try {
        const meta = JSON.parse(c.metadata);
        console.log(`  metadata.longueurRouleau: ${meta.longueurRouleau ?? 'null'}m`);
        console.log(`  metadata.prixRouleau: ${meta.prixRouleau ?? 'null'}€`);
      } catch {}
    }
    console.log('');

    if (c.pricePerMl) withPricePerMl++;
    if (c.pricePerUnit) withPricePerUnit++;
    if (!c.pricePerMl && !c.pricePerUnit) noPrices++;
  });

  // Count statistics
  const stats = await prisma.panel.aggregate({
    where: { productType: 'BANDE_DE_CHANT' },
    _count: true,
  });

  const withMl = await prisma.panel.count({
    where: {
      productType: 'BANDE_DE_CHANT',
      pricePerMl: { not: null },
    },
  });

  const withUnit = await prisma.panel.count({
    where: {
      productType: 'BANDE_DE_CHANT',
      pricePerUnit: { not: null },
    },
  });

  console.log('\n📊 Statistics:');
  console.log(`  Total edge bands: ${stats._count}`);
  console.log(`  With pricePerMl: ${withMl} (${Math.round((withMl / stats._count) * 100)}%)`);
  console.log(`  With pricePerUnit: ${withUnit} (${Math.round((withUnit / stats._count) * 100)}%)`);
  console.log(`  Without any price: ${stats._count - Math.max(withMl, withUnit)}`);

  await prisma.$disconnect();
}

main();
