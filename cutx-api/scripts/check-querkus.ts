import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const querkus = await prisma.panel.findMany({
    where: {
      name: { contains: 'querkus', mode: 'insensitive' }
    },
    select: { name: true, productType: true },
    take: 15
  });

  console.log(`Produits Querkus: ${querkus.length} trouvés`);
  console.log('\n10 premiers:');
  querkus.slice(0, 10).forEach(p => {
    console.log(`- [${p.productType}] ${p.name?.substring(0, 70)}`);
  });

  // Chercher Querkus avec chêne dans le nom
  const withChene = await prisma.panel.count({
    where: {
      AND: [
        { name: { contains: 'querkus', mode: 'insensitive' } },
        { OR: [
          { name: { contains: 'chêne', mode: 'insensitive' } },
          { name: { contains: 'chene', mode: 'insensitive' } },
          { name: { contains: 'oak', mode: 'insensitive' } }
        ]}
      ]
    }
  });

  console.log(`\nQuerkus avec "chêne/chene/oak" dans le nom: ${withChene}`);

  // Vérifier le decorCategory des Querkus
  const querkusDecor = await prisma.panel.findMany({
    where: { name: { contains: 'querkus', mode: 'insensitive' } },
    select: { decorCategory: true },
    distinct: ['decorCategory']
  });

  console.log('\nDecorCategory des Querkus:');
  querkusDecor.forEach(p => console.log(`  - ${p.decorCategory || 'NULL'}`));

  await prisma.$disconnect();
}
check().catch(console.error);
