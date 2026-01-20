/**
 * Assignation des types simples (mapping direct)
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Mapping productType → slug catégorie
const TYPE_TO_SLUG = {
  'MDF': 'mdf',
  'CONTREPLAQUE': 'contreplaques',
  'OSB': 'osb',
  'PARTICULE': 'agglomere',
  'PANNEAU_CONSTRUCTION': 'agglomere',
  'SOLID_SURFACE': 'pdt-solid-surface',
  'COMPACT': 'compacts-hpl',
  'PANNEAU_3_PLIS': '3-plis',
  'PANNEAU_MASSIF': 'lamelle-colle',
  'PANNEAU_DECORATIF': 'decoratifs',
  'PANNEAU_SPECIAL': 'alveolaires',
};

async function main() {
  console.log('=== ASSIGNATION TYPES SIMPLES ===\n');

  // Charger les catégories
  const slugs = Object.values(TYPE_TO_SLUG);
  const cats = await p.category.findMany({
    where: { slug: { in: slugs } }
  });

  const catMap = {};
  for (const c of cats) {
    catMap[c.slug] = c.id;
  }

  console.log('Catégories chargées:', Object.keys(catMap));

  // Assigner chaque type
  let totalAssigned = 0;

  for (const [productType, slug] of Object.entries(TYPE_TO_SLUG)) {
    if (!catMap[slug]) {
      console.log('⚠️ Catégorie manquante: ' + slug);
      continue;
    }

    const result = await p.panel.updateMany({
      where: {
        productType: productType,
        categoryId: null
      },
      data: { categoryId: catMap[slug] }
    });

    if (result.count > 0) {
      console.log('✅ ' + productType.padEnd(22) + '→ ' + slug.padEnd(18) + ': ' + result.count);
      totalAssigned += result.count;
    }
  }

  console.log('\n✅ TOTAL assignés: ' + totalAssigned);

  await p.$disconnect();
}

main().catch(console.error);
