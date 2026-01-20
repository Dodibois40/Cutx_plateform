/**
 * Assignation des panneaux MELAMINE aux catégories décors
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Mapping decorCategory → slug
const DECOR_TO_SLUG = {
  'BOIS': 'decors-bois',
  'UNIS': 'decors-unis',
  'FANTAISIE': 'decors-fantaisie',
  'PIERRE': 'decors-pierre-beton',
  'BETON': 'decors-pierre-beton',
  'METAL': 'decors-metal',
  'TEXTILE': 'decors-metal',  // textile → metal (même catégorie)
  'SANS_DECOR': 'panneaux-decors', // fallback
};

// Mots-clés pour ceux sans decorCategory
const KEYWORDS = {
  'decors-bois': ['chene', 'chêne', 'oak', 'noyer', 'walnut', 'hetre', 'hêtre', 'frene', 'frêne', 'orme', 'acacia', 'bouleau', 'erable', 'érable', 'pin', 'sapin', 'teck', 'wenge', 'zebrano', 'bambou', 'merisier', 'cerisier'],
  'decors-unis': ['blanc', 'white', 'noir', 'black', 'gris', 'grey', 'gray', 'beige', 'anthracite', 'creme', 'crème', 'ivoire', 'magnolia', 'taupe', 'sable', 'cashmere', 'cachemire'],
  'decors-pierre-beton': ['marbre', 'marble', 'pierre', 'stone', 'beton', 'béton', 'concrete', 'ardoise', 'slate', 'granit', 'granite', 'terrazzo', 'travertin', 'onyx', 'calcaire'],
  'decors-metal': ['metal', 'métal', 'aluminium', 'bronze', 'inox', 'acier', 'steel', 'cuivre', 'copper', 'laiton', 'brass', 'or', 'gold', 'argent', 'silver', 'rouille', 'rust', 'oxyde', 'textile', 'tissu', 'lin', 'linen'],
  'decors-fantaisie': ['fantaisie', 'motif', 'pattern', 'geometrique', 'géométrique', 'rayure', 'stripe']
};

async function main() {
  console.log('=== ASSIGNATION MELAMINE ===\n');

  // Charger les catégories
  const cats = await p.category.findMany({
    where: {
      slug: { in: ['decors-bois', 'decors-unis', 'decors-fantaisie', 'decors-pierre-beton', 'decors-metal', 'panneaux-decors'] }
    }
  });

  const catMap = {};
  for (const c of cats) {
    catMap[c.slug] = c.id;
  }

  console.log('Catégories chargées:', Object.keys(catMap));

  // Récupérer tous les mélaminés non assignés
  const panels = await p.panel.findMany({
    where: { productType: 'MELAMINE', categoryId: null },
    select: { id: true, name: true, decorCategory: true, finish: true }
  });

  console.log('Panneaux à traiter:', panels.length);

  // Classifier
  const assignments = {
    'decors-bois': [],
    'decors-unis': [],
    'decors-fantaisie': [],
    'decors-pierre-beton': [],
    'decors-metal': [],
    'panneaux-decors': []  // fallback
  };

  for (const panel of panels) {
    let assigned = false;

    // 1. D'abord par decorCategory si présent
    if (panel.decorCategory && DECOR_TO_SLUG[panel.decorCategory]) {
      const slug = DECOR_TO_SLUG[panel.decorCategory];
      if (catMap[slug]) {
        assignments[slug].push(panel.id);
        assigned = true;
      }
    }

    // 2. Sinon par mots-clés dans le nom
    if (!assigned) {
      const text = (panel.name + ' ' + (panel.finish || '')).toLowerCase();

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
    }

    // 3. Fallback vers panneaux-decors
    if (!assigned && catMap['panneaux-decors']) {
      assignments['panneaux-decors'].push(panel.id);
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

  console.log('\n✅ TOTAL MELAMINE assignés: ' + total);

  await p.$disconnect();
}

main().catch(console.error);
