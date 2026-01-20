import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check panels per category for CutX
  const categories = await prisma.category.findMany({
    where: {
      catalogue: { slug: 'cutx' },
    },
    include: {
      _count: { select: { panels: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  console.log('Catégories CutX avec panels:');
  for (const cat of categories) {
    if (cat._count.panels > 0) {
      console.log(`  ${cat.name} [${cat.slug}]: ${cat._count.panels}`);
    }
  }

  // Total panels with CutX categories
  const total = await prisma.panel.count({
    where: {
      isActive: true,
      category: { catalogue: { slug: 'cutx' } },
    },
  });
  console.log('\nTotal panels dans catégories CutX:', total);

  // Check a few panels to see their category
  const samples = await prisma.panel.findMany({
    where: {
      isActive: true,
      categoryId: { not: null },
    },
    select: {
      name: true,
      category: {
        select: { name: true, slug: true, catalogue: { select: { slug: true } } },
      },
    },
    take: 5,
  });

  console.log('\nExemples de panels avec catégorie:');
  for (const p of samples) {
    console.log(`  ${p.name} → ${p.category?.name} (${p.category?.catalogue?.slug})`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
