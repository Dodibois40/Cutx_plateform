import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FUSION DES CATÉGORIES ORPHELINES ===\n');

  let totalMoved = 0;
  let totalDeleted = 0;

  // Helper pour déplacer les panneaux et supprimer la catégorie orpheline
  async function mergeAndDelete(orphanId: string, targetId: string, orphanName: string, targetName: string) {
    // Déplacer les panneaux
    const result = await prisma.panel.updateMany({
      where: { categoryId: orphanId },
      data: { categoryId: targetId }
    });

    if (result.count > 0) {
      console.log(`✅ ${result.count} panneaux: "${orphanName}" → "${targetName}"`);
      totalMoved += result.count;
    }

    // Déplacer les enfants aussi
    const children = await prisma.category.findMany({
      where: { parentId: orphanId }
    });

    for (const child of children) {
      // Déplacer les panneaux des enfants
      const childResult = await prisma.panel.updateMany({
        where: { categoryId: child.id },
        data: { categoryId: targetId }
      });
      if (childResult.count > 0) {
        console.log(`  ✅ ${childResult.count} panneaux de "${child.name}" → "${targetName}"`);
        totalMoved += childResult.count;
      }

      // Supprimer l'enfant orphelin
      await prisma.category.delete({ where: { id: child.id } }).catch(() => {});
      totalDeleted++;
    }

    // Supprimer la catégorie orpheline
    await prisma.category.delete({ where: { id: orphanId } }).catch(() => {});
    console.log(`🗑️  "${orphanName}" supprimée`);
    totalDeleted++;
  }

  // ==========================================
  // 1. PANNEAUX 3 PLIS
  // ==========================================
  console.log('\n--- Panneaux 3 Plis ---');

  // Chercher une catégorie 3 Plis existante dans l'arborescence
  let target3Plis = await prisma.category.findFirst({
    where: {
      OR: [
        { name: { contains: '3 Plis', mode: 'insensitive' } },
        { name: { contains: '3-Plis', mode: 'insensitive' } },
        { slug: { contains: '3-plis', mode: 'insensitive' } },
      ],
      parentId: { not: null } // Pas orpheline
    }
  });

  // Si pas trouvé, utiliser Panneaux Bruts comme fallback
  if (!target3Plis) {
    target3Plis = await prisma.category.findFirst({
      where: { name: 'Panneaux Bruts' }
    });
    console.log('ℹ️  Pas de catégorie 3 Plis trouvée, utilisation de Panneaux Bruts');
  }

  const orphan3Plis = await prisma.category.findUnique({ where: { id: 'cmkk0xat00007byo4d64h3pvq' } });
  if (orphan3Plis && target3Plis) {
    await mergeAndDelete(orphan3Plis.id, target3Plis.id, 'Panneaux 3 Plis', target3Plis.name);
  }

  // ==========================================
  // 2. PANNEAUX ALVÉOLAIRES → Alvéolaires
  // ==========================================
  console.log('\n--- Panneaux Alvéolaires ---');

  const alveolaires = await prisma.category.findFirst({
    where: { name: 'Alvéolaires', parentId: null }
  });

  if (alveolaires) {
    const orphanIds = ['cmkk0xb2g000bbyo4obnos30l', 'cmkk0xboj000hbyo4f49900xi'];
    for (const id of orphanIds) {
      const orphan = await prisma.category.findUnique({ where: { id } });
      if (orphan) {
        await mergeAndDelete(orphan.id, alveolaires.id, 'Panneaux Alvéolaires', 'Alvéolaires');
      }
    }
  }

  // ==========================================
  // 3. PANNEAUX ISOLANTS → Isolants
  // ==========================================
  console.log('\n--- Panneaux Isolants ---');

  const isolants = await prisma.category.findFirst({
    where: { name: 'Isolants', parentId: null }
  });

  if (isolants) {
    const orphan = await prisma.category.findUnique({ where: { id: 'cmkk0xayj0009byo4jtfkojls' } });
    if (orphan) {
      await mergeAndDelete(orphan.id, isolants.id, 'Panneaux Isolants', 'Isolants');
    }
  }

  // ==========================================
  // 4. PANNEAUX MURAUX orpheline → Panneaux Muraux légitimes
  // ==========================================
  console.log('\n--- Panneaux Muraux ---');

  const legitMuraux = await prisma.category.findFirst({
    where: { name: 'Panneaux Muraux', parent: { name: 'Panneaux' } }
  });

  const orphanMuraux = await prisma.category.findUnique({ where: { id: 'cmkk0xa2d0001byo4wg7vbi3g' } });

  if (legitMuraux && orphanMuraux) {
    await mergeAndDelete(orphanMuraux.id, legitMuraux.id, 'Panneaux Muraux (orpheline)', 'Panneaux Muraux');
  }

  // ==========================================
  // 5. ACCESSOIRES MURAUX dupliquées
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

    await mergeAndDelete(remove.id, keep.id, 'Accessoires Muraux (doublon)', 'Accessoires Muraux');
  }

  // ==========================================
  // 6. ACCESSOIRES → Rattacher à Panneaux
  // ==========================================
  console.log('\n--- Accessoires ---');

  const accessoires = await prisma.category.findUnique({
    where: { id: 'cmkmvlz870001by9gdjqwc6wr' }
  });

  if (accessoires) {
    const panneaux = await prisma.category.findFirst({ where: { name: 'Panneaux', parentId: null } });
    if (panneaux) {
      await prisma.category.update({
        where: { id: accessoires.id },
        data: { parentId: panneaux.id }
      });
      console.log(`📁 "Accessoires" rattachée à "Panneaux"`);
    }
  }

  // ==========================================
  // 7. SUPPRIMER CATÉGORIES VIDES ORPHELINES
  // ==========================================
  console.log('\n--- Suppression catégories vides ---');

  const emptyOrphans = [
    'cmkk0xap40005byo410a9i3mn', // Panneaux Décoratifs
    'cmkk0xbh8000fbyo4yn0b245g', // Panneaux Lattés
  ];

  for (const id of emptyOrphans) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (cat) {
      await prisma.category.delete({ where: { id } }).catch(() => {});
      console.log(`🗑️  "${cat.name}" (vide) supprimée`);
      totalDeleted++;
    }
  }

  // ==========================================
  // 8. PANNEAU SANS CATÉGORIE → Accessoires
  // ==========================================
  console.log('\n--- Panneau sans catégorie ---');

  const noCategory = await prisma.panel.findFirst({ where: { categoryId: null } });
  if (noCategory) {
    const acc = await prisma.category.findFirst({ where: { name: 'Accessoires' } });
    if (acc) {
      await prisma.panel.update({
        where: { id: noCategory.id },
        data: { categoryId: acc.id }
      });
      console.log(`✅ "${noCategory.reference}" → Accessoires`);
      totalMoved++;
    }
  }

  // ==========================================
  // RÉSUMÉ
  // ==========================================
  console.log('\n\n========================================');
  console.log('           RÉSUMÉ FINAL');
  console.log('========================================\n');
  console.log(`✅ Panneaux déplacés: ${totalMoved}`);
  console.log(`🗑️  Catégories supprimées: ${totalDeleted}`);

  // Vérifier l'état
  const orphans = await prisma.category.findMany({
    where: {
      parentId: null,
      name: { notIn: ['Panneaux', 'Chants', 'Feuilles & Placages', 'Compacts HPL', 'Alvéolaires', 'Isolants', 'Plans de Travail'] }
    },
    include: { _count: { select: { panels: true } } }
  });

  console.log(`\nCatégories orphelines restantes: ${orphans.length}`);
  for (const cat of orphans) {
    console.log(`  - ${cat.name}: ${cat._count.panels} panneaux`);
  }

  const noCat = await prisma.panel.count({ where: { categoryId: null } });
  console.log(`Panneaux sans catégorie: ${noCat}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
