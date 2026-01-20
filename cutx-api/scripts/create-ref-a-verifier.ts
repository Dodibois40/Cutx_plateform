import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Création de la catégorie "Références à vérifier"...\n');

  // Trouver le catalogue CutX
  const cutx = await prisma.catalogue.findUnique({ where: { slug: 'cutx' } });
  if (!cutx) {
    console.error('❌ Catalogue CutX non trouvé');
    return;
  }
  console.log('✓ Catalogue CutX trouvé:', cutx.id);

  // Vérifier si la catégorie existe déjà
  const existing = await prisma.category.findFirst({
    where: { slug: 'ref-a-verifier', catalogueId: cutx.id },
  });

  if (existing) {
    console.log('ℹ️  Catégorie "ref-a-verifier" existe déjà:', existing.id);
    return;
  }

  // Créer la catégorie racine
  const category = await prisma.category.create({
    data: {
      name: 'Références à vérifier',
      slug: 'ref-a-verifier',
      sortOrder: 9999, // En bas de la liste
      catalogueId: cutx.id,
    },
  });

  console.log('✅ Catégorie créée:', category.id, '-', category.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
