import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         VALIDATION FINALE - PANNEAUX BRUTS                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const panneauxBruts = await prisma.category.findFirst({
    where: { slug: 'panneaux-bruts' }
  });

  if (!panneauxBruts) {
    console.log('Catégorie panneaux-bruts non trouvée');
    return;
  }

  // Récupérer l'arborescence complète
  const level1 = await prisma.category.findMany({
    where: { parentId: panneauxBruts.id },
    orderBy: { name: 'asc' }
  });

  let totalPanels = 0;

  for (const cat1 of level1) {
    const level2 = await prisma.category.findMany({
      where: { parentId: cat1.id },
      include: { _count: { select: { panels: true } } },
      orderBy: { name: 'asc' }
    });

    const directCount = await prisma.panel.count({ where: { categoryId: cat1.id } });
    const subTotal = level2.reduce((sum, c) => sum + c._count.panels, 0);

    console.log(`\n📁 ${cat1.name} (${cat1.slug})`);
    console.log(`   Panneaux directs: ${directCount} ${directCount > 0 ? '⚠️ À vérifier!' : '✓'}`);

    for (const cat2 of level2) {
      const icon = cat2._count.panels > 0 ? '📄' : '📂';
      console.log(`   └─ ${icon} ${cat2.name}: ${cat2._count.panels}`);
      totalPanels += cat2._count.panels;
    }

    totalPanels += directCount;
  }

  // Vérifier les panneaux sans catégorie ou dans la mauvaise catégorie
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log(`\n✅ TOTAL PANNEAUX BRUTS: ${totalPanels}`);

  // Problèmes potentiels
  console.log('\n🔍 VÉRIFICATIONS SUPPLÉMENTAIRES:');

  // 1. Panneaux MDF/OSB/Agglo/CP hors de leur catégorie
  const misclassified = await prisma.panel.count({
    where: {
      productType: { in: ['MDF', 'OSB', 'PARTICULE', 'CONTREPLAQUE'] },
      NOT: {
        category: {
          OR: [
            { slug: { startsWith: 'mdf' } },
            { slug: { startsWith: 'osb' } },
            { slug: { startsWith: 'agglo' } },
            { slug: { startsWith: 'cp-' } }
          ]
        }
      }
    }
  });

  if (misclassified === 0) {
    console.log('   ✓ Tous les panneaux bruts sont dans les bonnes catégories');
  } else {
    console.log(`   ⚠️ ${misclassified} panneaux potentiellement mal classés`);
  }

  // 2. Distribution par productType
  console.log('\n📊 DISTRIBUTION PAR TYPE:');
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    where: {
      category: {
        OR: [
          { slug: 'panneaux-bruts' },
          { parent: { slug: 'panneaux-bruts' } },
          { parent: { parent: { slug: 'panneaux-bruts' } } }
        ]
      }
    },
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });

  for (const t of byType) {
    console.log(`   ${t.productType}: ${t._count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
