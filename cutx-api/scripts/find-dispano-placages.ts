import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function find() {
  const dispano = await prisma.catalogue.findFirst({
    where: { slug: 'dispano' },
    select: { id: true }
  });

  if (!dispano) return;

  console.log('=== RECHERCHE PLACAGES DISPANO ===\n');

  // Patterns qui indiquent un vrai placage
  const placagePatterns = [
    'replaqué',
    'replaqu',
    'placage',
    'plaqué',
    'plaque',
    'essence',
    'A/B',
    'A/A',
    'quartier',
    'dosse',
    'fil de',
    'de fil'
  ];

  // Chercher dans CONTREPLAQUE (547 panneaux)
  const cpResults = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      productType: 'CONTREPLAQUE'
    },
    select: { id: true, name: true, material: true, productType: true },
    take: 30
  });

  console.log('=== CONTREPLAQUÉS DISPANO (30 premiers) ===');
  cpResults.forEach(p => {
    const name = p.name?.substring(0, 70) || 'N/A';
    console.log(`- ${name}`);
    console.log(`  mat: ${p.material || 'NULL'}`);
  });

  // Chercher dans PANNEAU_MASSIF (202 panneaux)
  const massifResults = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      productType: 'PANNEAU_MASSIF'
    },
    select: { id: true, name: true, material: true, productType: true },
    take: 20
  });

  console.log('\n=== PANNEAUX MASSIFS DISPANO (20 premiers) ===');
  massifResults.forEach(p => {
    const name = p.name?.substring(0, 70) || 'N/A';
    console.log(`- ${name}`);
    console.log(`  mat: ${p.material || 'NULL'}`);
  });

  // Chercher dans LATTE (6 panneaux)
  const latteResults = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      productType: 'LATTE'
    },
    select: { id: true, name: true, material: true, productType: true }
  });

  console.log('\n=== LATTÉS DISPANO (tous) ===');
  latteResults.forEach(p => {
    const name = p.name?.substring(0, 70) || 'N/A';
    console.log(`- ${name}`);
    console.log(`  mat: ${p.material || 'NULL'}`);
  });

  // Chercher avec mots-clés de placage dans TOUT le catalogue
  const withPlacageKeywords = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      isActive: true,
      OR: [
        { name: { contains: 'replaqué', mode: 'insensitive' } },
        { name: { contains: 'placage', mode: 'insensitive' } },
        { name: { contains: 'plaqué', mode: 'insensitive' } },
        { name: { contains: 'quartier', mode: 'insensitive' } },
        { name: { contains: 'dosse', mode: 'insensitive' } },
        { name: { contains: 'A/B', mode: 'insensitive' } },
        { name: { contains: 'A/A', mode: 'insensitive' } },
        { material: { contains: 'placage', mode: 'insensitive' } },
        { material: { contains: 'chêne', mode: 'insensitive' } },
        { material: { contains: 'noyer', mode: 'insensitive' } }
      ]
    },
    select: { name: true, productType: true, material: true },
    take: 30
  });

  console.log(`\n=== PANNEAUX AVEC MOTS-CLÉS PLACAGE (${withPlacageKeywords.length} trouvés) ===`);
  withPlacageKeywords.forEach(p => {
    const name = p.name?.substring(0, 60) || 'N/A';
    console.log(`- ${name}`);
    console.log(`  type: ${p.productType} | mat: ${p.material || 'NULL'}`);
  });

  await prisma.$disconnect();
}
find();
