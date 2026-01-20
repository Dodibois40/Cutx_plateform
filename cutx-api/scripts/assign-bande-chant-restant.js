/**
 * Assignation des BANDE_DE_CHANT restants
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ASSIGNATION BANDE_DE_CHANT RESTANTS ===\n');

  // Récupérer les catégories
  const categories = await prisma.category.findMany({
    where: {
      slug: { in: ['chants-melamines', 'chants'] }
    }
  });

  const catMap = {};
  for (const c of categories) {
    catMap[c.slug] = c.id;
  }

  console.log('Catégories:', Object.keys(catMap));

  // Récupérer les bandes de chant sans catégorie
  const bandesChant = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      categoryId: null,
      panelSubType: null
    },
    select: { id: true, name: true, reference: true }
  });

  console.log(`\nTotal: ${bandesChant.length}\n`);

  // Classifier
  const melamine = [];
  const autres = [];

  for (const panel of bandesChant) {
    const text = panel.name.toLowerCase();
    if (text.includes('méla') || text.includes('mela')) {
      melamine.push(panel);
    } else {
      autres.push(panel);
    }
  }

  // Assigner mélaminés
  if (melamine.length > 0 && catMap['chants-melamines']) {
    const ids = melamine.map(p => p.id);
    await prisma.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap['chants-melamines'] }
    });
    console.log(`✅ ${melamine.length} assignés à chants-melamines`);
  }

  // Assigner les autres à la catégorie parent "chants"
  if (autres.length > 0 && catMap['chants']) {
    const ids = autres.map(p => p.id);
    await prisma.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap['chants'] }
    });
    console.log(`✅ ${autres.length} assignés à chants (parent - à trier manuellement)`);
    console.log('   Ces panneaux ont des noms incorrects (Panneau Contreplaqué, Panneau Standard):');
    for (const p of autres) {
      console.log(`   - ${p.reference}: ${p.name}`);
    }
  }

  console.log('\n✅ TERMINÉ');

  await prisma.$disconnect();
}

main().catch(console.error);
