import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CORRECTION DES CATÉGORIES CIMENT-BOIS DUPLIQUÉES ===\n');

  // La bonne catégorie est celle sous "Panneaux Spéciaux"
  const goodCat = await prisma.category.findFirst({
    where: {
      name: 'Ciment-Bois',
      parent: { name: 'Panneaux Spéciaux' }
    }
  });

  if (!goodCat) {
    console.error('Catégorie Ciment-Bois sous Panneaux Spéciaux non trouvée!');
    return;
  }

  console.log(`Catégorie cible: ${goodCat.name} (${goodCat.id})`);
  console.log(`  Parent: Panneaux Spéciaux\n`);

  // Trouver les catégories orphelines
  const orphanCats = await prisma.category.findMany({
    where: {
      name: 'Ciment-Bois',
      id: { not: goodCat.id }
    },
    include: {
      _count: { select: { panels: true } }
    }
  });

  console.log(`Catégories orphelines à fusionner: ${orphanCats.length}`);
  for (const cat of orphanCats) {
    console.log(`  - ${cat.id}: ${cat._count.panels} panneaux`);
  }

  // Déplacer tous les panneaux des catégories orphelines vers la bonne catégorie
  const orphanIds = orphanCats.map(c => c.id);

  const result = await prisma.panel.updateMany({
    where: { categoryId: { in: orphanIds } },
    data: { categoryId: goodCat.id }
  });

  console.log(`\n✅ ${result.count} panneaux déplacés vers la bonne catégorie`);

  // Supprimer les catégories orphelines (maintenant vides)
  for (const cat of orphanCats) {
    try {
      await prisma.category.delete({ where: { id: cat.id } });
      console.log(`✅ Catégorie orpheline ${cat.id} supprimée`);
    } catch (err) {
      console.error(`❌ Erreur suppression ${cat.id}:`, err);
    }
  }

  // Vérifier l'état final
  const finalCat = await prisma.category.findUnique({
    where: { id: goodCat.id },
    include: { _count: { select: { panels: true } } }
  });

  console.log(`\n=== ÉTAT FINAL ===`);
  console.log(`Ciment-Bois: ${finalCat?._count.panels} panneaux`);

  // Vérifier qu'il n'y a plus de doublons
  const remaining = await prisma.category.count({
    where: { name: 'Ciment-Bois' }
  });
  console.log(`Catégories "Ciment-Bois" restantes: ${remaining}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
