import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Chercher les chants avec 'blanc lisse' dans le nom
  const blancLisse = await prisma.panel.findMany({
    where: {
      name: { contains: 'blanc lisse', mode: 'insensitive' }
    },
    select: {
      name: true,
      reference: true,
      thickness: true,
      decorName: true,
      productType: true,
      defaultWidth: true,
      defaultLength: true
    },
    take: 15
  });

  console.log('=== CHANTS BLANC LISSE ===');
  console.log('Trouvés:', blancLisse.length);
  
  for (const c of blancLisse) {
    console.log('---');
    console.log('Nom:', c.name);
    console.log('Réf:', c.reference);
    console.log('Type:', c.productType);
    console.log('Épaisseurs:', c.thickness);
    console.log('DecorName:', c.decorName || 'NULL');
    console.log('Dimensions:', c.defaultLength, 'x', c.defaultWidth);
  }

  // Compter total
  const total = await prisma.panel.count({
    where: { name: { contains: 'blanc lisse', mode: 'insensitive' } }
  });
  console.log('\nTOTAL blanc lisse:', total);

  await prisma.$disconnect();
}
check().catch(console.error);
