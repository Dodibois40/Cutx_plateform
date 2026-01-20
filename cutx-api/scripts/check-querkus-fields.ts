import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const querkus = await prisma.panel.findMany({
    where: {
      name: { contains: 'querkus', mode: 'insensitive' }
    },
    select: {
      name: true,
      decorName: true,
      material: true,
      finish: true,
      description: true,
      decorCategory: true,
      colorCode: true,
    },
    take: 5
  });

  console.log('=== DÉTAILS DES PRODUITS QUERKUS ===\n');

  for (const p of querkus) {
    console.log('Nom:', p.name);
    console.log('  decorName:', p.decorName || 'NULL');
    console.log('  material:', p.material || 'NULL');
    console.log('  finish:', p.finish || 'NULL');
    console.log('  decorCategory:', p.decorCategory || 'NULL');
    console.log('  colorCode:', p.colorCode || 'NULL');
    console.log('  description:', (p.description || 'NULL').substring(0, 100));
    console.log('');
  }

  // Chercher si "chêne" existe dans n'importe quel champ des Querkus
  const withCheneAnywhere = await prisma.panel.findMany({
    where: {
      name: { contains: 'querkus', mode: 'insensitive' },
      OR: [
        { decorName: { contains: 'chêne', mode: 'insensitive' } },
        { material: { contains: 'chêne', mode: 'insensitive' } },
        { finish: { contains: 'chêne', mode: 'insensitive' } },
        { description: { contains: 'chêne', mode: 'insensitive' } },
      ]
    },
    select: { name: true, decorName: true, material: true },
    take: 10
  });

  console.log('\n=== QUERKUS AVEC "CHÊNE" DANS UN CHAMP ===');
  console.log(`Trouvés: ${withCheneAnywhere.length}`);
  withCheneAnywhere.forEach(p => {
    console.log(`- ${p.name?.substring(0, 50)}`);
    console.log(`  decorName: ${p.decorName}, material: ${p.material}`);
  });

  await prisma.$disconnect();
}
check().catch(console.error);
