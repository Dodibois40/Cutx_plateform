/**
 * ASSIGNATION CHANTS-ABS vers sous-catégories
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const BOIS_KW = ['chêne', 'chene', 'oak', 'noyer', 'walnut', 'hêtre', 'hetre', 'frêne', 'frene', 'pin', 'bouleau', 'birch', 'mélèze', 'meleze', 'teck', 'acacia', 'orme', 'châtaign', 'chataign', 'cerisier', 'ébène', 'ebene', 'eucalyptus', 'coco', 'fineline', 'epicéa', 'epicea', 'bambou', 'wenge'];
const PIERRE_KW = ['pierre', 'stone', 'béton', 'beton', 'concrete', 'marbre', 'marble', 'ardoise', 'slate', 'granit'];
const METAL_KW = ['métal', 'metal', 'acier', 'inox', 'alumin', 'cuivre', 'copper', 'zinc', 'chrome', 'chromix', 'argent', 'silver', 'brossé', 'brosse'];
const UNI_KW = ['blanc', 'white', 'noir', 'black', 'gris', 'grey', 'gray', 'beige', 'rouge', 'red', 'bleu', 'blue', 'vert', 'green', 'jaune', 'yellow', 'orange', 'rose', 'pink', 'crème', 'creme', 'cream', 'écru', 'ecru', 'taupe', 'nude'];

async function main() {
  console.log('=== ASSIGNATION CHANTS-ABS ===\n');

  const cat = await p.category.findFirst({ where: { slug: 'chants-abs' } });
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
    'abs-bois': [],
    'abs-pierre': [],
    'abs-metal': [],
    'abs-unis': [],
    'abs-fantaisie': []
  };

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    
    // Bois en premier (beaucoup de références)
    if (BOIS_KW.some(kw => text.includes(kw))) {
      assignments['abs-bois'].push(panel.id);
    }
    // Pierre
    else if (PIERRE_KW.some(kw => text.includes(kw))) {
      assignments['abs-pierre'].push(panel.id);
    }
    // Métal
    else if (METAL_KW.some(kw => text.includes(kw))) {
      assignments['abs-metal'].push(panel.id);
    }
    // Unis
    else if (UNI_KW.some(kw => text.includes(kw))) {
      assignments['abs-unis'].push(panel.id);
    }
    // Fantaisie (reste)
    else {
      assignments['abs-fantaisie'].push(panel.id);
    }
  }

  // Distribution
  console.log('=== DISTRIBUTION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    console.log(slug.padEnd(18) + ': ' + ids.length);
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
