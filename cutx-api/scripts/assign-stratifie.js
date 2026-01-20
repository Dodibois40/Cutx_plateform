/**
 * Assignation des STRATIFIE aux catégories
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Mots-clés pour classification
const KEYWORDS = {
  'strat-bois': ['chene', 'chêne', 'oak', 'noyer', 'walnut', 'hetre', 'hêtre', 'frene', 'frêne', 'orme', 'acacia', 'bouleau', 'erable', 'érable', 'pin', 'sapin', 'teck', 'wenge', 'zebrano', 'bambou', 'merisier', 'cerisier', 'bois', 'wood'],
  'strat-unis': ['blanc', 'white', 'noir', 'black', 'gris', 'grey', 'gray', 'beige', 'anthracite', 'creme', 'crème', 'ivoire', 'magnolia', 'taupe', 'sable', 'cashmere', 'uni', 'unis', 'solid'],
  'strat-pierre-metal': ['marbre', 'marble', 'pierre', 'stone', 'beton', 'béton', 'concrete', 'ardoise', 'slate', 'granit', 'metal', 'métal', 'aluminium', 'bronze', 'inox', 'acier', 'cuivre', 'terrazzo'],
  'strat-fantaisie': ['fantaisie', 'motif', 'pattern', 'geometrique', 'géométrique', 'rayure', 'textile', 'tissu', 'lin']
};

async function main() {
  console.log('=== ASSIGNATION STRATIFIE ===\n');

  // Charger les catégories
  const cats = await p.category.findMany({
    where: {
      slug: { in: ['strat-bois', 'strat-unis', 'strat-pierre-metal', 'strat-fantaisie', 'feuilles-stratifiees'] }
    }
  });

  const catMap = {};
  for (const c of cats) {
    catMap[c.slug] = c.id;
  }

  console.log('Catégories chargées:', Object.keys(catMap));

  // Récupérer tous les stratifiés non assignés
  const panels = await p.panel.findMany({
    where: { productType: 'STRATIFIE', categoryId: null },
    select: { id: true, name: true, decorCategory: true, finish: true, description: true }
  });

  console.log('Panneaux à traiter:', panels.length);

  // Classifier
  const assignments = {
    'strat-bois': [],
    'strat-unis': [],
    'strat-pierre-metal': [],
    'strat-fantaisie': [],
    'feuilles-stratifiees': []  // fallback
  };

  for (const panel of panels) {
    let assigned = false;
    const text = (panel.name + ' ' + (panel.finish || '') + ' ' + (panel.description || '')).toLowerCase();

    // Par mots-clés
    for (const [slug, keywords] of Object.entries(KEYWORDS)) {
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
    if (!assigned && catMap['feuilles-stratifiees']) {
      assignments['feuilles-stratifiees'].push(panel.id);
    }
  }

  // Afficher la distribution
  console.log('\n=== DISTRIBUTION ===');
  for (const [slug, ids] of Object.entries(assignments)) {
    console.log(slug.padEnd(25) + ': ' + ids.length);
  }

  // Exécuter les assignations
  console.log('\n=== ASSIGNATION ===');
  let total = 0;

  for (const [slug, ids] of Object.entries(assignments)) {
    if (ids.length === 0) continue;

    await p.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap[slug] }
    });

    console.log('✅ ' + slug + ': ' + ids.length);
    total += ids.length;
  }

  console.log('\n✅ TOTAL STRATIFIE assignés: ' + total);

  await p.$disconnect();
}

main().catch(console.error);
