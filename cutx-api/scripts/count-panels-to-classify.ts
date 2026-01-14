import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Total panels
  const total = await prisma.panel.count();

  // Non verified
  const nonVerified = await prisma.panel.count({
    where: { reviewStatus: 'NON_VERIFIE' }
  });

  // Without panelType
  const noPanelType = await prisma.panel.count({
    where: { panelType: null }
  });

  // Without decorCode
  const noDecorCode = await prisma.panel.count({
    where: { decorCode: null }
  });

  // Without manufacturer
  const noManufacturer = await prisma.panel.count({
    where: { manufacturer: null }
  });

  // Sample of distinct productTypes
  const productTypes = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });

  console.log('=== STATISTIQUES PANNEAUX ===');
  console.log('Total panneaux:', total);
  console.log('Non vérifiés:', nonVerified);
  console.log('Sans panelType:', noPanelType);
  console.log('Sans decorCode:', noDecorCode);
  console.log('Sans manufacturer:', noManufacturer);
  console.log('');
  console.log('=== PAR TYPE (legacy productType) ===');
  for (const t of productTypes) {
    console.log(`${t.productType || 'NULL'}: ${t._count}`);
  }
}

main().then(() => prisma.$disconnect());
