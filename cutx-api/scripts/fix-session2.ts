import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== SESSION 2 - CORRECTIONS ===\n');

  // 1. Créer la catégorie placage-pin si elle n'existe pas
  const parentPlacage = await prisma.category.findFirst({
    where: { slug: 'placages' }
  });

  let placagePinCat = await prisma.category.findFirst({
    where: { slug: 'placage-pin' }
  });

  if (!placagePinCat && parentPlacage) {
    placagePinCat = await prisma.category.create({
      data: {
        name: 'Placage Pin',
        slug: 'placage-pin',
        parentId: parentPlacage.id,
        catalogueId: parentPlacage.catalogueId
      }
    });
    console.log('✅ Catégorie placage-pin créée');
  } else if (placagePinCat) {
    console.log('ℹ️ Catégorie placage-pin existe déjà');
  }

  // Récupérer toutes les catégories nécessaires
  const cats = await prisma.category.findMany({
    where: {
      slug: {
        in: ['placage-chene', 'placage-noyer', 'placage-pin', 'placages-divers', 'mela-unis']
      }
    }
  });
  const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  // 2. Corriger Shinnoki natural oak → placage-chene
  if (catMap['placage-chene']) {
    const oakResult = await prisma.panel.updateMany({
      where: {
        name: { contains: 'oak', mode: 'insensitive' },
        productType: 'PLACAGE',
        categoryId: { not: catMap['placage-chene'] }
      },
      data: { categoryId: catMap['placage-chene'] }
    });
    console.log(`✅ ${oakResult.count} panneaux "oak" → placage-chene`);
  }

  // 3. Corriger Shinnoki 19mm qui sont marqués BANDE_DE_CHANT → PLACAGE
  // D'abord, mettre à jour le productType
  const shinnoki19mm = await prisma.panel.findMany({
    where: {
      AND: [
        { name: { contains: 'Shinnoki', mode: 'insensitive' } },
        { name: { contains: '19 mm', mode: 'insensitive' } }
      ],
      productType: 'BANDE_DE_CHANT'
    },
    select: { id: true, name: true }
  });

  console.log(`\nShinnoki 19mm marqués comme BANDE_DE_CHANT: ${shinnoki19mm.length}`);
  for (const p of shinnoki19mm) {
    console.log(`  - ${p.name}`);
  }

  // Corriger le productType et la catégorie
  for (const p of shinnoki19mm) {
    const name = p.name.toLowerCase();
    let targetCatId: string | null = null;

    if (/walnut|noyer/i.test(name)) {
      targetCatId = catMap['placage-noyer'];
    } else if (/oak|chêne|chene/i.test(name)) {
      targetCatId = catMap['placage-chene'];
    } else {
      targetCatId = catMap['placages-divers'];
    }

    if (targetCatId) {
      await prisma.panel.update({
        where: { id: p.id },
        data: {
          productType: 'PLACAGE',
          categoryId: targetCatId
        }
      });
    }
  }
  console.log(`✅ ${shinnoki19mm.length} Shinnoki 19mm corrigés → PLACAGE`);

  // 4. Déplacer les placages pin vers placage-pin
  if (catMap['placage-pin']) {
    const pinResult = await prisma.panel.updateMany({
      where: {
        OR: [
          { name: { contains: 'Contreplaqué pin', mode: 'insensitive' } },
          { name: { contains: 'placage pin', mode: 'insensitive' } }
        ],
        productType: 'PLACAGE'
      },
      data: { categoryId: catMap['placage-pin'] }
    });
    console.log(`✅ ${pinResult.count} placages pin → placage-pin`);
  }

  // 5. Corriger Rauvisio trench coat → mela-unis
  if (catMap['mela-unis']) {
    const rauvisioResult = await prisma.panel.updateMany({
      where: {
        name: { contains: 'Rauvisio', mode: 'insensitive' },
        productType: 'MELAMINE',
        categoryId: { not: catMap['mela-unis'] }
      },
      data: { categoryId: catMap['mela-unis'] }
    });
    console.log(`✅ ${rauvisioResult.count} Rauvisio MELAMINE → mela-unis`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Session 2 terminée');
}

fix().catch(console.error);
