import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Trouver une catégorie placage existante pour connaître le parent
  const existingPlacage = await prisma.category.findFirst({
    where: { slug: 'placage-chene' },
    select: { id: true, parentId: true, catalogueId: true }
  });

  console.log('Catégorie placage-chene:', existingPlacage);

  if (!existingPlacage) {
    console.log('❌ Impossible de trouver placage-chene');
    return;
  }

  // Vérifier si placage-pin existe
  const existing = await prisma.category.findFirst({ where: { slug: 'placage-pin' } });
  if (existing) {
    console.log('ℹ️ placage-pin existe déjà:', existing.id);
    return;
  }

  // Créer placage-pin avec le même parent que placage-chene
  const newCat = await prisma.category.create({
    data: {
      name: 'Placage Pin',
      slug: 'placage-pin',
      parentId: existingPlacage.parentId,
      catalogueId: existingPlacage.catalogueId
    }
  });

  console.log('✅ Catégorie placage-pin créée:', newCat.id);

  // Déplacer les panneaux pin
  const result = await prisma.panel.updateMany({
    where: {
      OR: [
        { name: { contains: 'Contreplaqué pin', mode: 'insensitive' } },
        { name: { contains: 'placage pin', mode: 'insensitive' } }
      ],
      productType: 'PLACAGE'
    },
    data: { categoryId: newCat.id }
  });

  console.log(`✅ ${result.count} panneaux déplacés vers placage-pin`);

  await prisma.$disconnect();
}

main().catch(console.error);
