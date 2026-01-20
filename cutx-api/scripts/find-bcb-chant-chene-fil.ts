import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Chercher le chant "Chant Bois Chêne de fil 24 x 1 mm"
  const panels = await prisma.panel.findMany({
    where: {
      name: { contains: 'Chêne de fil', mode: 'insensitive' },
      panelType: 'CHANT',
    },
    select: {
      id: true,
      reference: true,
      name: true,
      supplierCode: true,
      pricePerMl: true,
      pricePerUnit: true,
      defaultWidth: true,
      defaultThickness: true,
      decorName: true,
    },
  });

  console.log('=== CHANTS "CHÊNE DE FIL" ===');
  console.log('Total:', panels.length);
  panels.forEach((p) => {
    console.log('\n📦', p.reference);
    console.log('   name:', p.name);
    console.log('   supplierCode:', p.supplierCode);
    console.log('   pricePerMl:', p.pricePerMl);
    console.log('   dimensions:', p.defaultWidth + 'mm x', p.defaultThickness + 'mm');
    console.log('   decorName:', p.decorName);
  });

  // Chercher aussi par référence BCB-87310
  console.log('\n=== RECHERCHE BCB-87310 ===');
  const bcb = await prisma.panel.findFirst({
    where: { reference: 'BCB-87310' },
  });
  console.log('BCB-87310:', bcb ? bcb.name : 'NON TROUVÉ');

  await prisma.$disconnect();
}

check();
