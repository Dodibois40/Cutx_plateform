import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mdfCats = await prisma.category.findMany({
    where: { slug: { startsWith: 'mdf-' } },
    select: { slug: true, name: true, _count: { select: { panels: true } } },
    orderBy: { sortOrder: 'asc' }
  });

  console.log('=== Structure MDF finale ===\n');
  console.log('Slug'.padEnd(25) + 'Nom'.padEnd(25) + 'Panneaux');
  console.log('─'.repeat(60));

  let total = 0;
  for (const c of mdfCats) {
    console.log(`${c.slug.padEnd(25)}${c.name.padEnd(25)}${c._count.panels}`);
    total += c._count.panels;
  }

  console.log('─'.repeat(60));
  console.log(`${'TOTAL'.padEnd(50)}${total}`);

  await prisma.$disconnect();
}
main().catch(console.error);
