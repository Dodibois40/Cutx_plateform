import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  console.log('CATÉGORIES RACINES (parentId = null):');
  console.log('Total:', roots.length);
  roots.forEach((r, i) => console.log(`${i + 1}. ${r.name} (${r.slug})`));
}

main().finally(() => prisma.$disconnect());
