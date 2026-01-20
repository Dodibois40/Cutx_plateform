import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Trouver le catalogue Dispano
  const dispano = await prisma.catalogue.findFirst({
    where: { slug: 'dispano' },
    select: { id: true, name: true }
  });

  console.log('=== CATALOGUE DISPANO ===');
  console.log('ID:', dispano?.id);

  if (!dispano) {
    console.log('Catalogue Dispano non trouvé !');
    return;
  }

  // Compter total panneaux
  const total = await prisma.panel.count({
    where: { catalogueId: dispano.id, isActive: true }
  });
  console.log('Total panneaux actifs:', total);

  // Compter les panneaux Dispano par productType
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    where: { catalogueId: dispano.id, isActive: true },
    _count: true
  });

  console.log('\n=== PANNEAUX DISPANO PAR TYPE ===');
  byType.sort((a, b) => b._count - a._count).forEach(t => {
    console.log(`${t.productType}: ${t._count}`);
  });

  // Chercher des panneaux avec 'plaq' ou essences dans le nom
  const potentialPlacages = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      OR: [
        { name: { contains: 'plaq', mode: 'insensitive' } },
        { name: { contains: 'chêne', mode: 'insensitive' } },
        { name: { contains: 'chene', mode: 'insensitive' } },
        { name: { contains: 'noyer', mode: 'insensitive' } },
        { name: { contains: 'hêtre', mode: 'insensitive' } },
        { material: { contains: 'plaq', mode: 'insensitive' } }
      ]
    },
    select: { name: true, productType: true, material: true },
    take: 20
  });

  console.log(`\n=== POTENTIELS PLACAGES DISPANO (${potentialPlacages.length} trouvés) ===`);
  potentialPlacages.forEach(p => {
    const name = p.name?.substring(0, 55) || 'N/A';
    console.log(`- ${name}`);
    console.log(`  type: ${p.productType} | mat: ${p.material || 'NULL'}`);
  });

  // Vérifier les mélaminés avec "bois" ou essence
  const melaBois = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      productType: 'MELAMINE',
      OR: [
        { name: { contains: 'chêne', mode: 'insensitive' } },
        { name: { contains: 'chene', mode: 'insensitive' } },
        { name: { contains: 'noyer', mode: 'insensitive' } }
      ]
    },
    select: { name: true, material: true },
    take: 5
  });

  console.log(`\n=== MÉLAMINÉS "BOIS" DISPANO (exemples) ===`);
  melaBois.forEach(p => {
    console.log(`- ${p.name?.substring(0, 55)}`);
  });

  await prisma.$disconnect();
}
check();
