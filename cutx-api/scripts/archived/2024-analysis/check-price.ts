import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const panel = await prisma.panel.findFirst({
    where: { supplierCode: '82728' }
  });
  
  if (panel) {
    console.log('Panel trouvé:');
    console.log('  reference:', panel.reference);
    console.log('  name:', panel.name);
    console.log('  pricePerM2:', panel.pricePerM2);
    console.log('  pricePerMl:', panel.pricePerMl);
    console.log('  pricePerUnit:', panel.pricePerUnit);
    console.log('  productType:', panel.productType);
    console.log('  stockStatus:', panel.stockStatus);
  } else {
    console.log('Non trouvé');
  }
  
  // Stats sur les prix des chants
  const chantsWithPrice = await prisma.panel.count({
    where: { 
      productType: 'BANDE_DE_CHANT',
      OR: [
        { pricePerMl: { not: null } },
        { pricePerM2: { not: null } }
      ]
    }
  });
  
  const chantsTotal = await prisma.panel.count({
    where: { productType: 'BANDE_DE_CHANT' }
  });
  
  console.log('\nStats prix des chants:');
  console.log('  Avec prix:', chantsWithPrice, '/', chantsTotal);
  
  await prisma.$disconnect();
}
main();
