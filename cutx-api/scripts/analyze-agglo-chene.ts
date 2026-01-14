import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
  // 1. Chercher les panneaux agglo avec chêne dans le nom
  console.log('=== Panneaux PARTICULE avec "chêne" dans le nom ===');
  const aggloChene = await prisma.panel.findMany({
    where: {
      productType: 'PARTICULE',
      name: { contains: 'chêne', mode: 'insensitive' }
    },
    select: { name: true, productType: true, material: true, finish: true, decor: true },
    take: 10
  });

  if (aggloChene.length === 0) {
    console.log('  Aucun trouvé avec productType=PARTICULE');

    // Essayer sans filtre productType
    console.log('\n=== Panneaux avec "chêne" dans le nom (tous types) ===');
    const allChene = await prisma.panel.findMany({
      where: { name: { contains: 'chêne', mode: 'insensitive' } },
      select: { name: true, productType: true, material: true, finish: true },
      take: 10
    });
    allChene.forEach(p => {
      console.log(`  [${p.productType}] ${p.name.substring(0, 60)}`);
    });
  } else {
    aggloChene.forEach(p => {
      console.log(`  ${p.name.substring(0, 60)}`);
      console.log(`    finish: ${p.finish}, material: ${p.material}, decor: ${p.decor}`);
    });
  }

  // 2. Voir comment "agglo" est reconnu
  console.log('\n=== Types de produits avec "agglo" ou "particule" ===');
  const productTypes = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT "productType", COUNT(*) as count
    FROM "Panel"
    WHERE "productType" IN ('PARTICULE', 'AGGLOMERE', 'AGGLO')
       OR name ILIKE '%agglo%'
       OR name ILIKE '%particule%'
    GROUP BY "productType"
  `;
  productTypes.forEach(pt => console.log(`  ${pt.productType}: ${pt.count} panneaux`));

  // 3. Tester la recherche actuelle
  console.log('\n=== Test recherche "agglo" seul ===');
  const aggloOnly = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: 'PARTICULE' },
        { name: { contains: 'agglo', mode: 'insensitive' } }
      ]
    },
    select: { name: true, productType: true },
    take: 5
  });
  aggloOnly.forEach(p => console.log(`  [${p.productType}] ${p.name.substring(0, 50)}`));

  // 4. Comprendre pourquoi "agglo chêne" ne trouve rien
  console.log('\n=== Analyse: pourquoi "agglo chêne" ne trouve rien ===');
  const count1 = await prisma.panel.count({
    where: { productType: 'PARTICULE' }
  });
  const count2 = await prisma.panel.count({
    where: {
      productType: 'PARTICULE',
      name: { contains: 'chêne', mode: 'insensitive' }
    }
  });
  console.log(`  Panneaux PARTICULE: ${count1}`);
  console.log(`  Panneaux PARTICULE + chêne dans nom: ${count2}`);

  // 5. Vérifier si chêne est dans finish ou autre champ
  console.log('\n=== Chêne dans différents champs ===');
  const cheneInFinish = await prisma.panel.count({
    where: { finish: { contains: 'chêne', mode: 'insensitive' } }
  });
  const cheneInDecor = await prisma.panel.count({
    where: { decor: { contains: 'chêne', mode: 'insensitive' } }
  });
  const cheneInName = await prisma.panel.count({
    where: { name: { contains: 'chêne', mode: 'insensitive' } }
  });
  console.log(`  Dans finish: ${cheneInFinish}`);
  console.log(`  Dans decor: ${cheneInDecor}`);
  console.log(`  Dans name: ${cheneInName}`);

  await prisma.$disconnect();
}

analyze().catch(console.error);
