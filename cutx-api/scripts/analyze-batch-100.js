/**
 * Analyse détaillée des 100 premiers panneaux d'une catégorie
 * pour comprendre les patterns de nommage
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const CATEGORY_SLUG = process.argv[2] || 'contreplaques';
const OFFSET = parseInt(process.argv[3]) || 0;
const LIMIT = 100;

async function main() {
  const cat = await p.category.findFirst({ where: { slug: CATEGORY_SLUG } });
  if (!cat) {
    console.log('Catégorie non trouvée:', CATEGORY_SLUG);
    return;
  }

  // Sous-catégories disponibles
  const children = await p.category.findMany({
    where: { parentId: cat.id },
    select: { id: true, slug: true, name: true }
  });

  console.log('=== ANALYSE: ' + CATEGORY_SLUG.toUpperCase() + ' ===');
  console.log('Offset:', OFFSET, '| Limit:', LIMIT);
  console.log('\nSous-catégories disponibles:');
  for (const c of children) {
    console.log('  - ' + c.slug + ' (' + c.name + ')');
  }

  // Récupérer les panneaux
  const panels = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: {
      id: true,
      name: true,
      reference: true,
      material: true,
      finish: true,
      panelSubType: true,
      description: true,
      supplier: { select: { name: true } }
    },
    orderBy: { name: 'asc' },
    skip: OFFSET,
    take: LIMIT
  });

  console.log('\n=== PANNEAUX ' + (OFFSET + 1) + '-' + (OFFSET + panels.length) + ' ===\n');

  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    const num = (OFFSET + i + 1).toString().padStart(3, '0');
    console.log(num + '. ' + p.name);
    console.log('     Ref: ' + p.reference);
    if (p.material) console.log('     Mat: ' + p.material);
    if (p.finish) console.log('     Fin: ' + p.finish);
    if (p.panelSubType) console.log('     Sub: ' + p.panelSubType);
    if (p.supplier?.name) console.log('     Sup: ' + p.supplier.name);
    console.log('');
  }

  await p.$disconnect();
}

main().catch(console.error);
