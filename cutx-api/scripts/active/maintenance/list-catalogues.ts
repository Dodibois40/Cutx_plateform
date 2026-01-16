import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.catalogue.findMany({
    select: { id: true, slug: true, name: true, isActive: true }
  });
  console.log('\n=== CATALOGUES ===\n');
  cats.forEach(c => {
    console.log(`${c.slug} | ${c.name} | active: ${c.isActive} | id: ${c.id}`);
  });
  await prisma.$disconnect();
}

main();
