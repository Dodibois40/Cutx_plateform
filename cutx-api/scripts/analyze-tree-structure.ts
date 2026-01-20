import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  console.log('=== STRUCTURE ACTUELLE DE L\'ARBORESCENCE ===\n');

  // Récupérer toutes les catégories niveau 1 (sans parent)
  const rootCategories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      catalogue: { select: { name: true, slug: true } },
      children: {
        include: {
          children: true,
          _count: { select: { panels: { where: { isActive: true } } } }
        },
        orderBy: { name: 'asc' }
      },
      _count: { select: { panels: { where: { isActive: true } } } }
    },
    orderBy: { name: 'asc' }
  });

  for (const root of rootCategories) {
    const catalogueName = root.catalogue?.name || 'N/A';
    console.log(`\n📁 ${root.name} (${root.slug}) [${catalogueName}]`);
    console.log(`   Panneaux directs: ${root._count.panels}`);

    for (const child of root.children) {
      console.log(`   ├── ${child.name} (${child.slug})`);
      console.log(`   │   Panneaux: ${child._count.panels}`);

      for (const grandchild of child.children) {
        const gcCount = await prisma.panel.count({
          where: { categoryId: grandchild.id, isActive: true }
        });
        console.log(`   │   ├── ${grandchild.name} (${grandchild.slug}) - ${gcCount} panneaux`);
      }
    }
  }

  // Focus sur "Panneaux Décorés" et "Placages"
  console.log('\n\n=== FOCUS PANNEAUX DÉCORÉS ===');

  const decores = await prisma.category.findFirst({
    where: { slug: 'panneaux-decores' },
    include: {
      children: {
        include: {
          children: true,
          _count: { select: { panels: { where: { isActive: true } } } }
        }
      }
    }
  });

  if (decores) {
    console.log(`\n${decores.name} (ID: ${decores.id})`);
    for (const child of decores.children) {
      console.log(`  └── ${child.name} (${child.slug}) - ${child._count.panels} panneaux`);
      for (const gc of child.children) {
        const count = await prisma.panel.count({
          where: { categoryId: gc.id, isActive: true }
        });
        console.log(`      └── ${gc.name} (${gc.slug}) - ${count} panneaux`);
      }
    }
  }

  // Focus sur "Placages" actuel
  console.log('\n\n=== FOCUS PLACAGES ===');

  const placages = await prisma.category.findFirst({
    where: { slug: 'placages' },
    include: {
      parent: { select: { name: true, slug: true } },
      children: {
        include: {
          _count: { select: { panels: { where: { isActive: true } } } }
        }
      }
    }
  });

  if (placages) {
    console.log(`\n${placages.name} (ID: ${placages.id})`);
    console.log(`Parent: ${placages.parent?.name || 'AUCUN (niveau 1)'}`);

    let totalPlacages = 0;
    for (const child of placages.children) {
      console.log(`  └── ${child.name} (${child.slug}) - ${child._count.panels} panneaux`);
      totalPlacages += child._count.panels;
    }
    console.log(`\nTotal panneaux sous Placages: ${totalPlacages}`);
  }

  // Vérifier les mélaminés
  console.log('\n\n=== FOCUS MÉLAMINÉS ===');

  const melamines = await prisma.category.findFirst({
    where: { slug: 'melamines' },
    include: {
      parent: { select: { name: true, slug: true } },
      children: {
        include: {
          _count: { select: { panels: { where: { isActive: true } } } }
        }
      }
    }
  });

  if (melamines) {
    console.log(`\n${melamines.name} (ID: ${melamines.id})`);
    console.log(`Parent: ${melamines.parent?.name || 'AUCUN (niveau 1)'}`);

    for (const child of melamines.children) {
      console.log(`  └── ${child.name} (${child.slug}) - ${child._count.panels} panneaux`);
    }
  }

  // Vérifier les stratifiés
  console.log('\n\n=== FOCUS STRATIFIÉS ===');

  const stratifies = await prisma.category.findFirst({
    where: { slug: 'stratifies' },
    include: {
      parent: { select: { name: true, slug: true } },
      children: {
        include: {
          _count: { select: { panels: { where: { isActive: true } } } }
        }
      }
    }
  });

  if (stratifies) {
    console.log(`\n${stratifies.name} (ID: ${stratifies.id})`);
    console.log(`Parent: ${stratifies.parent?.name || 'AUCUN (niveau 1)'}`);

    for (const child of stratifies.children) {
      console.log(`  └── ${child.name} (${child.slug}) - ${child._count.panels} panneaux`);
    }
  }

  await prisma.$disconnect();
}

analyze().catch(console.error);
