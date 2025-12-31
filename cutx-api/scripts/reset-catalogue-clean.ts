/**
 * Reset propre du catalogue Bouney
 * - Supprime TOUS les panneaux
 * - Garde les catégories (architecture)
 * - S'assure que le catalogue s'appelle "Bouney"
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('═'.repeat(60));
  console.log('🗑️  RESET PROPRE DU CATALOGUE BOUNEY');
  console.log('═'.repeat(60));

  // Trouver le catalogue
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.log('❌ Catalogue Bouney non trouvé');
    await prisma.$disconnect();
    return;
  }

  // Stats avant suppression
  const panelCount = await prisma.panel.count({
    where: { catalogueId: catalogue.id }
  });

  const categoryCount = await prisma.category.count({
    where: { catalogueId: catalogue.id }
  });

  console.log(`\n📊 État actuel:`);
  console.log(`   Catalogue: ${catalogue.name} (${catalogue.slug})`);
  console.log(`   Panneaux: ${panelCount}`);
  console.log(`   Catégories: ${categoryCount}`);

  // Confirmation
  console.log(`\n⚠️  SUPPRESSION DE ${panelCount} PANNEAUX...`);

  // Supprimer tous les panneaux
  const deleted = await prisma.panel.deleteMany({
    where: { catalogueId: catalogue.id }
  });

  console.log(`   ✅ ${deleted.count} panneaux supprimés`);

  // S'assurer que le nom est "Bouney"
  if (catalogue.name !== 'Bouney') {
    await prisma.catalogue.update({
      where: { id: catalogue.id },
      data: { name: 'Bouney' }
    });
    console.log(`   ✅ Catalogue renommé en "Bouney"`);
  }

  // Vérification finale
  const finalPanelCount = await prisma.panel.count({
    where: { catalogueId: catalogue.id }
  });

  const finalCategoryCount = await prisma.category.count({
    where: { catalogueId: catalogue.id }
  });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ RESET TERMINÉ`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`\n📊 État final:`);
  console.log(`   Catalogue: Bouney`);
  console.log(`   Panneaux: ${finalPanelCount}`);
  console.log(`   Catégories: ${finalCategoryCount} (conservées)`);

  // Lister les catégories principales
  console.log(`\n📁 Architecture conservée:`);
  const mainCategories = await prisma.category.findMany({
    where: { catalogueId: catalogue.id, parentId: null },
    include: { _count: { select: { children: true } } },
    orderBy: { name: 'asc' }
  });

  mainCategories.forEach(cat => {
    console.log(`   📂 ${cat.name} (${cat._count.children} sous-catégories)`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
