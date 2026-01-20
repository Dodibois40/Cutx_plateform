import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FUSION DES ORPHELINS RESTANTS ===\n');

  let totalMoved = 0;
  let totalDeleted = 0;

  // Helper
  async function mergeAndDelete(orphanId: string, targetId: string, orphanName: string, targetName: string) {
    const result = await prisma.panel.updateMany({
      where: { categoryId: orphanId },
      data: { categoryId: targetId }
    });
    if (result.count > 0) {
      console.log(`✅ ${result.count} panneaux: "${orphanName}" → "${targetName}"`);
      totalMoved += result.count;
    }
    await prisma.category.delete({ where: { id: orphanId } }).catch(() => {});
    console.log(`🗑️  "${orphanName}" supprimée`);
    totalDeleted++;
  }

  // ==========================================
  // 1. PANNEAUX ISOLANTS → Isolants (sous Panneaux Spéciaux)
  // ==========================================
  console.log('--- Panneaux Isolants ---');

  const isolantsLegit = await prisma.category.findFirst({
    where: {
      name: 'Isolants',
      parent: { name: 'Panneaux Spéciaux' }
    }
  });

  if (isolantsLegit) {
    const orphan = await prisma.category.findUnique({ where: { id: 'cmkk0xayj0009byo4jtfkojls' } });
    if (orphan) {
      await mergeAndDelete(orphan.id, isolantsLegit.id, 'Panneaux Isolants', 'Isolants');
    }
  } else {
    console.log('⚠️  Catégorie Isolants non trouvée sous Panneaux Spéciaux');
  }

  // ==========================================
  // 2. PANNEAUX ALVÉOLAIRES → Alvéolaires (sous Panneaux Spéciaux)
  // ==========================================
  console.log('\n--- Panneaux Alvéolaires ---');

  const alveolairesLegit = await prisma.category.findFirst({
    where: {
      name: 'Alvéolaires',
      parent: { name: 'Panneaux Spéciaux' }
    }
  });

  if (alveolairesLegit) {
    const orphanIds = ['cmkk0xb2g000bbyo4obnos30l', 'cmkk0xboj000hbyo4f49900xi'];
    for (const id of orphanIds) {
      const orphan = await prisma.category.findUnique({ where: { id } });
      if (orphan) {
        await mergeAndDelete(orphan.id, alveolairesLegit.id, 'Panneaux Alvéolaires', 'Alvéolaires');
      }
    }
  } else {
    console.log('⚠️  Catégorie Alvéolaires non trouvée sous Panneaux Spéciaux');
  }

  // ==========================================
  // 3. RÉFÉRENCES À VÉRIFIER - Rattacher à Panneaux pour être visible
  // ==========================================
  console.log('\n--- Références à vérifier ---');

  const refsAVerifier = await prisma.category.findUnique({ where: { id: 'cmkmwn1co0001byi0602j40mi' } });
  if (refsAVerifier) {
    const panneaux = await prisma.category.findFirst({ where: { name: 'Panneaux', parentId: null } });
    if (panneaux) {
      await prisma.category.update({
        where: { id: refsAVerifier.id },
        data: { parentId: panneaux.id }
      });
      console.log(`📁 "Références à vérifier" rattachée à "Panneaux"`);
    }
  }

  // ==========================================
  // RÉSUMÉ
  // ==========================================
  console.log('\n========================================');
  console.log('           RÉSUMÉ');
  console.log('========================================\n');
  console.log(`✅ Panneaux déplacés: ${totalMoved}`);
  console.log(`🗑️  Catégories supprimées: ${totalDeleted}`);

  // État final
  const orphans = await prisma.category.findMany({
    where: { parentId: null },
    include: { _count: { select: { panels: true } } },
    orderBy: { name: 'asc' }
  });

  console.log('\n=== CATÉGORIES RACINES FINALES ===\n');
  for (const cat of orphans) {
    console.log(`${cat.name}: ${cat._count.panels} panneaux`);
  }

  const noCat = await prisma.panel.count({ where: { categoryId: null } });
  console.log(`\nPanneaux sans catégorie: ${noCat}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
