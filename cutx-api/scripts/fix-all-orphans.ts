import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FUSION DES CATÉGORIES ORPHELINES ===\n');

  let totalMoved = 0;
  let totalDeleted = 0;

  // Helper pour déplacer les panneaux et supprimer la catégorie orpheline
  async function mergeCategory(orphanId: string, targetId: string, orphanName: string, targetName: string) {
    const result = await prisma.panel.updateMany({
      where: { categoryId: orphanId },
      data: { categoryId: targetId }
    });

    if (result.count > 0) {
      console.log(`✅ ${result.count} panneaux: "${orphanName}" → "${targetName}"`);
      totalMoved += result.count;
    }

    // Vérifier s'il y a des sous-catégories à déplacer aussi
    const children = await prisma.category.findMany({
      where: { parentId: orphanId },
      include: { _count: { select: { panels: true } } }
    });

    for (const child of children) {
      // Déplacer les panneaux des enfants
      const childResult = await prisma.panel.updateMany({
        where: { categoryId: child.id },
        data: { categoryId: targetId }
      });
      if (childResult.count > 0) {
        console.log(`  ✅ ${childResult.count} panneaux de sous-cat "${child.name}" → "${targetName}"`);
        totalMoved += childResult.count;
      }
      // Supprimer l'enfant
      await prisma.category.delete({ where: { id: child.id } });
      console.log(`  🗑️  Sous-catégorie "${child.name}" supprimée`);
      totalDeleted++;
    }

    // Supprimer la catégorie orpheline
    try {
      await prisma.category.delete({ where: { id: orphanId } });
      console.log(`🗑️  Catégorie orpheline "${orphanName}" supprimée`);
      totalDeleted++;
    } catch (err) {
      console.log(`⚠️  Impossible de supprimer "${orphanName}" (peut avoir des enfants)`);
    }
  }

  // ==========================================
  // 1. PANNEAUX 3 PLIS → Panneaux Bruts
  // ==========================================
  console.log('\n--- Panneaux 3 Plis ---');

  const panneaux3Plis = await prisma.category.findFirst({
    where: { id: 'cmkk0xat00007byo4d64h3pvq' }
  });

  // Chercher ou créer "3 Plis" sous Panneaux Bruts
  let target3Plis = await prisma.category.findFirst({
    where: {
      name: { contains: '3 Plis', mode: 'insensitive' },
      parent: { name: 'Panneaux Bruts' }
    }
  });

  if (!target3Plis) {
    // Chercher Panneaux Bruts
    const panneauxBruts = await prisma.category.findFirst({
      where: { name: 'Panneaux Bruts' },
      include: { catalogue: true }
    });

    if (panneauxBruts) {
      target3Plis = await prisma.category.create({
        data: {
          name: '3 Plis',
          slug: '3-plis',
          parentId: panneauxBruts.id,
          sortOrder: 99,
          catalogueId: panneauxBruts.catalogueId
        }
      });
      console.log(`📁 Catégorie "3 Plis" créée sous Panneaux Bruts`);
    }
  }

  if (panneaux3Plis && target3Plis) {
    await mergeCategory(panneaux3Plis.id, target3Plis.id, 'Panneaux 3 Plis', '3 Plis');
  }

  // ==========================================
  // 2. PANNEAUX ALVÉOLAIRES → Alvéolaires
  // ==========================================
  console.log('\n--- Panneaux Alvéolaires ---');

  const alveolaires = await prisma.category.findFirst({
    where: { name: 'Alvéolaires', parentId: null }
  });

  if (!alveolaires) {
    console.log('⚠️  Catégorie "Alvéolaires" non trouvée à la racine');
  } else {
    // Fusionner les deux orphelines
    const orphanAlv1 = await prisma.category.findUnique({ where: { id: 'cmkk0xb2g000bbyo4obnos30l' } });
    const orphanAlv2 = await prisma.category.findUnique({ where: { id: 'cmkk0xboj000hbyo4f49900xi' } });

    if (orphanAlv1) {
      await mergeCategory(orphanAlv1.id, alveolaires.id, 'Panneaux Alvéolaires (1)', 'Alvéolaires');
    }
    if (orphanAlv2) {
      await mergeCategory(orphanAlv2.id, alveolaires.id, 'Panneaux Alvéolaires (2)', 'Alvéolaires');
    }
  }

  // ==========================================
  // 3. PANNEAUX ISOLANTS → Isolants
  // ==========================================
  console.log('\n--- Panneaux Isolants ---');

  const isolants = await prisma.category.findFirst({
    where: { name: 'Isolants', parentId: null }
  });

  if (!isolants) {
    console.log('⚠️  Catégorie "Isolants" non trouvée à la racine');
  } else {
    const orphanIsolants = await prisma.category.findUnique({ where: { id: 'cmkk0xayj0009byo4jtfkojls' } });
    if (orphanIsolants) {
      await mergeCategory(orphanIsolants.id, isolants.id, 'Panneaux Isolants', 'Isolants');
    }
  }

  // ==========================================
  // 4. PANNEAUX MURAUX orpheline → Panneaux Muraux (sous Panneaux)
  // ==========================================
  console.log('\n--- Panneaux Muraux ---');

  const panneauxMurauxLegit = await prisma.category.findFirst({
    where: {
      name: 'Panneaux Muraux',
      parent: { name: 'Panneaux' }
    }
  });

  const orphanMuraux = await prisma.category.findUnique({
    where: { id: 'cmkk0xa2d0001byo4wg7vbi3g' },
    include: { children: true }
  });

  if (panneauxMurauxLegit && orphanMuraux) {
    await mergeCategory(orphanMuraux.id, panneauxMurauxLegit.id, 'Panneaux Muraux (orpheline)', 'Panneaux Muraux');
  }

  // ==========================================
  // 5. ACCESSOIRES MURAUX dupliquées → Fusionner
  // ==========================================
  console.log('\n--- Accessoires Muraux (dupliquées) ---');

  const accMuraux1 = await prisma.category.findUnique({
    where: { id: 'cmklonpdf0007bypgeq9qfk2g' },
    include: { _count: { select: { panels: true } } }
  });
  const accMuraux2 = await prisma.category.findUnique({
    where: { id: 'cmklopblk0001byfsxu6e8uxp' },
    include: { _count: { select: { panels: true } } }
  });

  if (accMuraux1 && accMuraux2) {
    // Garder celle avec le plus de panneaux
    const [keep, remove] = accMuraux1._count.panels >= accMuraux2._count.panels
      ? [accMuraux1, accMuraux2]
      : [accMuraux2, accMuraux1];

    await mergeCategory(remove.id, keep.id, 'Accessoires Muraux (doublon)', 'Accessoires Muraux');
  }

  // ==========================================
  // 6. ACCESSOIRES → Créer sous Panneaux ou garder
  // ==========================================
  console.log('\n--- Accessoires ---');

  const accessoires = await prisma.category.findUnique({
    where: { id: 'cmkmvlz870001by9gdjqwc6wr' },
    include: { _count: { select: { panels: true } }, children: true }
  });

  if (accessoires && accessoires._count.panels > 0) {
    // Vérifier s'il existe déjà une catégorie Accessoires dans l'arborescence
    const existingAccessoires = await prisma.category.findFirst({
      where: {
        name: 'Accessoires',
        parentId: { not: null }
      }
    });

    if (existingAccessoires) {
      await mergeCategory(accessoires.id, existingAccessoires.id, 'Accessoires (orpheline)', 'Accessoires');
    } else {
      // Rattacher à Panneaux
      const panneaux = await prisma.category.findFirst({ where: { name: 'Panneaux', parentId: null } });
      if (panneaux) {
        await prisma.category.update({
          where: { id: accessoires.id },
          data: { parentId: panneaux.id }
        });
        console.log(`📁 "Accessoires" rattachée à "Panneaux"`);
      }
    }
  }

  // ==========================================
  // 7. SUPPRIMER LES CATÉGORIES VIDES
  // ==========================================
  console.log('\n--- Suppression des catégories vides ---');

  const emptyOrphans = [
    'cmkk0xap40005byo410a9i3mn', // Panneaux Décoratifs
    'cmkk0xbh8000fbyo4yn0b245g', // Panneaux Lattés
  ];

  for (const id of emptyOrphans) {
    try {
      const cat = await prisma.category.findUnique({ where: { id } });
      if (cat) {
        await prisma.category.delete({ where: { id } });
        console.log(`🗑️  "${cat.name}" (vide) supprimée`);
        totalDeleted++;
      }
    } catch (err) {
      // Ignorer si déjà supprimée
    }
  }

  // ==========================================
  // 8. RÉFÉRENCES À VÉRIFIER - Garder pour l'instant
  // ==========================================
  console.log('\n--- Références à vérifier ---');
  console.log('ℹ️  Catégorie "Références à vérifier" conservée (3 panneaux à traiter manuellement)');

  // ==========================================
  // 9. PANNEAU SANS CATÉGORIE
  // ==========================================
  console.log('\n--- Panneau sans catégorie ---');

  const panelWithoutCat = await prisma.panel.findFirst({
    where: { categoryId: null },
    select: { id: true, reference: true, name: true, productType: true }
  });

  if (panelWithoutCat) {
    // C'est une colle, mettre dans Accessoires
    const accessoiresCat = await prisma.category.findFirst({
      where: { name: 'Accessoires' }
    });

    if (accessoiresCat) {
      await prisma.panel.update({
        where: { id: panelWithoutCat.id },
        data: { categoryId: accessoiresCat.id }
      });
      console.log(`✅ "${panelWithoutCat.reference}" assigné à Accessoires`);
      totalMoved++;
    }
  }

  // ==========================================
  // RÉSUMÉ FINAL
  // ==========================================
  console.log('\n\n========================================');
  console.log('           RÉSUMÉ FINAL');
  console.log('========================================\n');
  console.log(`✅ Panneaux déplacés: ${totalMoved}`);
  console.log(`🗑️  Catégories supprimées: ${totalDeleted}`);

  // Vérifier l'état final
  const remainingOrphans = await prisma.category.findMany({
    where: {
      parentId: null,
      name: {
        notIn: ['Panneaux', 'Chants', 'Feuilles & Placages', 'Compacts HPL', 'Alvéolaires', 'Isolants', 'Plans de Travail']
      }
    },
    include: { _count: { select: { panels: true } } }
  });

  console.log(`\nCatégories orphelines restantes: ${remainingOrphans.length}`);
  for (const cat of remainingOrphans) {
    console.log(`  - ${cat.name}: ${cat._count.panels} panneaux`);
  }

  const panelsWithoutCat = await prisma.panel.count({ where: { categoryId: null } });
  console.log(`Panneaux sans catégorie: ${panelsWithoutCat}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
