import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check BCB chants prices
  const withPrice = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
      OR: [
        { pricePerMl: { not: null } },
        { pricePerM2: { not: null } },
        { pricePerUnit: { not: null } },
      ],
    },
  });

  const total = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
    },
  });

  console.log('📊 Stats prix chants Bouney:');
  console.log(`   Avec prix: ${withPrice} / ${total}`);
  console.log(`   Sans prix: ${total - withPrice}`);

  // Check specific panel
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-93869' },
    select: {
      reference: true,
      name: true,
      pricePerMl: true,
      pricePerM2: true,
      pricePerUnit: true,
      stockStatus: true,
    },
  });
  console.log('\n📋 BCB-93869:', JSON.stringify(panel, null, 2));

  // Sample of chants without price
  const noPriceChants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
      pricePerMl: null,
      pricePerM2: null,
      pricePerUnit: null,
    },
    select: {
      reference: true,
      name: true,
      stockStatus: true,
    },
    take: 10,
  });

  console.log('\n📋 Exemples de chants sans prix:');
  noPriceChants.forEach(c => {
    console.log(`   ${c.reference}: ${c.name} (${c.stockStatus || 'N/A'})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
