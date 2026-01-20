/**
 * ANALYSE COMPLETE DE LA BASE DE DONNEES
 * Génère un rapport exhaustif pour comprendre TOUT le système
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyseComplete() {
  console.log('='.repeat(80));
  console.log('ANALYSE EXHAUSTIVE DE LA BASE DE DONNEES CUTX');
  console.log('='.repeat(80));

  // 1. TOUS LES PRODUCT TYPES
  console.log('\n\n' + '='.repeat(60));
  console.log('1. TOUS LES PRODUCT TYPES EXISTANTS');
  console.log('='.repeat(60));

  const productTypes = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('\nProductType | Count | % du total');
  console.log('-'.repeat(50));
  const totalPanels = productTypes.reduce((acc, t) => acc + t._count, 0);
  for (const t of productTypes) {
    const pct = ((t._count / totalPanels) * 100).toFixed(1);
    console.log(`${(t.productType || 'NULL').padEnd(25)} | ${String(t._count).padStart(5)} | ${pct}%`);
  }

  // 2. TOUS LES CATALOGUES
  console.log('\n\n' + '='.repeat(60));
  console.log('2. TOUS LES CATALOGUES');
  console.log('='.repeat(60));

  const catalogues = await prisma.catalogue.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { panels: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  for (const c of catalogues) {
    console.log(`\n[${c.slug}] ${c.name}: ${c._count.panels} panneaux`);
  }

  // 3. CATEGORIES NIVEAU 1 (ARBORESCENCE)
  console.log('\n\n' + '='.repeat(60));
  console.log('3. ARBORESCENCE DES CATEGORIES');
  console.log('='.repeat(60));

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          _count: { select: { panels: { where: { isActive: true } } } },
        },
        orderBy: { name: 'asc' },
      },
      _count: { select: { panels: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  for (const cat of categories) {
    const totalCatPanels = cat._count.panels + cat.children.reduce((acc, c) => acc + c._count.panels, 0);
    console.log(`\n${cat.name} (${cat.slug}) - ${totalCatPanels} panneaux`);
    for (const child of cat.children) {
      console.log(`  └─ ${child.name} (${child.slug}) - ${child._count.panels} panneaux`);
    }
  }

  // 4. DISTRIBUTION PRODUCTTYPE PAR CATALOGUE
  console.log('\n\n' + '='.repeat(60));
  console.log('4. DISTRIBUTION PRODUCTTYPE PAR CATALOGUE');
  console.log('='.repeat(60));

  for (const c of catalogues) {
    const distribution = await prisma.panel.groupBy({
      by: ['productType'],
      where: { catalogueId: c.id, isActive: true },
      _count: true,
      orderBy: { _count: { id: 'desc' } },
    });

    console.log(`\n[${c.name}]:`);
    for (const d of distribution.slice(0, 10)) {
      console.log(`  ${(d.productType || 'NULL').padEnd(25)} : ${d._count}`);
    }
    if (distribution.length > 10) {
      console.log(`  ... et ${distribution.length - 10} autres types`);
    }
  }

  // 5. EXEMPLES DE CHAQUE PRODUCTTYPE
  console.log('\n\n' + '='.repeat(60));
  console.log('5. EXEMPLES CONCRETS DE CHAQUE PRODUCTTYPE');
  console.log('='.repeat(60));

  for (const t of productTypes) {
    if (!t.productType) continue;

    const examples = await prisma.panel.findMany({
      where: { productType: t.productType, isActive: true },
      select: {
        reference: true,
        name: true,
        catalogue: { select: { name: true } },
        category: { select: { name: true, parent: { select: { name: true } } } },
      },
      take: 3,
    });

    console.log(`\n[${t.productType}] (${t._count} panneaux):`);
    for (const e of examples) {
      const catPath = e.category?.parent ? `${e.category.parent.name} > ${e.category.name}` : (e.category?.name || 'Sans catégorie');
      console.log(`  - ${e.reference} | ${(e.name || '').substring(0, 40)} | ${e.catalogue?.name} | ${catPath}`);
    }
  }

  // 6. PRODUCTYPES SANS MAPPING FRONTEND
  console.log('\n\n' + '='.repeat(60));
  console.log('6. COHERENCE BACKEND ↔ FRONTEND');
  console.log('='.repeat(60));

  // Mappings frontend connus (copié de useSyncSearchToTree.ts)
  const FRONTEND_MAPPINGS = {
    MELAMINE: 'melamines',
    STRATIFIE: 'stratifies-hpl',
    MDF: 'mdf',
    PARTICULE: 'agglomere',
    COMPACT: 'compacts-hpl',
    CONTREPLAQUE: 'contreplaque',
    OSB: 'osb',
    PLACAGE: 'plaques-bois',
    BANDE_DE_CHANT: 'chants',
    PANNEAU_MASSIF: 'bois-massifs',
    SOLID_SURFACE: 'solid-surface',
    PLAN_DE_TRAVAIL: 'plans-de-travail',
  };

  // Synonymes backend connus (copié de smart-search-parser.ts)
  const BACKEND_SYNONYMS = [
    'MELAMINE', 'STRATIFIE', 'MDF', 'BANDE_DE_CHANT', 'COMPACT',
    'CONTREPLAQUE', 'PARTICULE', 'OSB', 'PLACAGE', 'PLAN_DE_TRAVAIL',
    'PANNEAU_MASSIF', 'SOLID_SURFACE'
  ];

  console.log('\nProductTypes dans la DB SANS mapping frontend:');
  for (const t of productTypes) {
    if (t.productType && !FRONTEND_MAPPINGS[t.productType as keyof typeof FRONTEND_MAPPINGS]) {
      console.log(`  ⚠️  ${t.productType}: ${t._count} panneaux - PAS DE MAPPING FRONTEND`);
    }
  }

  console.log('\nProductTypes dans la DB SANS synonyme backend:');
  for (const t of productTypes) {
    if (t.productType && !BACKEND_SYNONYMS.includes(t.productType)) {
      console.log(`  ⚠️  ${t.productType}: ${t._count} panneaux - PAS DE SYNONYME BACKEND`);
    }
  }

  // 7. CATEGORIES VIDES OU ORPHELINES
  console.log('\n\n' + '='.repeat(60));
  console.log('7. CATEGORIES VIDES OU PROBLEMATIQUES');
  console.log('='.repeat(60));

  const allCategories = await prisma.category.findMany({
    include: {
      _count: { select: { panels: { where: { isActive: true } } } },
      parent: { select: { name: true } },
    },
  });

  const emptyCategories = allCategories.filter(c => c._count.panels === 0);
  console.log(`\nCatégories vides (${emptyCategories.length}):`);
  for (const c of emptyCategories.slice(0, 20)) {
    const parentInfo = c.parent ? `(parent: ${c.parent.name})` : '(niveau 1)';
    console.log(`  - ${c.name} (${c.slug}) ${parentInfo}`);
  }

  // 8. PANNEAUX SANS CATEGORIE
  console.log('\n\n' + '='.repeat(60));
  console.log('8. PANNEAUX SANS CATEGORIE');
  console.log('='.repeat(60));

  const withoutCategory = await prisma.panel.groupBy({
    by: ['productType'],
    where: { categoryId: null, isActive: true },
    _count: true,
  });

  console.log('\nPar productType:');
  for (const w of withoutCategory) {
    console.log(`  ${(w.productType || 'NULL').padEnd(25)} : ${w._count}`);
  }

  // 9. PANNEAUX SANS PRODUCTTYPE
  console.log('\n\n' + '='.repeat(60));
  console.log('9. PANNEAUX SANS PRODUCTTYPE');
  console.log('='.repeat(60));

  const withoutProductType = await prisma.panel.findMany({
    where: { productType: null, isActive: true },
    select: {
      reference: true,
      name: true,
      catalogue: { select: { name: true } },
      category: { select: { name: true } },
    },
    take: 20,
  });

  const totalWithoutType = await prisma.panel.count({
    where: { productType: null, isActive: true },
  });

  console.log(`\nTotal: ${totalWithoutType} panneaux sans productType`);
  console.log('\nExemples:');
  for (const p of withoutProductType) {
    console.log(`  ${p.reference} | ${(p.name || '').substring(0, 40)} | ${p.catalogue?.name} | ${p.category?.name || 'Sans cat'}`);
  }

  // 10. STATISTIQUES DONNEES MANQUANTES
  console.log('\n\n' + '='.repeat(60));
  console.log('10. STATISTIQUES DONNEES MANQUANTES');
  console.log('='.repeat(60));

  const stats = await prisma.panel.aggregate({
    where: { isActive: true },
    _count: true,
  });

  const missingImage = await prisma.panel.count({
    where: { isActive: true, OR: [{ imageUrl: null }, { imageUrl: '' }] },
  });

  const missingPrice = await prisma.panel.count({
    where: { isActive: true, pricePerM2: null, pricePerMl: null, pricePerUnit: null },
  });

  const missingThickness = await prisma.panel.count({
    where: { isActive: true, thickness: { equals: [] } },
  });

  const missingDecorName = await prisma.panel.count({
    where: { isActive: true, decorName: null, productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] } },
  });

  console.log(`\nTotal panneaux actifs: ${stats._count}`);
  console.log(`Sans image: ${missingImage} (${((missingImage / stats._count) * 100).toFixed(1)}%)`);
  console.log(`Sans prix: ${missingPrice} (${((missingPrice / stats._count) * 100).toFixed(1)}%)`);
  console.log(`Sans épaisseur: ${missingThickness} (${((missingThickness / stats._count) * 100).toFixed(1)}%)`);
  console.log(`Décorés sans decorName: ${missingDecorName}`);

  await prisma.$disconnect();
}

analyseComplete().catch(console.error);
