/**
 * ASSIGNATION STRAT-BOIS vers sous-catégories
 * Les unis/fantaisie vont vers leurs catégories respectives
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const ESSENCES = [
  { slug: 'strat-chene', keywords: ['chêne', 'chene', 'oak'] },
  { slug: 'strat-noyer', keywords: ['noyer', 'walnut', 'nuss'] },
  { slug: 'strat-hetre', keywords: ['hêtre', 'hetre', 'beech'] },
  { slug: 'strat-frene', keywords: ['frêne', 'frene', 'ash'] },
  { slug: 'strat-pin', keywords: ['pin', 'sapin', 'douglas', 'mélèze', 'meleze'] },
  { slug: 'strat-chataigner', keywords: ['châtaign', 'chataign'] },
];

async function main() {
  console.log('=== ASSIGNATION STRAT-BOIS ===\n');

  const stratBois = await p.category.findFirst({ where: { slug: 'strat-bois' } });
  const stratUnis = await p.category.findFirst({ where: { slug: 'strat-unis' } });
  const stratFantaisie = await p.category.findFirst({ where: { slug: 'strat-fantaisie' } });

  // Charger toutes les sous-catégories
  const children = await p.category.findMany({
    where: { parentId: stratBois.id },
    select: { id: true, slug: true }
  });

  const catMap = {};
  for (const c of children) catMap[c.slug] = c.id;
  catMap['strat-unis'] = stratUnis.id;
  catMap['strat-fantaisie'] = stratFantaisie.id;

  console.log('Catégories cibles:', Object.keys(catMap).join(', '));

  const panels = await p.panel.findMany({
    where: { categoryId: stratBois.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  console.log('Total: ' + panels.length + '\n');

  const assignments = {};
  for (const e of ESSENCES) assignments[e.slug] = [];
  assignments['strat-unis'] = [];
  assignments['strat-fantaisie'] = [];
  assignments['reste'] = [];

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    let assigned = false;

    // D'abord essayer de trouver une essence
    for (const e of ESSENCES) {
      if (e.keywords.some(kw => text.includes(kw))) {
        assignments[e.slug].push(panel.id);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      // Vérifier si c'est un uni (blanc, gris, noir, etc.)
      if (text.includes('blanc') || text.includes('white') || text.includes('gris') || text.includes('grey') ||
          text.includes('noir') || text.includes('black') || text.includes('uni') || text.includes('solid') ||
          /\bu\d{3}\b/.test(text) || /\bw\d{4}\b/.test(text)) {
        assignments['strat-unis'].push(panel.id);
        assigned = true;
      }
    }

    if (!assigned) {
      // Le reste = fantaisie ou autres bois non listés
      assignments['strat-fantaisie'].push(panel.id);
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

  const remaining = await p.panel.count({ where: { categoryId: stratBois.id } });
  console.log('\nRestant dans strat-bois (parent): ' + remaining);

  await p.$disconnect();
}

main().catch(console.error);
