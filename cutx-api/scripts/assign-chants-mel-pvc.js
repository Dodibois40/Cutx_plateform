/**
 * Script d'assignation des chants MELAMINE et PVC
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ASSIGNATION CHANTS MELAMINE & PVC ===\n');

  // Récupérer les catégories
  const categories = await prisma.category.findMany({
    where: {
      slug: { in: ['chants-melamines', 'chants-pvc'] }
    }
  });

  const catMap = {};
  for (const c of categories) {
    catMap[c.slug] = c.id;
  }

  console.log('Catégories trouvées:', Object.keys(catMap));

  // === CHANTS MELAMINE ===
  const chantsMel = await prisma.panel.findMany({
    where: {
      panelSubType: 'CHANT_MELAMINE',
      categoryId: null
    }
  });

  console.log(`\nChants MELAMINE à traiter: ${chantsMel.length}`);

  if (chantsMel.length > 0 && catMap['chants-melamines']) {
    await prisma.panel.updateMany({
      where: {
        panelSubType: 'CHANT_MELAMINE',
        categoryId: null
      },
      data: { categoryId: catMap['chants-melamines'] }
    });
    console.log(`✅ ${chantsMel.length} chants MELAMINE assignés à chants-melamines`);
  }

  // === CHANTS PVC ===
  const chantsPvc = await prisma.panel.findMany({
    where: {
      panelSubType: 'CHANT_PVC',
      categoryId: null
    }
  });

  console.log(`\nChants PVC à traiter: ${chantsPvc.length}`);

  if (chantsPvc.length > 0 && catMap['chants-pvc']) {
    await prisma.panel.updateMany({
      where: {
        panelSubType: 'CHANT_PVC',
        categoryId: null
      },
      data: { categoryId: catMap['chants-pvc'] }
    });
    console.log(`✅ ${chantsPvc.length} chants PVC assignés à chants-pvc`);
  }

  console.log('\n✅ TERMINÉ');

  await prisma.$disconnect();
}

main().catch(console.error);
