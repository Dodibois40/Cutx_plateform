import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Check which product types have decorCategory=BOIS
    const result = await prisma.panel.groupBy({
      by: ['productType'],
      where: { decorCategory: 'BOIS' },
      _count: true,
    });

    console.log('Types de panneaux avec decorCategory=BOIS:');
    result.forEach(x => {
      console.log(`  ${x.productType}: ${x._count}`);
    });

    // Get a sample of BOIS panels to see what they look like
    const samples = await prisma.panel.findMany({
      where: { decorCategory: 'BOIS' },
      select: {
        name: true,
        productType: true,
        material: true,
      },
      take: 10,
    });

    console.log('\nExemples de panneaux décor BOIS:');
    samples.forEach(s => {
      console.log(`  [${s.productType}] ${s.name}`);
    });

  } finally {
    await prisma.$disconnect();
  }
}

main();
