import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    where: { slug: { contains: 'placage' } },
    select: { slug: true, name: true },
    orderBy: { slug: 'asc' }
  });

  console.log('Catégories placage existantes:\n');
  cats.forEach(c => console.log(`  ${c.slug} → ${c.name}`));

  await prisma.$disconnect();
}

main();
