/**
 * ASSIGNATION LAMELLE-COLLE
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const RULES = [
  // Abouté Chêne (priorité sur non-abouté)
  { slug: 'lc-aboute-chene', keywords: ['chêne', 'chene'], condition: (text) => text.includes('abouté') || text.includes('aboute') || text.includes('3 plis chêne') || text.includes('3 plis chene') },
  // Non abouté Chêne
  { slug: 'lc-non-aboute-chene', keywords: ['chêne', 'chene'], condition: (text) => !text.includes('abouté') && !text.includes('aboute') },
  // Abouté Hêtre
  { slug: 'lc-aboute-hetre', keywords: ['hêtre', 'hetre'] },
  // Abouté Épicéa (inclut Douglas, résineux)
  { slug: 'lc-aboute-epicea', keywords: ['épicéa', 'epicea', 'douglas', 'sapin', 'résineux', 'resineux', 'pin'] },
];

async function main() {
  console.log('=== ASSIGNATION LAMELLE-COLLE ===\n');

  const cat = await p.category.findFirst({ where: { slug: 'lamelle-colle' } });
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

  const assignments = {};
  for (const rule of RULES) assignments[rule.slug] = [];
  assignments['lc-divers'] = [];

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    let assigned = false;

    for (const rule of RULES) {
      // Vérifier si le keyword est présent
      const hasKeyword = rule.keywords.some(kw => text.includes(kw));
      if (!hasKeyword) continue;

      // Vérifier condition supplémentaire si présente
      if (rule.condition && !rule.condition(text)) continue;

      if (catMap[rule.slug]) {
        assignments[rule.slug].push(panel.id);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      assignments['lc-divers'].push(panel.id);
    }
  }

  // Afficher distribution
  console.log('=== DISTRIBUTION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length > 0) console.log(slug.padEnd(22) + ': ' + ids.length);
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
