import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('Connexion...');
  
  const badChants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-QUERKUS' }
    },
    select: {
      name: true,
      reference: true,
      thickness: true,
      decorName: true,
      productType: true,
      imageUrl: true,
      pricePerM2: true,
      pricePerPanel: true
    },
    take: 15
  });

  console.log('=== CHANTS BCB-QUERKUS ===');
  console.log('Trouvés:', badChants.length);
  
  for (const c of badChants) {
    console.log('---');
    console.log('Nom:', c.name?.substring(0, 50));
    console.log('Réf:', c.reference);
    console.log('Type:', c.productType);
    console.log('Épaisseurs:', c.thickness);
    console.log('DecorName:', c.decorName || 'NULL');
    console.log('Image:', c.imageUrl ? 'OUI' : 'NON');
    console.log('Prix/m²:', c.pricePerM2 || 'NULL');
    console.log('Prix/panneau:', c.pricePerPanel || 'NULL');
  }

  const total = await prisma.panel.count({
    where: { reference: { startsWith: 'BCB-QUERKUS' } }
  });
  console.log('\nTOTAL BCB-QUERKUS:', total);

  // Vérifier les épaisseurs (c'est un tableau)
  const allChants = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-QUERKUS' } },
    select: { thickness: true }
  });
  
  const aberrantCount = allChants.filter(c => c.thickness.some(t => t > 100)).length;
  console.log('Avec épaisseur aberrante (>100mm):', aberrantCount);

  await prisma.$disconnect();
}
check().catch(console.error);
