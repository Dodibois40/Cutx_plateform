/**
 * ASSIGNATION ABS-BOIS vers sous-catégories par essence
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ESSENCES = [
  { slug: 'abs-chene', keywords: ['chêne', 'chene', 'oak'] },
  { slug: 'abs-noyer', keywords: ['noyer', 'walnut', 'nuss'] },
  { slug: 'abs-hetre', keywords: ['hêtre', 'hetre', 'beech'] },
  { slug: 'abs-frene', keywords: ['frêne', 'frene', 'ash'] },
];

async function main() {
  console.log('=== ASSIGNATION ABS-BOIS ===\n');

  const cat = await p.category.findFirst({ where: { slug: 'abs-bois' } });
  const children = await p.category.findMany({
    where: { parentId: cat.id },
    select: { id: true, slug: true }
  });

  const catMap = {};
  for (const c of children) catMap[c.slug] = c.id;

  console.log('Sous-catégories:', Object.keys(catMap).join(', '));

  const panels = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: { id: true, name: true }
  });

  console.log('Total: ' + panels.length + '\n');

  const assignments = {};
  for (const e of ESSENCES) assignments[e.slug] = [];
  assignments['reste'] = [];

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    let assigned = false;
    
    for (const e of ESSENCES) {
      if (e.keywords.some(kw => text.includes(kw)) && catMap[e.slug]) {
        assignments[e.slug].push(panel.id);
        assigned = true;
        break;
      }
    }
    
    if (!assigned) {
      assignments['reste'].push(panel.id);
    }
  }

  // Distribution
  console.log('=== DISTRIBUTION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    console.log(slug.padEnd(15) + ': ' + ids.length);
  }

  // Assigner seulement ceux qui ont une catégorie
  console.log('\n=== ASSIGNATION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    if (slug === 'reste' || ids.length === 0 || !catMap[slug]) continue;

    await p.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap[slug] }
    });
    console.log('OK ' + slug + ': ' + ids.length);
  }

  const remaining = await p.panel.count({ where: { categoryId: cat.id } });
  console.log('\nRestant dans abs-bois (autres essences): ' + remaining);

  await p.$disconnect();
}

main().catch(console.error);
