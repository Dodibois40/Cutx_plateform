import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const panel = await prisma.panel.findFirst({
    where: {
      OR: [
        { supplierCode: '87310' },
        { reference: { contains: '87310' } },
      ],
    },
  });

  if (panel) {
    console.log('=== CHANT 87310 ===');
    console.log('id:', panel.id);
    console.log('reference:', panel.reference);
    console.log('name:', panel.name);
    console.log('pricePerMl:', panel.pricePerMl);
    console.log('pricePerUnit:', panel.pricePerUnit);
    console.log('pricePerM2:', panel.pricePerM2);
    console.log('decorName:', panel.decorName);
    console.log('defaultWidth:', panel.defaultWidth);
    console.log('defaultThickness:', panel.defaultThickness);
    console.log('supplierCode:', panel.supplierCode);
    console.log('imageUrl:', panel.imageUrl);
  } else {
    console.log('Chant 87310 non trouvé');
  }

  await prisma.$disconnect();
}

check();
