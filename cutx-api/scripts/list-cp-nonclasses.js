const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const cpCat = await p.category.findFirst({ where: { slug: 'contreplaques' } });
  const panels = await p.panel.findMany({
    where: { categoryId: cpCat.id },
    select: { name: true, material: true }
  });

  const KEYWORDS = [
    'antidérapant', 'antiderapant', 'tex', 'wire',
    'cintrable', 'superform', 'poflex', 'flex',
    'filmé', 'filme', 'coffrage', 'form',
    'ctbx', 'marine', 'extérieur', 'exterieur', 'classe 3', 'wbp',
    'bouleau', 'birch', 'riga',
    'okoumé', 'okoume', 'okume',
    'peuplier', 'poplar',
    'pin', 'elliotis', 'radiata', 'sapin', 'résineux', 'resineux', 'epicéa', 'epicea', 'spruce',
    'sapelli', 'eucalyptus', 'ceiba', 'acajou', 'teck', 'exotique', 'import'
  ];

  const nonClasses = panels.filter(pn => {
    const text = pn.name.toLowerCase();
    return !KEYWORDS.some(kw => text.includes(kw));
  });

  console.log('=== ' + nonClasses.length + ' NON-CLASSES ===\n');
  for (const pn of nonClasses) {
    console.log('- ' + pn.name);
    if (pn.material) console.log('  Material: ' + pn.material);
  }
  await p.$disconnect();
}
main();
