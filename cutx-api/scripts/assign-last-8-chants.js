const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Trouver la catégorie chants
  const chantsCategory = await prisma.category.findFirst({
    where: { slug: 'chants' }
  });

  if (!chantsCategory) {
    console.log('Catégorie chants non trouvée!');
    return;
  }

  console.log('Catégorie chants trouvée:', chantsCategory.id);

  // Assigner les 8 restants (HPL, MDF_BRUT)
  const result = await prisma.panel.updateMany({
    where: {
      categoryId: null,
      productType: 'BANDE_DE_CHANT',
      panelSubType: { in: ['HPL', 'MDF_BRUT'] }
    },
    data: { categoryId: chantsCategory.id }
  });

  console.log('Assignés à chants: ' + result.count);
  await prisma.$disconnect();
}

main().catch(console.error);
