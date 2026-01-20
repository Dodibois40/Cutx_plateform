/**
 * Debug des transitions problématiques
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
  console.log('=== DEBUG DES TRANSITIONS PROBLÉMATIQUES ===\n');

  // 1. cp-peuplier → cp-okoume (devrait PAS arriver)
  const peuplierCat = await prisma.category.findFirst({
    where: { slug: 'cp-peuplier' },
  });

  if (peuplierCat) {
    const panels = await prisma.panel.findMany({
      where: { categoryId: peuplierCat.id, isActive: true },
      select: { name: true, productType: true, isHydrofuge: true },
      take: 10,
    });

    console.log('Panneaux dans cp-peuplier:');
    for (const p of panels) {
      console.log(`  [${p.productType}] ${(p.name || '').substring(0, 50)}`);
      // Tester si le nom contient okoumé
      if (/okoum/i.test(p.name || '')) {
        console.log('    ⚠️ Nom contient okoumé!');
      }
    }
  }

  // 2. cp-filme → cp-bouleau (devrait PAS arriver)
  const filmeCat = await prisma.category.findFirst({
    where: { slug: 'cp-filme' },
  });

  if (filmeCat) {
    const panels = await prisma.panel.findMany({
      where: { categoryId: filmeCat.id, isActive: true },
      select: { name: true, productType: true },
      take: 10,
    });

    console.log('\nPanneaux dans cp-filme:');
    for (const p of panels) {
      console.log(`  [${p.productType}] ${(p.name || '').substring(0, 50)}`);
      // Tester si le nom contient bouleau
      if (/bouleau/i.test(p.name || '')) {
        console.log('    ⚠️ Nom contient bouleau!');
      }
    }
  }

  // 3. strat-unis → mela-unis (stratifié devrait pas devenir mélaminé)
  const stratUnisCat = await prisma.category.findFirst({
    where: { slug: 'strat-unis' },
  });

  if (stratUnisCat) {
    const panels = await prisma.panel.findMany({
      where: { categoryId: stratUnisCat.id, isActive: true },
      select: { name: true, productType: true, decorCategory: true },
      take: 10,
    });

    console.log('\nPanneaux dans strat-unis:');
    for (const p of panels) {
      console.log(`  [${p.productType}] decorCat=${p.decorCategory} ${(p.name || '').substring(0, 40)}`);
    }
  }

  // 4. Vérifier si des panneaux STRATIFIE ont productType MELAMINE
  console.log('\n=== VÉRIFICATION PRODUCT TYPE ===');

  const stratCatParent = await prisma.category.findFirst({
    where: { slug: 'stratifies-hpl' },
  });

  if (stratCatParent) {
    // Trouver toutes les sous-catégories de stratifiés
    const stratCats = await prisma.category.findMany({
      where: {
        OR: [
          { id: stratCatParent.id },
          { parentId: stratCatParent.id }
        ]
      },
    });

    const stratCatIds = stratCats.map(c => c.id);

    const melaInStrat = await prisma.panel.count({
      where: {
        categoryId: { in: stratCatIds },
        productType: 'MELAMINE',
        isActive: true
      }
    });

    const stratInStrat = await prisma.panel.count({
      where: {
        categoryId: { in: stratCatIds },
        productType: 'STRATIFIE',
        isActive: true
      }
    });

    console.log(`\nDans catégories stratifiés:`);
    console.log(`  productType=STRATIFIE: ${stratInStrat}`);
    console.log(`  productType=MELAMINE: ${melaInStrat}`);

    if (melaInStrat > 0) {
      const examples = await prisma.panel.findMany({
        where: {
          categoryId: { in: stratCatIds },
          productType: 'MELAMINE',
          isActive: true
        },
        select: { name: true, category: { select: { name: true, slug: true } } },
        take: 5
      });

      console.log('\nExemples de MELAMINE dans catégories stratifiés:');
      for (const p of examples) {
        console.log(`  ${p.category?.slug}: ${p.name?.substring(0, 40)}`);
      }
    }
  }

  await prisma.$disconnect();
}

debug().catch(console.error);
