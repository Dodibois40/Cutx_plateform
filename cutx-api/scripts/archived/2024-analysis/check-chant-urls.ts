import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const chants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
    },
    select: {
      reference: true,
      name: true,
      sourceUrl: true,
      manufacturerRef: true,
    },
    take: 15,
  });

  console.log('📋 BCB Chants avec sourceUrl:\n');
  chants.forEach(c => {
    console.log(`${c.reference}: ${c.name}`);
    console.log(`  ManufRef: ${c.manufacturerRef}`);
    console.log(`  URL: ${c.sourceUrl}`);
    console.log();
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
