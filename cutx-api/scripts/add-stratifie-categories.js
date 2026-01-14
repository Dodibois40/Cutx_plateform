const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the parent category "Stratifiés - Mélaminés - Compacts - Chants" for Bouney
  const parentCat = await prisma.category.findFirst({
    where: {
      name: 'Stratifiés - Mélaminés - Compacts - Chants',
      catalogue: { name: 'Bouney' }
    },
    include: { catalogue: true }
  });

  if (!parentCat) {
    console.log('Parent category not found!');
    return;
  }

  console.log('Found parent:', parentCat.name, '- Catalogue:', parentCat.catalogue.name);

  // Categories to add
  const newCategories = [
    'Stratifiés HPL',
    'Stratifiés HPL décors',
    'Stratifiés HPL unis',
    'Stratifiés HPL bois',
    'Mélaminés décors',
  ];

  for (const name of newCategories) {
    // Check if exists
    const existing = await prisma.category.findFirst({
      where: {
        name,
        catalogueId: parentCat.catalogueId,
        parentId: parentCat.id
      }
    });

    if (existing) {
      console.log('Already exists:', name);
    } else {
      const created = await prisma.category.create({
        data: {
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[éè]/g, 'e'),
          catalogueId: parentCat.catalogueId,
          parentId: parentCat.id,
        }
      });
      console.log('Created:', created.name, '(id:', created.id + ')');
    }
  }

  console.log('\nDone! New categories added under "Stratifiés - Mélaminés - Compacts - Chants"');
}

main().finally(() => prisma.$disconnect());
