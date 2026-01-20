/**
 * ASSIGNATION PLANS-DE-TRAVAIL vers sous-catégories
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const BOIS_KW = ['chêne', 'chene', 'oak', 'hêtre', 'hetre', 'noyer', 'massif', 'bois'];
const COMPACT_KW = ['compact', 'hpl', 'fenix'];
const SOLID_KW = ['corian', 'solid', 'krion', 'kerrock', 'himacs'];

async function main() {
  console.log('=== ASSIGNATION PLANS-DE-TRAVAIL ===\n');

  const cat = await p.category.findFirst({ where: { slug: 'plans-de-travail' } });
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

  const assignments = {
    'pdt-bois-massif': [],
    'pdt-compacts': [],
    'pdt-solid-surface': [],
    'pdt-stratifies': []
  };

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    
    if (BOIS_KW.some(kw => text.includes(kw))) {
      assignments['pdt-bois-massif'].push(panel.id);
    }
    else if (COMPACT_KW.some(kw => text.includes(kw))) {
      assignments['pdt-compacts'].push(panel.id);
    }
    else if (SOLID_KW.some(kw => text.includes(kw))) {
      assignments['pdt-solid-surface'].push(panel.id);
    }
    else {
      // Par défaut = stratifié (Polyrey, Egger, etc.)
      assignments['pdt-stratifies'].push(panel.id);
    }
  }

  // Distribution
  console.log('=== DISTRIBUTION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    console.log(slug.padEnd(20) + ': ' + ids.length);
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
