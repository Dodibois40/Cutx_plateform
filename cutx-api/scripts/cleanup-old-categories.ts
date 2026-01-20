/**
 * Nettoyage des anciennes catégories
 *
 * Supprime les catégories des anciens catalogues (Barrillet, Bouney, Dispano)
 * qui ne sont plus utilisées depuis la migration vers CutX.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Nettoyage des anciennes catégories\n');
  console.log('='.repeat(50));

  // 1. Compter les catégories par catalogue AVANT
  const beforeCounts = await prisma.$queryRaw<{ slug: string; count: bigint }[]>`
    SELECT c.slug, COUNT(cat.id) as count
    FROM "Catalogue" c
    LEFT JOIN "Category" cat ON cat."catalogueId" = c.id
    GROUP BY c.slug
    ORDER BY c.slug
  `;

  console.log('\n📊 Catégories par catalogue AVANT:');
  for (const { slug, count } of beforeCounts) {
    console.log(`  ${slug}: ${count} catégories`);
  }

  // 2. Identifier les anciennes catégories (pas CutX)
  const oldCategories = await prisma.category.findMany({
    where: {
      catalogue: {
        slug: { not: 'cutx' },
      },
    },
    select: {
      id: true,
      name: true,
      catalogue: { select: { slug: true } },
    },
  });

  console.log(`\n⚠️ ${oldCategories.length} anciennes catégories à supprimer`);

  // 3. Vérifier qu'aucun panel n'est encore lié à ces catégories
  const panelsWithOldCategories = await prisma.panel.count({
    where: {
      category: {
        catalogue: {
          slug: { not: 'cutx' },
        },
      },
    },
  });

  if (panelsWithOldCategories > 0) {
    console.log(`\n❌ ERREUR: ${panelsWithOldCategories} panels sont encore liés à d'anciennes catégories!`);
    console.log('   Exécutez d\'abord la migration des panels.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('\n✅ Aucun panel lié aux anciennes catégories');

  // 4. Supprimer les anciennes catégories (enfants d'abord à cause des FK)
  console.log('\n🗑️ Suppression en cours...');

  // D'abord les enfants niveau 3 (niveau le plus profond)
  const level3Deleted = await prisma.category.deleteMany({
    where: {
      catalogue: { slug: { not: 'cutx' } },
      parent: {
        parent: { isNot: null }, // A un grand-parent = niveau 3
      },
    },
  });
  console.log(`  Niveau 3: ${level3Deleted.count} supprimées`);

  // Ensuite les enfants niveau 2
  const level2Deleted = await prisma.category.deleteMany({
    where: {
      catalogue: { slug: { not: 'cutx' } },
      parentId: { not: null },
    },
  });
  console.log(`  Niveau 2: ${level2Deleted.count} supprimées`);

  // Enfin les racines niveau 1
  const level1Deleted = await prisma.category.deleteMany({
    where: {
      catalogue: { slug: { not: 'cutx' } },
    },
  });
  console.log(`  Niveau 1: ${level1Deleted.count} supprimées`);

  // 5. Compter les catégories APRÈS
  const afterCounts = await prisma.$queryRaw<{ slug: string; count: bigint }[]>`
    SELECT c.slug, COUNT(cat.id) as count
    FROM "Catalogue" c
    LEFT JOIN "Category" cat ON cat."catalogueId" = c.id
    GROUP BY c.slug
    ORDER BY c.slug
  `;

  console.log('\n📊 Catégories par catalogue APRÈS:');
  for (const { slug, count } of afterCounts) {
    console.log(`  ${slug}: ${count} catégories`);
  }

  const totalDeleted = level3Deleted.count + level2Deleted.count + level1Deleted.count;
  console.log(`\n✅ ${totalDeleted} anciennes catégories supprimées`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Erreur:', e);
  prisma.$disconnect();
  process.exit(1);
});
