import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCompacts() {
  console.log('🔍 Analyse des compacts - Vérification productType\n');

  // Récupérer tous les panels qui sont des compacts (par catégorie ou nom)
  const compacts = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'Compact', mode: 'insensitive' } },
        { category: { name: { contains: 'Compact', mode: 'insensitive' } } },
        { productType: 'COMPACT' },
      ],
    },
    select: {
      reference: true,
      name: true,
      manufacturerRef: true,
      productType: true,
      material: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      category: {
        select: {
          name: true,
        },
      },
      catalogue: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Total de panels "compact" trouvés: ${compacts.length}\n`);

  // Densités actuelles du frontend
  const densities: Record<string, number> = {
    COMPACT: 1400,
    STRATIFIE: 1400,
    MDF: 750,
    MELAMINE: 650,
    AGGLO_BRUT: 650,
    CONTREPLAQUE: 550,
    OSB: 600,
    MASSIF: 700,
    PLACAGE: 600,
  };

  // Grouper par productType
  const byType: Record<string, typeof compacts> = {};
  compacts.forEach(c => {
    const type = c.productType || 'NULL';
    if (!byType[type]) byType[type] = [];
    byType[type].push(c);
  });

  console.log('📈 Répartition par productType:\n');
  Object.entries(byType).forEach(([type, panels]) => {
    console.log(`   ${type}: ${panels.length} panels`);
  });

  // Détecter les problèmes
  console.log('\n🚨 COMPACTS avec productType INCORRECT (≠ COMPACT):\n');

  let problemCount = 0;
  compacts.forEach(panel => {
    if (panel.productType !== 'COMPACT') {
      problemCount++;

      const shortName = panel.name.substring(0, 60);
      const density = densities[panel.productType || ''] || 650;
      const correctDensity = 1350; // Densité correcte pour COMPACT

      let weightActual = 0;
      let weightCorrect = 0;

      if (panel.defaultLength && panel.defaultWidth && panel.defaultThickness) {
        weightActual = (panel.defaultLength / 1000) * (panel.defaultWidth / 1000) * (panel.defaultThickness / 1000) * density;
        weightCorrect = (panel.defaultLength / 1000) * (panel.defaultWidth / 1000) * (panel.defaultThickness / 1000) * correctDensity;
      }

      console.log(`${problemCount}. ${panel.reference}`);
      console.log(`   ${shortName}`);
      console.log(`   📂 Catégorie: ${panel.category?.name || 'N/A'} | Catalogue: ${panel.catalogue.name}`);
      console.log(`   ⚠️  productType actuel: ${panel.productType || 'NULL'}`);
      console.log(`   🎯 Devrait être: COMPACT`);

      if (weightActual > 0 && weightCorrect > 0) {
        const diff = weightCorrect - weightActual;
        const diffPercent = ((diff / weightActual) * 100).toFixed(0);
        console.log(`   ⚖️  Poids actuel: ${weightActual.toFixed(1)} kg (densité ${density} kg/m³)`);
        console.log(`   ✅ Poids correct: ${weightCorrect.toFixed(1)} kg (densité ${correctDensity} kg/m³)`);
        console.log(`   📊 Différence: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg (${diff > 0 ? '+' : ''}${diffPercent}%)`);
      }

      console.log('');
    }
  });

  if (problemCount === 0) {
    console.log('   ✅ Aucun problème détecté - Tous les compacts ont le bon productType!\n');
  } else {
    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`   Total compacts: ${compacts.length}`);
    console.log(`   ✅ Bon productType (COMPACT): ${compacts.length - problemCount}`);
    console.log(`   ⚠️  Mauvais productType: ${problemCount}`);
    console.log(`   📈 Taux d'erreur: ${((problemCount / compacts.length) * 100).toFixed(1)}%`);
  }
}

checkCompacts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
