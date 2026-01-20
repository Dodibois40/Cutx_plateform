import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function find() {
  const dispano = await prisma.catalogue.findFirst({
    where: { slug: 'dispano' },
    select: { id: true }
  });

  if (!dispano) return;

  console.log('=== RECHERCHE PLACAGES DISPANO V2 ===\n');

  // Chercher dans PARTICULE (agglo) avec essence dans le nom
  const aggloPotential = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      productType: 'PARTICULE',
    },
    select: { name: true, material: true, productType: true },
    take: 30
  });

  console.log('=== AGGLOMÉRÉS (PARTICULE) DISPANO (30 premiers) ===');
  aggloPotential.forEach(p => {
    console.log(`- ${p.name?.substring(0, 70)}`);
  });

  // Chercher panneaux avec "replaqué" partout
  const replaques = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      OR: [
        { name: { contains: 'replaqué', mode: 'insensitive' } },
        { name: { contains: 'replaqu', mode: 'insensitive' } },
        { description: { contains: 'replaqué', mode: 'insensitive' } }
      ]
    },
    select: { name: true, productType: true, material: true }
  });

  console.log(`\n=== PANNEAUX "REPLAQUÉS" (${replaques.length}) ===`);
  replaques.forEach(p => {
    console.log(`- ${p.name?.substring(0, 60)}`);
    console.log(`  type: ${p.productType}`);
  });

  // Chercher panneaux avec essence bois nobles
  const essencesBois = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      OR: [
        { name: { contains: 'chêne', mode: 'insensitive' } },
        { name: { contains: 'noyer', mode: 'insensitive' } },
        { name: { contains: 'hêtre', mode: 'insensitive' } },
        { name: { contains: 'frêne', mode: 'insensitive' } },
        { name: { contains: 'merisier', mode: 'insensitive' } }
      ],
      NOT: {
        productType: { in: ['BANDE_DE_CHANT', 'MELAMINE', 'STRATIFIE'] }
      }
    },
    select: { name: true, productType: true, material: true }
  });

  console.log(`\n=== PANNEAUX AVEC ESSENCES NOBLES (hors chants/méla/strat) (${essencesBois.length}) ===`);
  essencesBois.forEach(p => {
    console.log(`- ${p.name?.substring(0, 60)}`);
    console.log(`  type: ${p.productType} | mat: ${p.material?.substring(0, 40) || 'NULL'}`);
  });

  // Voir tous les productTypes Dispano
  const allTypes = await prisma.panel.groupBy({
    by: ['productType'],
    where: { catalogueId: dispano.id, isActive: true },
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });

  console.log('\n=== TOUS LES TYPES DISPANO ===');
  allTypes.forEach(t => console.log(`${t.productType}: ${t._count}`));

  await prisma.$disconnect();
}
find();
