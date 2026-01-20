/**
 * Assignation des PLACAGE aux catégories par essence
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Essences → slug
const ESSENCES = {
  'plaque-chene': ['chene', 'chêne', 'oak', 'eiche'],
  'plaque-noyer': ['noyer', 'walnut', 'nuss'],
  'plaque-hetre': ['hetre', 'hêtre', 'beech', 'buche'],
  'plaque-frene': ['frene', 'frêne', 'ash', 'esche'],
  'plaque-erable': ['erable', 'érable', 'maple', 'ahorn'],
  'plaque-merisier': ['merisier', 'cherry', 'kirsch'],
  'plaque-exotiques': ['sapelli', 'acajou', 'wenge', 'teck', 'teak', 'zebrano', 'palissandre', 'bambou', 'iroko', 'merbau', 'ipe', 'padouk']
};

async function main() {
  console.log('=== ASSIGNATION PLACAGE ===\n');

  // Charger les catégories
  const slugs = [...Object.keys(ESSENCES), 'panneaux-plaques-bois'];
  const cats = await p.category.findMany({
    where: { slug: { in: slugs } }
  });

  const catMap = {};
  for (const c of cats) {
    catMap[c.slug] = c.id;
  }

  console.log('Catégories chargées:', Object.keys(catMap));

  // Récupérer les placages
  const panels = await p.panel.findMany({
    where: { productType: 'PLACAGE', categoryId: null },
    select: { id: true, name: true, material: true }
  });

  console.log('Panneaux à traiter:', panels.length);

  // Classifier
  const assignments = {};
  for (const slug of slugs) {
    assignments[slug] = [];
  }

  for (const panel of panels) {
    let assigned = false;
    const text = (panel.name + ' ' + (panel.material || '')).toLowerCase();

    for (const [slug, keywords] of Object.entries(ESSENCES)) {
      for (const kw of keywords) {
        if (text.includes(kw)) {
          if (catMap[slug]) {
            assignments[slug].push(panel.id);
            assigned = true;
            break;
          }
        }
      }
      if (assigned) break;
    }

    // Fallback
    if (!assigned && catMap['panneaux-plaques-bois']) {
      assignments['panneaux-plaques-bois'].push(panel.id);
    }
  }

  // Afficher et assigner
  console.log('\n=== DISTRIBUTION ===');
  let total = 0;

  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length === 0) continue;

    await p.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap[slug] }
    });

    console.log('✅ ' + slug.padEnd(22) + ': ' + ids.length);
    total += ids.length;
  }

  console.log('\n✅ TOTAL PLACAGE assignés: ' + total);

  await p.$disconnect();
}

main().catch(console.error);
