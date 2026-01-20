import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Compter les panneaux par productType
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });

  console.log('=== PANNEAUX PAR PRODUCTTYPE ===');
  for (const t of byType) {
    console.log(`${t.productType || 'NULL'}: ${t._count}`);
  }

  // 2. Trouver les catégories "panneaux-bruts" et ses enfants
  const panneauxBruts = await prisma.category.findFirst({
    where: { slug: 'panneaux-bruts' }
  });

  console.log('\n=== ANALYSE DES PANNEAUX BRUTS ===');

  if (panneauxBruts) {
    // Récupérer tous les IDs des sous-catégories (3 niveaux)
    const level1 = await prisma.category.findMany({
      where: { parentId: panneauxBruts.id },
      select: { id: true, slug: true }
    });

    const level2 = await prisma.category.findMany({
      where: { parentId: { in: level1.map(c => c.id) } },
      select: { id: true, slug: true }
    });

    const allBrutsCategories = [
      { id: panneauxBruts.id, slug: panneauxBruts.slug },
      ...level1,
      ...level2
    ];

    const brutsCategoryIds = allBrutsCategories.map(c => c.id);
    console.log(`Catégories "Panneaux Bruts" (${allBrutsCategories.length}): ${allBrutsCategories.map(c => c.slug).join(', ')}`);

    // Trouver les panneaux MDF/OSB/etc. qui NE SONT PAS dans panneaux-bruts
    const misclassified = await prisma.panel.findMany({
      where: {
        productType: { in: ['MDF', 'OSB', 'AGGLOMERE', 'CONTREPLAQUE'] },
        categoryId: { notIn: brutsCategoryIds }
      },
      select: {
        reference: true,
        name: true,
        productType: true,
        category: { select: { name: true, slug: true } }
      },
      take: 30
    });

    console.log(`\nPanneaux MDF/OSB/Agglo/CP hors "Panneaux Bruts": ${misclassified.length}`);
    for (const p of misclassified.slice(0, 10)) {
      console.log(`  ${p.reference} | ${p.productType} | Catégorie: ${p.category?.name || 'AUCUNE'}`);
    }
  }

  // 3. Analyser les panneaux sans catégorie
  const noCategory = await prisma.panel.count({
    where: { categoryId: null }
  });
  console.log(`\nPanneaux SANS catégorie: ${noCategory}`);

  // 4. Panneaux MDF - distribution par catégorie
  console.log('\n=== PANNEAUX MDF - OÙ SONT-ILS? ===');
  const mdfPanels = await prisma.panel.findMany({
    where: { productType: 'MDF' },
    include: { category: true }
  });

  const mdfByCat: Record<string, number> = {};
  for (const p of mdfPanels) {
    const cat = p.category?.slug || 'AUCUNE';
    mdfByCat[cat] = (mdfByCat[cat] || 0) + 1;
  }

  const mdfEntries = Object.entries(mdfByCat).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of mdfEntries) {
    console.log(`  ${cat}: ${count}`);
  }

  // 5. Panneaux CONTREPLAQUE - distribution par catégorie
  console.log('\n=== PANNEAUX CONTREPLAQUE - OÙ SONT-ILS? ===');
  const cpPanels = await prisma.panel.findMany({
    where: { productType: 'CONTREPLAQUE' },
    include: { category: true }
  });

  const cpByCat: Record<string, number> = {};
  for (const p of cpPanels) {
    const cat = p.category?.slug || 'AUCUNE';
    cpByCat[cat] = (cpByCat[cat] || 0) + 1;
  }

  const cpEntries = Object.entries(cpByCat).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of cpEntries) {
    console.log(`  ${cat}: ${count}`);
  }

  // 6. Panneaux OSB - distribution par catégorie
  console.log('\n=== PANNEAUX OSB - OÙ SONT-ILS? ===');
  const osbPanels = await prisma.panel.findMany({
    where: { productType: 'OSB' },
    include: { category: true }
  });

  const osbByCat: Record<string, number> = {};
  for (const p of osbPanels) {
    const cat = p.category?.slug || 'AUCUNE';
    osbByCat[cat] = (osbByCat[cat] || 0) + 1;
  }

  const osbEntries = Object.entries(osbByCat).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of osbEntries) {
    console.log(`  ${cat}: ${count}`);
  }

  // 7. Panneaux AGGLOMERE - distribution par catégorie
  console.log('\n=== PANNEAUX AGGLOMERE - OÙ SONT-ILS? ===');
  const aggloPanels = await prisma.panel.findMany({
    where: { productType: 'AGGLOMERE' },
    include: { category: true }
  });

  const aggloByCat: Record<string, number> = {};
  for (const p of aggloPanels) {
    const cat = p.category?.slug || 'AUCUNE';
    aggloByCat[cat] = (aggloByCat[cat] || 0) + 1;
  }

  const aggloEntries = Object.entries(aggloByCat).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of aggloEntries) {
    console.log(`  ${cat}: ${count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
