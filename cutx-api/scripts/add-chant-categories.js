const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ===== BOUNEY =====
  // Find parent "Stratifiés - Mélaminés - Compacts - Chants" for Bouney
  const bParent = await prisma.category.findFirst({
    where: {
      name: 'Stratifiés - Mélaminés - Compacts - Chants',
      catalogue: { name: 'Bouney' }
    },
    include: { catalogue: true }
  });

  if (bParent) {
    console.log('=== BOUNEY ===');
    const bCategories = [
      'Chants unis',
      'Chants décors bois',
      'Chants décors fantaisie',
      'Chants décors pierre',
    ];

    for (const name of bCategories) {
      const exists = await prisma.category.findFirst({
        where: { name, catalogueId: bParent.catalogueId, parentId: bParent.id }
      });
      if (exists) {
        console.log('  Exists:', name);
      } else {
        const c = await prisma.category.create({
          data: {
            name,
            slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'),
            catalogueId: bParent.catalogueId,
            parentId: bParent.id,
          }
        });
        console.log('  Created:', c.name);
      }
    }
  }

  // ===== DISPANO =====
  // For Dispano, create a parent category for Chants if needed
  const dispano = await prisma.catalogue.findFirst({ where: { name: 'Dispano' } });

  if (dispano) {
    console.log('\n=== DISPANO ===');

    // Check if Chants parent exists
    let dParent = await prisma.category.findFirst({
      where: { name: 'Chants', catalogueId: dispano.id, parentId: null }
    });

    if (!dParent) {
      dParent = await prisma.category.create({
        data: {
          name: 'Chants',
          slug: 'chants',
          catalogueId: dispano.id,
        }
      });
      console.log('  Created parent: Chants');
    }

    const dCategories = [
      'Chants ABS',
      'Chants PVC',
      'Chants unis',
      'Chants décors bois',
      'Chants décors fantaisie',
    ];

    for (const name of dCategories) {
      const exists = await prisma.category.findFirst({
        where: { name, catalogueId: dispano.id, parentId: dParent.id }
      });
      if (exists) {
        console.log('  Exists:', name);
      } else {
        const c = await prisma.category.create({
          data: {
            name,
            slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'),
            catalogueId: dispano.id,
            parentId: dParent.id,
          }
        });
        console.log('  Created:', c.name);
      }
    }
  }

  console.log('\nDone!');
}

main().finally(() => prisma.$disconnect());
