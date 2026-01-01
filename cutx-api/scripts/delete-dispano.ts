import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Suppression du catalogue Dispano...');

  const dispano = await prisma.catalogue.findUnique({
    where: { slug: 'dispano' }
  });

  if (!dispano) {
    console.log('ℹ️  Catalogue Dispano non trouvé');
  } else {
    // Supprimer les panels
    const deletedPanels = await prisma.panel.deleteMany({
      where: { catalogueId: dispano.id }
    });
    console.log(`   ✅ ${deletedPanels.count} panneaux supprimés`);

    // Supprimer les catégories
    const deletedCategories = await prisma.category.deleteMany({
      where: { catalogueId: dispano.id }
    });
    console.log(`   ✅ ${deletedCategories.count} catégories supprimées`);

    // Supprimer le catalogue
    await prisma.catalogue.delete({
      where: { id: dispano.id }
    });
    console.log('   ✅ Catalogue Dispano supprimé');
  }

  // Vérifier Bouney intact
  const bouney = await prisma.panel.count({ where: { catalogue: { slug: 'bouney' } } });
  console.log(`\n📦 Bouney intact: ${bouney} panneaux`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
