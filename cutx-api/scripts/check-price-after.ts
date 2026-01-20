import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const panel = await prisma.panel.findFirst({
    where: { supplierCode: '77701' },
  });

  console.log('77701 pricePerMl:', panel?.pricePerMl);
  console.log('77701 pricePerUnit:', panel?.pricePerUnit);

  // Stats après mise à jour
  const withPrice = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      panelType: 'CHANT',
      OR: [{ pricePerMl: { not: null } }, { pricePerUnit: { not: null } }],
    },
  });

  const total = await prisma.panel.count({
    where: { reference: { startsWith: 'BCB-' }, panelType: 'CHANT' },
  });

  console.log('\nTotal BCB chants avec prix:', withPrice, '/', total);

  await prisma.$disconnect();
}

check();
