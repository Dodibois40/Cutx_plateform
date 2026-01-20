/**
 * ASSIGNATION PANNEAUX-DECORS vers sous-catégories
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const BOIS_KW = ['chêne', 'chene', 'oak', 'noyer', 'walnut', 'hêtre', 'hetre', 'frêne', 'frene', 'pin', 'bouleau', 'birch', 'mélèze', 'meleze', 'teck', 'acacia', 'orme', 'châtaign', 'chataign', 'cerisier', 'ébène', 'ebene', 'eucalyptus', 'wenge', 'zebrano', 'orme', 'bois'];
const PIERRE_KW = ['pierre', 'stone', 'béton', 'beton', 'concrete', 'marbre', 'marble', 'ardoise', 'slate', 'granit', 'travertin', 'onyx'];
const METAL_KW = ['métal', 'metal', 'acier', 'inox', 'alumin', 'cuivre', 'copper', 'zinc', 'chrome', 'fer', 'bronze', 'laiton'];
const UNI_KW = ['blanc', 'white', 'noir', 'black', 'gris', 'grey', 'gray', 'beige', 'crème', 'creme', 'cream', 'écru', 'taupe', 'anthracite', 'ivoire'];

async function main() {
  console.log('=== ASSIGNATION PANNEAUX-DECORS ===\n');

  const cat = await p.category.findFirst({ where: { slug: 'panneaux-decors' } });
  const children = await p.category.findMany({
    where: { parentId: cat.id },
    select: { id: true, slug: true }
  });

  const catMap = {};
  for (const c of children) catMap[c.slug] = c.id;

  console.log('Sous-catégories:', Object.keys(catMap).join(', '));

  const panels = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: { id: true, name: true, decorCategory: true }
  });

  console.log('Total: ' + panels.length + '\n');

  const assignments = {
    'decors-bois': [],
    'decors-pierre-beton': [],
    'decors-metal': [],
    'decors-unis': [],
    'decors-fantaisie': []
  };

  for (const panel of panels) {
    const text = panel.name.toLowerCase();
    
    // Unis d'abord (blanc, noir, gris...)
    if (UNI_KW.some(kw => text.includes(kw))) {
      assignments['decors-unis'].push(panel.id);
    }
    // Bois
    else if (BOIS_KW.some(kw => text.includes(kw))) {
      assignments['decors-bois'].push(panel.id);
    }
    // Pierre
    else if (PIERRE_KW.some(kw => text.includes(kw))) {
      assignments['decors-pierre-beton'].push(panel.id);
    }
    // Métal
    else if (METAL_KW.some(kw => text.includes(kw))) {
      assignments['decors-metal'].push(panel.id);
    }
    // Fantaisie (reste)
    else {
      assignments['decors-fantaisie'].push(panel.id);
    }
  }

  // Distribution
  console.log('=== DISTRIBUTION ===\n');
  for (const [slug, ids] of Object.entries(assignments)) {
    console.log(slug.padEnd(22) + ': ' + ids.length);
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
