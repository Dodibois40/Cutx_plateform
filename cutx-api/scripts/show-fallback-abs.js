const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const cat = await p.category.findFirst({ where: { slug: 'chants-abs' } });

  const examples = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: { reference: true, name: true, decorCategory: true },
    take: 15
  });

  console.log('=== EXEMPLES CHANTS ABS (fallback) - 15 premiers ===\n');
  for (const e of examples) {
    console.log(e.reference.padEnd(25) + '| decor: ' + (e.decorCategory || 'null').padEnd(12) + '| ' + e.name.substring(0, 50));
  }

  await p.$disconnect();
}
main();
