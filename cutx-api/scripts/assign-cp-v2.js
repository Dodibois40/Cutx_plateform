/**
 * ASSIGNATION CONTREPLAQUES - Non classés -> cp-divers
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const RULES = [
  { slug: 'cp-antiderapant', keywords: ['antidérapant', 'antiderapant', 'tex', 'wire'] },
  { slug: 'cp-cintrable', keywords: ['cintrable', 'superform', 'poflex', 'flex'] },
  { slug: 'cp-filme', keywords: ['filmé', 'filme', 'coffrage', 'form'] },
  { slug: 'cp-marine-ctbx', keywords: ['ctbx', 'marine', 'extérieur', 'exterieur', 'classe 3', 'wbp'] },
  { slug: 'cp-bouleau', keywords: ['bouleau', 'birch', 'riga'] },
  { slug: 'cp-okoume', keywords: ['okoumé', 'okoume', 'okume'] },
  { slug: 'cp-peuplier', keywords: ['peuplier', 'poplar'] },
  { slug: 'cp-pin-maritime', keywords: ['pin', 'elliotis', 'radiata', 'sapin', 'résineux', 'resineux', 'epicéa', 'epicea', 'spruce'] },
  { slug: 'cp-exotique', keywords: ['sapelli', 'eucalyptus', 'ceiba', 'acajou', 'teck', 'exotique', 'import'] },
];

async function main() {
  console.log('=== ASSIGNATION CONTREPLAQUES ===\n');

  const cpCat = await p.category.findFirst({ where: { slug: 'contreplaques' } });
  const children = await p.category.findMany({
    where: { parentId: cpCat.id },
    select: { id: true, slug: true }
  });

  const catMap = {};
  for (const c of children) catMap[c.slug] = c.id;

  console.log('Sous-catégories:', Object.keys(catMap).join(', '));

  const panels = await p.panel.findMany({
    where: { categoryId: cpCat.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  console.log('Total: ' + panels.length + '\n');

  const assignments = {};
  for (const rule of RULES) assignments[rule.slug] = [];
  assignments['cp-divers'] = [];

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    let assigned = false;

    for (const rule of RULES) {
      for (const kw of rule.keywords) {
        if (text.includes(kw) && catMap[rule.slug]) {
          assignments[rule.slug].push(panel.id);
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }

    if (!assigned) {
      assignments['cp-divers'].push(panel.id);
    }
  }

  // Afficher distribution
  console.log('=== DISTRIBUTION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length > 0) console.log(slug.padEnd(20) + ': ' + ids.length);
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

  // Vérif
  const remaining = await p.panel.count({ where: { categoryId: cpCat.id } });
  console.log('\nRestant dans parent: ' + remaining);

  await p.$disconnect();
}

main().catch(console.error);
