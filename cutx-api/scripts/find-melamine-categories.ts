import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find categories related to melamine and wood decor
  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'bois', mode: 'insensitive' } },
        { name: { contains: 'décor', mode: 'insensitive' } },
        { name: { contains: 'melamin', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { name: true } },
      _count: { select: { panels: true } },
    },
  });

  console.log('Categories found:');
  for (const c of cats) {
    const parentName = c.parent?.name || 'ROOT';
    console.log(`- ${c.name} (parent: ${parentName}) - ${c._count.panels} panels`);
    console.log(`  ID: ${c.id}`);
    console.log(`  Slug: ${c.slug}`);
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
