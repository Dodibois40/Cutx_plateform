/**
 * ASSIGNATION PDT-SOLID-SURFACE vers sous-catégories
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== ASSIGNATION PDT-SOLID-SURFACE ===\n');

  const cat = await p.category.findFirst({ where: { slug: 'pdt-solid-surface' } });
  const children = await p.category.findMany({
    where: { parentId: cat.id },
    select: { id: true, slug: true }
  });

  const catMap = {};
  for (const c of children) catMap[c.slug] = c.id;

  console.log('Sous-catégories:', Object.keys(catMap).join(', '));

  const panels = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  console.log('Total: ' + panels.length + '\n');

  const assignments = {
    'Kerrock': [],
    'autres-solid-surface': []
  };

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    
    if (text.includes('kerrock')) {
      assignments['Kerrock'].push(panel.id);
    } else {
      assignments['autres-solid-surface'].push(panel.id);
    }
  }

  // Afficher distribution
  console.log('=== DISTRIBUTION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    console.log(slug.padEnd(22) + ': ' + ids.length);
  }

  // Assigner
  console.log('\n=== ASSIGNATION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length === 0 || !catMap[slug]) continue;

    await p.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap[slug] }
    });
    console.log('OK ' + slug + ': ' + ids.length);
  }

  const remaining = await p.panel.count({ where: { categoryId: cat.id } });
  console.log('\nRestant dans parent: ' + remaining);

  await p.$disconnect();
}

main().catch(console.error);
