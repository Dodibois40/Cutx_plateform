import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
  console.log('=== DEBUG MATCHING BCB ===\n');

  // Exemple de code fournisseur de la page chêne
  const supplierCodes = ['83814', '77701', '83760', '83906', '76649', '76650'];

  for (const code of supplierCodes) {
    console.log(`\n📦 Code: ${code}`);

    // Chercher par supplierCode exact
    const bySupplierCode = await prisma.panel.findFirst({
      where: { supplierCode: code },
      select: { id: true, reference: true, pricePerMl: true, pricePerUnit: true },
    });
    console.log('   Par supplierCode:', bySupplierCode ? bySupplierCode.reference : 'NON TROUVÉ');
    if (bySupplierCode) {
      console.log('   Prix:', bySupplierCode.pricePerMl || bySupplierCode.pricePerUnit || 'NULL');
    }

    // Chercher par référence contenant le code
    const byReference = await prisma.panel.findFirst({
      where: { reference: { contains: code } },
      select: { id: true, reference: true, pricePerMl: true, pricePerUnit: true, supplierCode: true },
    });
    console.log('   Par référence:', byReference ? byReference.reference : 'NON TROUVÉ');
    if (byReference) {
      console.log('   supplierCode stocké:', byReference.supplierCode || 'NULL');
      console.log('   Prix:', byReference.pricePerMl || byReference.pricePerUnit || 'NULL');
    }
  }

  // Stats globales
  console.log('\n=== STATS GLOBALES ===');
  const totalBcbChants = await prisma.panel.count({
    where: { reference: { startsWith: 'BCB-' }, panelType: 'CHANT' },
  });

  const withSupplierCode = await prisma.panel.count({
    where: { reference: { startsWith: 'BCB-' }, panelType: 'CHANT', supplierCode: { not: null } },
  });

  const withPrice = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      panelType: 'CHANT',
      OR: [{ pricePerMl: { not: null } }, { pricePerUnit: { not: null } }],
    },
  });

  console.log('Total chants BCB:', totalBcbChants);
  console.log('Avec supplierCode:', withSupplierCode);
  console.log('Avec prix:', withPrice);

  await prisma.$disconnect();
}

debug();
