/**
 * ASSIGNATION FEUILLES-STRATIFIEES vers sous-catégories
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Mots-clés pour identification
const BOIS_KW = ['chêne', 'chene', 'oak', 'noyer', 'walnut', 'hêtre', 'hetre', 'frêne', 'frene', 'pin', 'bouleau', 'birch', 'mélèze', 'meleze', 'teck', 'acacia', 'orme'];
const PIERRE_KW = ['pierre', 'stone', 'béton', 'beton', 'concrete', 'marbre', 'marble', 'ardoise', 'slate', 'métal', 'metal', 'acier', 'inox', 'alumin', 'cuivre', 'copper', 'zinc'];
const UNI_KW = ['blanc', 'white', 'noir', 'black', 'gris', 'grey', 'gray', 'beige', 'rouge', 'red', 'bleu', 'blue', 'vert', 'green', 'jaune', 'yellow', 'orange', 'rose', 'pink'];

async function main() {
  console.log('=== ASSIGNATION FEUILLES-STRATIFIEES ===\n');

  const cat = await p.category.findFirst({ where: { slug: 'feuilles-stratifiees' } });
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
    'fenix-strat': [],
    'strat-bois': [],
    'strat-pierre-metal': [],
    'strat-unis': [],
    'strat-fantaisie': []
  };

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    
    // Fenix
    if (text.includes('fenix')) {
      assignments['fenix-strat'].push(panel.id);
    }
    // Bois
    else if (BOIS_KW.some(kw => text.includes(kw))) {
      assignments['strat-bois'].push(panel.id);
    }
    // Pierre/métal
    else if (PIERRE_KW.some(kw => text.includes(kw))) {
      assignments['strat-pierre-metal'].push(panel.id);
    }
    // Unis (couleurs)
    else if (UNI_KW.some(kw => text.includes(kw))) {
      assignments['strat-unis'].push(panel.id);
    }
    // Fantaisie (tout le reste)
    else {
      assignments['strat-fantaisie'].push(panel.id);
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
