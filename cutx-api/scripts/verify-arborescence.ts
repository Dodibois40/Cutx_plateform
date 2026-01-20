import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      name: true,
      slug: true,
      _count: { select: { children: true, panels: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log('=== CATÉGORIES RACINES ===\n');
  for (const r of roots) {
    console.log(`${r.name} (${r.slug})`);
    console.log(`   → ${r._count.children} sous-catégories, ${r._count.panels} panneaux`);
  }

  console.log('\n=== TOTAL ===');
  const total = await prisma.category.count();
  console.log(`${total} catégories au total`);
}

main().finally(() => prisma.$disconnect());
