/**
 * Fusionne le catalogue "B comme Bois" dans "Bouney Agencement"
 * - Transfère tous les panels de B comme Bois vers Bouney
 * - Supprime les catégories en doublon de B comme Bois
 * - Supprime le catalogue B comme Bois
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('═'.repeat(60));
  console.log('🔄 FUSION DES CATALOGUES');
  console.log('═'.repeat(60));

  // Trouver les deux catalogues
  const bouney = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  const bcommebois = await prisma.catalogue.findFirst({
    where: { slug: 'bcommebois' }
  });

  if (!bouney) {
    console.log('❌ Catalogue Bouney non trouvé');
    await prisma.$disconnect();
    return;
  }

  if (!bcommebois) {
    console.log('ℹ️ Catalogue B comme Bois non trouvé - rien à fusionner');
    await prisma.$disconnect();
    return;
  }

  // Compter les panels dans chaque catalogue
  const bouneyCount = await prisma.panel.count({ where: { catalogueId: bouney.id } });
  const bcommeboisCount = await prisma.panel.count({ where: { catalogueId: bcommebois.id } });

  console.log(`\n📊 État actuel:`);
  console.log(`   Bouney Agencement: ${bouneyCount} panneaux`);
  console.log(`   B comme Bois: ${bcommeboisCount} panneaux`);

  // Transférer les panels de B comme Bois vers Bouney
  if (bcommeboisCount > 0) {
    console.log(`\n🔄 Transfert des ${bcommeboisCount} panneaux vers Bouney...`);

    const updated = await prisma.panel.updateMany({
      where: { catalogueId: bcommebois.id },
      data: { catalogueId: bouney.id }
    });

    console.log(`   ✅ ${updated.count} panneaux transférés`);
  }

  // Gérer les catégories: supprimer celles de B comme Bois (les panels sont déjà transférés)
  const bcbCategories = await prisma.category.findMany({
    where: { catalogueId: bcommebois.id }
  });

  if (bcbCategories.length > 0) {
    console.log(`\n🔄 Suppression des ${bcbCategories.length} catégories orphelines de B comme Bois...`);

    // D'abord mettre à jour les panels qui référencent ces catégories
    // pour qu'ils pointent vers les catégories équivalentes de Bouney
    for (const bcbCat of bcbCategories) {
      // Trouver la catégorie équivalente dans Bouney
      const bouneyCat = await prisma.category.findFirst({
        where: {
          catalogueId: bouney.id,
          slug: bcbCat.slug
        }
      });

      if (bouneyCat) {
        // Mettre à jour les panels qui pointent vers bcbCat pour pointer vers bouneyCat
        await prisma.panel.updateMany({
          where: { categoryId: bcbCat.id },
          data: { categoryId: bouneyCat.id }
        });
      }
    }

    // Supprimer les catégories de B comme Bois (enfants d'abord)
    await prisma.category.deleteMany({
      where: {
        catalogueId: bcommebois.id,
        parentId: { not: null }
      }
    });

    await prisma.category.deleteMany({
      where: { catalogueId: bcommebois.id }
    });

    console.log(`   ✅ Catégories supprimées`);
  }

  // Supprimer le catalogue B comme Bois (maintenant vide)
  console.log(`\n🗑️ Suppression du catalogue B comme Bois (vide)...`);
  await prisma.catalogue.delete({
    where: { id: bcommebois.id }
  });
  console.log(`   ✅ Catalogue supprimé`);

  // Renommer en "Bouney" si nécessaire
  if (bouney.name !== 'Bouney') {
    console.log(`\n✏️ Renommage du catalogue en "Bouney"...`);
    await prisma.catalogue.update({
      where: { id: bouney.id },
      data: { name: 'Bouney' }
    });
    console.log(`   ✅ Catalogue renommé`);
  }

  // Vérification finale
  const catalogues = await prisma.catalogue.findMany({
    include: { _count: { select: { panels: true } } }
  });

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ FUSION TERMINÉE`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`\n📊 État final:`);
  catalogues.forEach(c => {
    console.log(`   ${c.name} (${c.slug}): ${c._count.panels} panneaux`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
