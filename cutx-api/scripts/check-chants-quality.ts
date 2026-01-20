import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Patterns des références qu'on a créées aujourd'hui
  const patterns = ['BCB-BOI-', 'BCB-MEL-', 'BCB-ABS-', 'BCB-CHANT-', 'BCB-QUERKUS-'];

  console.log('=== Chants BCB Libre-service scrapés aujourd\'hui ===\n');

  let totalAll = 0;
  let totalWithImage = 0;
  let totalWithPrice = 0;

  for (const pattern of patterns) {
    const chants = await prisma.panel.findMany({
      where: {
        catalogueId: 'cmjqpjtly0000by4cnkga0kaq',
        reference: { startsWith: pattern }
      },
      select: {
        name: true,
        imageUrl: true,
        pricePerMl: true,
        pricePerUnit: true,
        supplierCode: true
      }
    });

    const withImage = chants.filter(c => c.imageUrl).length;
    const withPrice = chants.filter(c => c.pricePerMl || c.pricePerUnit).length;

    console.log(pattern.padEnd(15) + ': ' + chants.length + ' chants');
    console.log('  Avec image: ' + withImage);
    console.log('  Avec prix: ' + withPrice);

    // Montrer quelques exemples
    if (chants.length > 0) {
      console.log('  Exemples:');
      chants.slice(0, 3).forEach(c => {
        console.log('    - ' + c.name.substring(0, 50));
      });
    }
    console.log('');

    totalAll += chants.length;
    totalWithImage += withImage;
    totalWithPrice += withPrice;
  }

  console.log('=== TOTAL ===');
  console.log('Total chants Libre-service: ' + totalAll);
  console.log('Avec image: ' + totalWithImage + ' (' + Math.round(totalWithImage/totalAll*100) + '%)');
  console.log('Avec prix: ' + totalWithPrice + ' (' + Math.round(totalWithPrice/totalAll*100) + '%)');

  await prisma.$disconnect();
}

check();
