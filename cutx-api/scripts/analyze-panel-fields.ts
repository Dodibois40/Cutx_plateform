/**
 * Analyse des champs disponibles pour une classification intelligente
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  console.log('='.repeat(70));
  console.log('ANALYSE DES CHAMPS POUR CLASSIFICATION INTELLIGENTE');
  console.log('='.repeat(70));

  // 1. Compter les champs remplis
  console.log('\n📊 TAUX DE REMPLISSAGE DES CHAMPS:');

  const total = await prisma.panel.count({ where: { isActive: true } });
  console.log(`Total panneaux actifs: ${total}\n`);

  const fields = [
    'material',
    'finish',
    'decor',
    'decorName',
    'decorCategory',
    'decorSubCategory',
    'supportQuality',
    'certification',
    'manufacturer',
    'metadata',
  ];

  for (const field of fields) {
    const count = await prisma.panel.count({
      where: {
        isActive: true,
        [field]: { not: null },
      },
    });
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${field.padEnd(18)} ${count.toString().padStart(5)}/${total} (${pct}%)`);
  }

  // Booléens
  const hydro = await prisma.panel.count({ where: { isActive: true, isHydrofuge: true } });
  const igni = await prisma.panel.count({ where: { isActive: true, isIgnifuge: true } });
  console.log(`  isHydrofuge       ${hydro.toString().padStart(5)}/${total} (${((hydro / total) * 100).toFixed(1)}%)`);
  console.log(`  isIgnifuge        ${igni.toString().padStart(5)}/${total} (${((igni / total) * 100).toFixed(1)}%)`);

  // 2. Valeurs uniques pour certains champs
  console.log('\n\n📝 VALEURS UNIQUES - DECOR CATEGORY:');
  const decorCats = await prisma.panel.groupBy({
    by: ['decorCategory'],
    where: { isActive: true },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
  });
  for (const c of decorCats) {
    console.log(`  ${(c.decorCategory || 'null').padEnd(20)} ${c._count}`);
  }

  console.log('\n\n📝 VALEURS UNIQUES - PRODUCT TYPE:');
  const productTypes = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
  });
  for (const pt of productTypes) {
    console.log(`  ${(pt.productType || 'null').padEnd(25)} ${pt._count}`);
  }

  console.log('\n\n📝 VALEURS UNIQUES - SUPPORT QUALITY:');
  const qualities = await prisma.panel.groupBy({
    by: ['supportQuality'],
    where: { isActive: true, supportQuality: { not: null } },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
    take: 15,
  });
  for (const q of qualities) {
    console.log(`  ${(q.supportQuality || 'null').padEnd(30)} ${q._count}`);
  }

  console.log('\n\n📝 VALEURS UNIQUES - MATERIAL:');
  const materials = await prisma.panel.groupBy({
    by: ['material'],
    where: { isActive: true, material: { not: null } },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
    take: 15,
  });
  for (const m of materials) {
    console.log(`  ${(m.material || 'null').padEnd(30)} ${m._count}`);
  }

  // 3. Focus sur les contreplaqués pour comprendre Marine vs Okoumé
  console.log('\n\n🔍 FOCUS CONTREPLAQUÉS:');
  const cps = await prisma.panel.findMany({
    where: {
      isActive: true,
      productType: 'CONTREPLAQUE',
    },
    select: {
      name: true,
      material: true,
      supportQuality: true,
      isHydrofuge: true,
      metadata: true,
    },
    take: 20,
  });

  console.log('\nExemples de contreplaqués:');
  for (const cp of cps.slice(0, 12)) {
    console.log(`  ${(cp.name || '').substring(0, 50)}`);
    console.log(`    mat=${cp.material || '-'} | quality=${cp.supportQuality || '-'} | hydro=${cp.isHydrofuge}`);
  }

  // 4. Chercher les patterns "Marine" dans les noms
  console.log('\n\n🔍 PANNEAUX AVEC "MARINE" DANS LE NOM:');
  const marines = await prisma.panel.findMany({
    where: {
      isActive: true,
      name: { contains: 'marine', mode: 'insensitive' },
    },
    select: {
      name: true,
      productType: true,
      material: true,
      supportQuality: true,
      isHydrofuge: true,
    },
    take: 15,
  });

  for (const m of marines) {
    console.log(`  [${m.productType}] ${m.name?.substring(0, 50)}`);
    console.log(`    mat=${m.material || '-'} | quality=${m.supportQuality || '-'} | hydro=${m.isHydrofuge}`);
  }

  // 5. Focus sur les mélaminés pour comprendre Uni vs Fantaisie
  console.log('\n\n🔍 FOCUS MÉLAMINÉS:');
  const melas = await prisma.panel.findMany({
    where: {
      isActive: true,
      productType: 'MELAMINE',
    },
    select: {
      name: true,
      decor: true,
      decorName: true,
      decorCategory: true,
      decorSubCategory: true,
    },
    take: 20,
  });

  console.log('\nExemples de mélaminés:');
  for (const m of melas.slice(0, 12)) {
    console.log(`  ${(m.name || '').substring(0, 45)}`);
    console.log(`    decorCat=${m.decorCategory || '-'} | decorSub=${m.decorSubCategory || '-'} | decor=${(m.decor || '-').substring(0, 20)}`);
  }

  // 6. Analyser les decorCategories existantes
  console.log('\n\n📊 DISTRIBUTION MÉLAMINÉS PAR DECOR CATEGORY:');
  const melaDecorCats = await prisma.panel.groupBy({
    by: ['decorCategory'],
    where: { isActive: true, productType: 'MELAMINE' },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
  });
  for (const dc of melaDecorCats) {
    console.log(`  ${(dc.decorCategory || 'null').padEnd(20)} ${dc._count}`);
  }

  // 7. Regarder le metadata pour voir s'il y a des infos supplémentaires
  console.log('\n\n🔍 EXEMPLE DE METADATA:');
  const withMetadata = await prisma.panel.findMany({
    where: {
      isActive: true,
      metadata: { not: null },
    },
    select: {
      name: true,
      metadata: true,
    },
    take: 5,
  });

  for (const p of withMetadata) {
    console.log(`\n${p.name?.substring(0, 50)}`);
    try {
      const meta = JSON.parse(p.metadata || '{}');
      console.log(`  Keys: ${Object.keys(meta).join(', ')}`);
      console.log(`  ${JSON.stringify(meta).substring(0, 150)}...`);
    } catch {
      console.log(`  [Not JSON] ${p.metadata?.substring(0, 100)}`);
    }
  }

  // 8. Résumé pour les 3 plis
  console.log('\n\n🔍 FOCUS 3 PLIS:');
  const troisPlis = await prisma.panel.findMany({
    where: {
      isActive: true,
      OR: [
        { productType: 'PANNEAU_3_PLIS' },
        { name: { contains: '3 plis', mode: 'insensitive' } },
        { name: { contains: 'trois plis', mode: 'insensitive' } },
      ],
    },
    select: {
      name: true,
      productType: true,
      material: true,
      supportQuality: true,
      category: { select: { name: true, slug: true } },
    },
    take: 20,
  });

  console.log(`\nPanneaux 3 plis trouvés: ${troisPlis.length}`);
  for (const p of troisPlis.slice(0, 10)) {
    console.log(`  ${(p.name || '').substring(0, 45)}`);
    console.log(`    mat=${p.material || '-'} | type=${p.productType} | cat=${p.category?.name || '-'}`);
  }

  await prisma.$disconnect();
}

analyze().catch(console.error);
