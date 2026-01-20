import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  // Récupérer toutes les catégories existantes avec leur hiérarchie
  const categories = await prisma.category.findMany({
    include: {
      parent: { select: { name: true, slug: true } },
      children: { select: { name: true, slug: true } },
      _count: { select: { panels: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== CATÉGORIES EXISTANTES ===');
  for (const cat of categories) {
    const parent = cat.parent ? cat.parent.name : '(racine)';
    const childSlugs = cat.children.map(c => c.slug).join(', ') || '-';
    console.log(`${cat.name} [${cat.slug}]`);
    console.log(`  Parent: ${parent} | Enfants: ${childSlugs} | Panels: ${cat._count.panels}`);
  }

  // Analyser les types de MDF
  console.log('\n=== TYPES MDF ===');
  const mdfPanels = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: 'MDF' },
        { name: { contains: 'MDF', mode: 'insensitive' } }
      ]
    },
    select: { name: true, isHydrofuge: true, isIgnifuge: true }
  });

  const mdfStats = { total: mdfPanels.length, hydrofuge: 0, ignifuge: 0, laquer: 0, teinte: 0, usinage: 0, standard: 0 };
  for (const m of mdfPanels) {
    if (m.isHydrofuge) mdfStats.hydrofuge++;
    if (m.isIgnifuge) mdfStats.ignifuge++;
    if (/laqu/i.test(m.name)) mdfStats.laquer++;
    if (/teint|colo/i.test(m.name)) mdfStats.teinte++;
    if (/usina/i.test(m.name)) mdfStats.usinage++;
  }
  mdfStats.standard = mdfStats.total - mdfStats.hydrofuge - mdfStats.ignifuge - mdfStats.laquer - mdfStats.teinte;
  console.log(mdfStats);

  // Analyser les types de Contreplaqué
  console.log('\n=== TYPES CONTREPLAQUÉ ===');
  const cpPanels = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: 'CONTREPLAQUE' },
        { name: { contains: 'Contreplaqué', mode: 'insensitive' } }
      ],
      productType: { not: 'PLACAGE' }
    },
    select: { name: true, isHydrofuge: true }
  });

  const cpStats = { total: cpPanels.length, marine: 0, filme: 0, cintrable: 0, bouleau: 0, okoume: 0, peuplier: 0, pin: 0, hydrofuge: 0 };
  for (const c of cpPanels) {
    const n = c.name.toLowerCase();
    if (/marine|ctbx/i.test(n) || c.isHydrofuge) cpStats.marine++;
    if (/film/i.test(n)) cpStats.filme++;
    if (/cintr|poflex|flex/i.test(n)) cpStats.cintrable++;
    if (/bouleau/i.test(n)) cpStats.bouleau++;
    if (/okoum/i.test(n)) cpStats.okoume++;
    if (/peupl/i.test(n)) cpStats.peuplier++;
    if (/pin\b/i.test(n)) cpStats.pin++;
  }
  console.log(cpStats);

  // Analyser les agglomérés BRUTS (pas plaqués)
  console.log('\n=== TYPES AGGLOMÉRÉ BRUT ===');
  const aggloPanels = await prisma.panel.findMany({
    where: {
      productType: 'AGGLOMERE'
    },
    select: { name: true, isHydrofuge: true, isIgnifuge: true }
  });

  const aggloStats = { total: aggloPanels.length, hydrofuge: 0, ignifuge: 0, dalle: 0, standard: 0 };
  for (const a of aggloPanels) {
    if (a.isHydrofuge) aggloStats.hydrofuge++;
    if (a.isIgnifuge) aggloStats.ignifuge++;
    if (/dalle/i.test(a.name)) aggloStats.dalle++;
  }
  aggloStats.standard = aggloStats.total - aggloStats.hydrofuge - aggloStats.ignifuge - aggloStats.dalle;
  console.log(aggloStats);

  // Analyser le bois massif
  console.log('\n=== TYPES BOIS MASSIF / 3 PLIS ===');
  const massifPanels = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'Lamellé', mode: 'insensitive' } },
        { name: { contains: '3 plis', mode: 'insensitive' } },
        { name: { contains: 'trois plis', mode: 'insensitive' } },
        { name: { contains: 'massif', mode: 'insensitive' } }
      ]
    },
    select: { name: true }
  });

  const massifStats = { total: massifPanels.length, lamelleAboute: 0, lamelleNonAboute: 0, troisPlis: 0, autre: 0 };
  for (const m of massifPanels) {
    const n = m.name.toLowerCase();
    if (/lamellé.*about/i.test(n)) massifStats.lamelleAboute++;
    else if (/lamellé.*non.*about/i.test(n)) massifStats.lamelleNonAboute++;
    else if (/lamellé/i.test(n)) massifStats.autre++;
    if (/3 plis|trois plis/i.test(n)) massifStats.troisPlis++;
  }
  console.log(massifStats);

  // Échantillons de noms pour chaque type
  console.log('\n=== ÉCHANTILLONS CP ===');
  cpPanels.slice(0, 10).forEach(p => console.log('  ' + p.name.substring(0, 60)));

  console.log('\n=== ÉCHANTILLONS MASSIF ===');
  massifPanels.slice(0, 10).forEach(p => console.log('  ' + p.name.substring(0, 60)));

  await prisma.$disconnect();
}

analyze().catch(console.error);
