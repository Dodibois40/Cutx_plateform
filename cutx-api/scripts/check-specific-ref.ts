import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Chercher la référence exacte de la capture
  const specific = await prisma.panel.findFirst({
    where: {
      reference: 'BCB-QUERKUS-1768602589346'
    }
  });

  if (specific) {
    console.log('=== PRODUIT TROUVÉ ===');
    console.log('Nom:', specific.name);
    console.log('Réf:', specific.reference);
    console.log('Type:', specific.productType);
    console.log('Épaisseurs:', specific.thickness);
    console.log('DecorName:', specific.decorName);
    console.log('Material:', specific.material);
    console.log('Dimensions:', specific.defaultLength, 'x', specific.defaultWidth);
    console.log('Image:', specific.imageUrl);
  } else {
    console.log('Référence BCB-QUERKUS-1768602589346 NON TROUVÉE');
  }

  // Chercher aussi les chants BCB avec "blanc" quelque part
  console.log('\n=== CHANTS BCB AVEC "blanc" ===');
  const bcbBlanc = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB' },
      name: { contains: 'blanc', mode: 'insensitive' }
    },
    select: {
      name: true,
      reference: true,
      thickness: true,
      decorName: true,
      productType: true
    },
    take: 20
  });

  console.log('Trouvés:', bcbBlanc.length);
  for (const c of bcbBlanc) {
    console.log('---');
    console.log('Nom:', c.name?.substring(0, 60));
    console.log('Réf:', c.reference);
    console.log('DecorName:', c.decorName || 'NULL');
  }

  await prisma.$disconnect();
}
check().catch(console.error);
