import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function migrate() {
  console.log('=== MIGRATION CP CHÊNE → PLACAGE ===\n');

  // Trouver la catégorie cible
  const placageChene = await prisma.category.findFirst({
    where: { slug: 'placage-chene' },
    select: { id: true, name: true }
  });

  if (!placageChene) {
    console.log('❌ Catégorie placage-chene non trouvée');
    await prisma.$disconnect();
    return;
  }

  console.log('✓ Catégorie cible:', placageChene.name);

  // Trouver le panneau
  const panel = await prisma.panel.findFirst({
    where: {
      name: { contains: 'Contreplaqué 2 faces Chêne', mode: 'insensitive' }
    },
    select: { id: true, name: true, productType: true, category: { select: { name: true } } }
  });

  if (!panel) {
    console.log('❌ Panneau non trouvé');
    await prisma.$disconnect();
    return;
  }

  console.log('\nPanneau trouvé:');
  console.log('  Nom:', panel.name?.substring(0, 60));
  console.log('  Type actuel:', panel.productType);
  console.log('  Catégorie actuelle:', panel.category?.name);

  // Migrer
  await prisma.panel.update({
    where: { id: panel.id },
    data: {
      categoryId: placageChene.id,
      productType: 'PLACAGE'
    }
  });

  console.log('\n✓ Panneau migré vers Placage Chêne avec type PLACAGE');

  // Vérifier
  const after = await prisma.panel.findUnique({
    where: { id: panel.id },
    select: { productType: true, category: { select: { name: true, slug: true } } }
  });

  console.log('\nAprès migration:');
  console.log('  Type:', after?.productType);
  console.log('  Catégorie:', after?.category?.name);

  await prisma.$disconnect();
}

migrate().catch(console.error);
