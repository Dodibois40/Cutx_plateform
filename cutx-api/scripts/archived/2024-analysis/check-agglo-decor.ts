import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Check decorCategory distribution for aggloméré panels
    const result = await prisma.panel.groupBy({
      by: ['decorCategory'],
      where: { productType: 'PARTICULE' },
      _count: true,
    });

    console.log('Agglomérés (PARTICULE) par decorCategory:');
    result.forEach(x => {
      console.log(`  ${x.decorCategory || 'NULL'}: ${x._count}`);
    });

    // Also check manufacturer
    const manuResult = await prisma.panel.groupBy({
      by: ['manufacturer'],
      where: { productType: 'PARTICULE' },
      _count: true,
    });

    console.log('\nAgglomérés par manufacturer:');
    manuResult.forEach(x => {
      console.log(`  ${x.manufacturer || 'NULL'}: ${x._count}`);
    });

  } finally {
    await prisma.$disconnect();
  }
}

main();
