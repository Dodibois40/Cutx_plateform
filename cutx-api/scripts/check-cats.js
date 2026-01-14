const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Get ALL categories with full hierarchy
  const cats = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      catalogueId: true,
      parentId: true,
      catalogue: { select: { name: true } },
      parent: { select: { name: true } }
    },
    orderBy: [{ catalogue: { name: 'asc' } }, { parent: { name: 'asc' } }, { name: 'asc' }]
  });

  // Group by parent for Bouney
  console.log('\n=== BOUNEY - Catégories par parent ===\n');
  const bouneyCats = cats.filter(c => c.catalogue?.name === 'Bouney');
  const byParent = {};
  bouneyCats.forEach(c => {
    const parent = c.parent?.name || '(Racine)';
    if (!byParent[parent]) byParent[parent] = [];
    byParent[parent].push(c.name);
  });

  Object.entries(byParent).sort((a, b) => a[0].localeCompare(b[0])).forEach(([parent, children]) => {
    console.log(`\n📁 ${parent}:`);
    [...new Set(children)].sort().forEach(child => console.log(`   - ${child}`));
  });

  console.log('\n\n=== DISPANO ===\n');
  const dispanoCats = cats.filter(c => c.catalogue?.name === 'Dispano');
  dispanoCats.forEach(c => {
    console.log(`- ${c.name} ${c.parent ? '(parent: ' + c.parent.name + ')' : ''}`);
  });
}
main().finally(() => prisma.$disconnect());
