/**
 * PREVIEW de la redistribution des contreplaqués
 * Analyse la distribution SANS modifier la base
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Règles de classification (ordre de priorité)
const RULES = [
  // 1. Spécialités (priorité haute)
  { slug: 'cp-antiderapant', keywords: ['antidérapant', 'antiderapant', 'tex', 'wire'] },
  { slug: 'cp-cintrable', keywords: ['cintrable', 'superform', 'poflex', 'flex'] },
  { slug: 'cp-filme', keywords: ['filmé', 'filme', 'coffrage', 'form'] },
  { slug: 'cp-marine-ctbx', keywords: ['ctbx', 'marine', 'extérieur', 'exterieur', 'classe 3', 'wbp'] },

  // 2. Essences (priorité normale)
  { slug: 'cp-bouleau', keywords: ['bouleau', 'birch', 'riga'] },
  { slug: 'cp-okoume', keywords: ['okoumé', 'okoume', 'okume'] },
  { slug: 'cp-peuplier', keywords: ['peuplier', 'poplar'] },
  { slug: 'cp-pin-maritime', keywords: ['pin', 'elliotis', 'radiata', 'sapin', 'résineux', 'resineux', 'epicéa', 'epicea', 'spruce'] },
  { slug: 'cp-exotique', keywords: ['sapelli', 'eucalyptus', 'ceiba', 'acajou', 'teck', 'exotique', 'import'] },
];

async function main() {
  const cpCat = await p.category.findFirst({ where: { slug: 'contreplaques' } });

  // Charger les sous-catégories
  const children = await p.category.findMany({
    where: { parentId: cpCat.id },
    select: { id: true, slug: true, name: true }
  });

  const catMap = {};
  for (const c of children) {
    catMap[c.slug] = { id: c.id, name: c.name, count: 0, examples: [] };
  }

  // Récupérer tous les CP
  const panels = await p.panel.findMany({
    where: { categoryId: cpCat.id },
    select: { id: true, name: true, reference: true }
  });

  console.log('=== PREVIEW REDISTRIBUTION CONTREPLAQUES ===');
  console.log('Total à traiter:', panels.length);
  console.log('\n');

  const assignments = {};
  for (const rule of RULES) {
    assignments[rule.slug] = [];
  }
  assignments['non-classé'] = [];

  // Classifier chaque panneau
  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    let assigned = false;

    for (const rule of RULES) {
      for (const kw of rule.keywords) {
        if (text.includes(kw)) {
          assignments[rule.slug].push(panel);
          assigned = true;
          break;
        }
      }
      if (assigned) break;
    }

    if (!assigned) {
      assignments['non-classé'].push(panel);
    }
  }

  // Afficher la distribution
  console.log('=== DISTRIBUTION PREVUE ===\n');

  let total = 0;
  for (const [slug, items] of Object.entries(assignments)) {
    if (items.length === 0) continue;

    const catInfo = catMap[slug];
    const catName = catInfo ? catInfo.name : 'Non classé';

    console.log(`${slug.padEnd(20)} : ${items.length.toString().padStart(4)} panneaux (${catName})`);
    total += items.length;

    // Montrer 3 exemples
    console.log('   Exemples:');
    for (const ex of items.slice(0, 3)) {
      console.log('   - ' + ex.name.substring(0, 60));
    }
    console.log('');
  }

  console.log('=== TOTAL ===');
  console.log('Classés:', total - assignments['non-classé'].length);
  console.log('Non classés:', assignments['non-classé'].length);
  console.log('Total:', total);

  // Si non-classés, montrer tous les exemples
  if (assignments['non-classé'].length > 0 && assignments['non-classé'].length <= 30) {
    console.log('\n=== DETAILS NON-CLASSES ===');
    for (const p of assignments['non-classé']) {
      console.log('- ' + p.name);
    }
  }

  await p.$disconnect();
}

main().catch(console.error);
