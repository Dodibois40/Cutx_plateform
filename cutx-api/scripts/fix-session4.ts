import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  console.log('=== SESSION 4 - CORRECTIONS ===\n');

  // 1. Trouver les catégories parentes
  const parentAbs = await prisma.category.findFirst({
    where: { slug: 'chants-abs' },
    select: { id: true, parentId: true, catalogueId: true }
  });

  const parentStrat = await prisma.category.findFirst({
    where: { slug: 'stratifies-hpl' },
    select: { id: true, parentId: true, catalogueId: true }
  });

  const placageNoyer = await prisma.category.findFirst({
    where: { slug: 'placage-noyer' }
  });

  if (!parentAbs || !parentStrat) {
    console.log('❌ Catégories parentes non trouvées');
    await prisma.$disconnect();
    return;
  }

  // 2. Créer les sous-catégories ABS bois
  const absEssences = [
    { name: 'ABS Chêne', slug: 'abs-chene' },
    { name: 'ABS Noyer', slug: 'abs-noyer' },
    { name: 'ABS Frêne', slug: 'abs-frene' },
    { name: 'ABS Hêtre', slug: 'abs-hetre' }
  ];

  for (const essence of absEssences) {
    const existing = await prisma.category.findFirst({ where: { slug: essence.slug } });
    if (!existing) {
      await prisma.category.create({
        data: {
          name: essence.name,
          slug: essence.slug,
          parentId: parentAbs.parentId, // Même parent que chants-abs
          catalogueId: parentAbs.catalogueId
        }
      });
      console.log(`✅ Catégorie ${essence.slug} créée`);
    } else {
      console.log(`ℹ️ Catégorie ${essence.slug} existe déjà`);
    }
  }

  // 3. Créer catégorie feuilles-stratifiees
  const existingFeuilles = await prisma.category.findFirst({ where: { slug: 'feuilles-stratifiees' } });
  if (!existingFeuilles) {
    await prisma.category.create({
      data: {
        name: 'Feuilles Stratifiées',
        slug: 'feuilles-stratifiees',
        parentId: parentStrat.parentId, // Même parent que stratifies-hpl
        catalogueId: parentStrat.catalogueId
      }
    });
    console.log('✅ Catégorie feuilles-stratifiees créée');
  } else {
    console.log('ℹ️ Catégorie feuilles-stratifiees existe déjà');
  }

  // Récupérer toutes les catégories
  const cats = await prisma.category.findMany({
    where: {
      slug: {
        in: ['abs-chene', 'abs-noyer', 'abs-frene', 'abs-hetre', 'abs-bois',
             'feuilles-stratifiees', 'strat-bois', 'placage-noyer']
      }
    }
  });
  const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  // 4. Corriger Nuxe Naturals Mystique → placage-noyer
  if (placageNoyer) {
    const nuxeResult = await prisma.panel.updateMany({
      where: {
        name: { contains: 'Nuxe', mode: 'insensitive' },
        material: 'Placage'
      },
      data: {
        productType: 'PLACAGE',
        categoryId: placageNoyer.id
      }
    });
    console.log(`\n✅ ${nuxeResult.count} Nuxe (placages) → placage-noyer`);
  }

  // 5. Déplacer les chants ABS bois vers sous-catégories par essence
  if (catMap['abs-chene']) {
    const cheneResult = await prisma.panel.updateMany({
      where: {
        productType: 'BANDE_DE_CHANT',
        OR: [
          { name: { contains: 'chêne', mode: 'insensitive' } },
          { name: { contains: 'chene', mode: 'insensitive' } },
          { name: { contains: 'oak', mode: 'insensitive' } }
        ]
      },
      data: { categoryId: catMap['abs-chene'] }
    });
    console.log(`✅ ${cheneResult.count} chants chêne → abs-chene`);
  }

  if (catMap['abs-noyer']) {
    const noyerResult = await prisma.panel.updateMany({
      where: {
        productType: 'BANDE_DE_CHANT',
        OR: [
          { name: { contains: 'noyer', mode: 'insensitive' } },
          { name: { contains: 'walnut', mode: 'insensitive' } }
        ]
      },
      data: { categoryId: catMap['abs-noyer'] }
    });
    console.log(`✅ ${noyerResult.count} chants noyer → abs-noyer`);
  }

  if (catMap['abs-frene']) {
    const freneResult = await prisma.panel.updateMany({
      where: {
        productType: 'BANDE_DE_CHANT',
        OR: [
          { name: { contains: 'frêne', mode: 'insensitive' } },
          { name: { contains: 'frene', mode: 'insensitive' } },
          { name: { contains: 'ash', mode: 'insensitive' } }
        ]
      },
      data: { categoryId: catMap['abs-frene'] }
    });
    console.log(`✅ ${freneResult.count} chants frêne → abs-frene`);
  }

  if (catMap['abs-hetre']) {
    const hetreResult = await prisma.panel.updateMany({
      where: {
        productType: 'BANDE_DE_CHANT',
        OR: [
          { name: { contains: 'hêtre', mode: 'insensitive' } },
          { name: { contains: 'hetre', mode: 'insensitive' } },
          { name: { contains: 'beech', mode: 'insensitive' } }
        ]
      },
      data: { categoryId: catMap['abs-hetre'] }
    });
    console.log(`✅ ${hetreResult.count} chants hêtre → abs-hetre`);
  }

  // 6. Déplacer les feuilles stratifiées (épaisseur fine) vers feuilles-stratifiees
  if (catMap['feuilles-stratifiees']) {
    const feuillesResult = await prisma.panel.updateMany({
      where: {
        productType: 'STRATIFIE',
        thickness: { hasSome: [0.7, 0.8, 0.9, 1, 1.2] }
      },
      data: { categoryId: catMap['feuilles-stratifiees'] }
    });
    console.log(`✅ ${feuillesResult.count} feuilles stratifiées → feuilles-stratifiees`);
  }

  // 7. Corriger stratifiés bois (frêne, cerisier, etc.) qui étaient dans stratifies-hpl
  if (catMap['strat-bois']) {
    const stratBoisResult = await prisma.panel.updateMany({
      where: {
        productType: 'STRATIFIE',
        OR: [
          { name: { contains: 'frêne', mode: 'insensitive' } },
          { name: { contains: 'cerisier', mode: 'insensitive' } },
          { name: { contains: 'chêne', mode: 'insensitive' } },
          { name: { contains: 'noyer', mode: 'insensitive' } },
          { name: { contains: 'oak', mode: 'insensitive' } },
          { name: { contains: 'walnut', mode: 'insensitive' } },
          { name: { contains: 'cherry', mode: 'insensitive' } },
          { name: { contains: 'mélèze', mode: 'insensitive' } },
          { name: { contains: 'orme', mode: 'insensitive' } }
        ],
        categoryId: { not: catMap['strat-bois'] }
      },
      data: { categoryId: catMap['strat-bois'] }
    });
    console.log(`✅ ${stratBoisResult.count} stratifiés bois → strat-bois`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Session 4 terminée');
}

fix().catch(console.error);
