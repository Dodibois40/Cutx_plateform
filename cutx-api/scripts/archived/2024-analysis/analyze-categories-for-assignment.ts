import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  console.log('=== ANALYSE DES CATÉGORIES POUR ASSIGNATION ===\n');

  // 1. Lister toutes les catégories existantes
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { panels: true } },
      parent: { select: { name: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log('📁 Catégories existantes:\n');
  categories.forEach(c => {
    const parent = c.parent?.name ? ` (parent: ${c.parent.name})` : ' (racine)';
    console.log(`  ${c.name}: ${c._count.panels} produits${parent}`);
  });

  // 2. Analyser les produits sans catégorie par panelType
  console.log('\n\n📊 Produits SANS catégorie par panelType:\n');

  const uncategorized = await prisma.panel.groupBy({
    by: ['panelType'],
    where: { categoryId: null },
    _count: true,
    orderBy: { _count: { panelType: 'desc' } }
  });

  uncategorized.forEach(u => {
    console.log(`  ${u.panelType || 'NULL'}: ${u._count}`);
  });

  // 3. Proposer des mappings panelType → catégorie
  console.log('\n\n💡 PROPOSITION DE MAPPING panelType → catégorie:\n');

  // Chercher des catégories correspondantes pour chaque type
  const mappingProposals: Record<string, string[]> = {
    'CHANT': ['Bande de chant ABS', 'Bande de chant bois veritable', 'Bande de chant melamine'],
    'CONTREPLAQUE': ['Contreplaqués', 'Contreplaque Okoume', 'Contreplaque Peuplier', 'Contreplaque Resineux'],
    'MASSIF': ['Panneaux non aboutés', 'Lamellés-collés aboutés', '3 plis essences fines', 'Panneau 3/5 plis'],
    'MDF': ['MDF', 'MDF standards', 'MDF hydrofuges', 'MDF ignifugés'],
    'AGGLO_BRUT': ['Agglomérés', 'Agglomere standard', 'Agglomérés hydrofuges', 'Agglomérés standards'],
    'STRATIFIE': ['Stratifiés HPL', 'Stratifie decor', 'Stratifiés'],
    'OSB': ['OSB', 'Panneau OSB', 'Dalle OSB'],
    'MELAMINE': ['Panneau Mélaminé Décor', 'Melamine decor', 'Unis', 'Bois'],
    'COMPACT': ['Compacts', 'Compact interieur'],
    'PLACAGE': ['Stratifiés et flex', 'Lattés replaqués', 'MDF replaqués'],
  };

  for (const [panelType, possibleCats] of Object.entries(mappingProposals)) {
    console.log(`\n${panelType}:`);
    for (const catName of possibleCats) {
      const cat = categories.find(c => c.name === catName);
      if (cat) {
        console.log(`  ✓ "${catName}" existe (${cat._count.panels} produits)`);
      }
    }
  }

  // 4. Analyser les produits non catégorisés pour voir leurs patterns
  console.log('\n\n🔍 ÉCHANTILLONS de produits sans catégorie:\n');

  const sampleTypes = ['CHANT', 'CONTREPLAQUE', 'MASSIF', 'MDF', 'AGGLO_BRUT'];

  for (const pType of sampleTypes) {
    const samples = await prisma.panel.findMany({
      where: { categoryId: null, panelType: pType as any },
      select: { reference: true, name: true, panelSubType: true },
      take: 3
    });

    if (samples.length > 0) {
      console.log(`${pType}:`);
      samples.forEach(s => {
        console.log(`  [${s.reference}] ${s.name.substring(0, 50)} | SubType: ${s.panelSubType || 'N/A'}`);
      });
      console.log('');
    }
  }

  await prisma.$disconnect();
}

analyze();
