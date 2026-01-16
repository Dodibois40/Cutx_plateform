import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ANALYSE DES CHANTS B COMME BOIS (BCB)                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Tous les chants BCB
  const chantsBCB = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB' },
      OR: [
        { panelType: 'CHANT' },
        { name: { contains: 'chant', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      panelType: true,
      panelSubType: true,
      decorName: true,
      decorCategory: true,
      categoryId: true,
      stockStatus: true
    }
  });

  console.log(`📊 Total chants BCB: ${chantsBCB.length}\n`);

  // Par panelType
  const byType: Record<string, number> = {};
  chantsBCB.forEach(c => {
    const t = c.panelType || 'NULL';
    byType[t] = (byType[t] || 0) + 1;
  });
  console.log('═══ Par panelType ═══');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`  ${t}: ${n}`));

  // Par panelSubType
  const bySubType: Record<string, number> = {};
  chantsBCB.forEach(c => {
    const t = c.panelSubType || 'NULL';
    bySubType[t] = (bySubType[t] || 0) + 1;
  });
  console.log('\n═══ Par panelSubType ═══');
  Object.entries(bySubType).sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`  ${t}: ${n}`));

  // Par stockStatus
  const byStock: Record<string, number> = {};
  chantsBCB.forEach(c => {
    const s = c.stockStatus || 'NULL';
    byStock[s] = (byStock[s] || 0) + 1;
  });
  console.log('\n═══ Par stockStatus ═══');
  Object.entries(byStock).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n}`));

  // Chants avec 'chene' ou 'chêne' dans le nom ou decorName
  const chantsChene = chantsBCB.filter(c =>
    c.name.toLowerCase().includes('chene') ||
    c.name.toLowerCase().includes('chêne') ||
    c.name.toLowerCase().includes('oak') ||
    (c.decorName && (
      c.decorName.toLowerCase().includes('chene') ||
      c.decorName.toLowerCase().includes('chêne') ||
      c.decorName.toLowerCase().includes('oak')
    ))
  );

  console.log('\n═══ Chants BCB avec "chêne/oak" ═══');
  console.log(`Total: ${chantsChene.length}`);

  if (chantsChene.length > 0) {
    chantsChene.forEach(c => {
      console.log(`\n  [${c.reference}] ${c.panelType || 'NULL'} | ${c.panelSubType || 'NULL'}`);
      console.log(`    Nom: ${c.name.substring(0, 60)}`);
      console.log(`    Décor: ${c.decorName || 'NULL'} | DecorCat: ${c.decorCategory || 'NULL'}`);
      console.log(`    categoryId: ${c.categoryId || 'NULL'} | stock: ${c.stockStatus || 'NULL'}`);
    });
  }

  // Chants chêne en stock
  const chantsCheneStock = chantsChene.filter(c => c.stockStatus === 'EN_STOCK' || c.stockStatus === 'IN_STOCK');
  console.log(`\n  Chants chêne en stock: ${chantsCheneStock.length}`);
  console.log(`  Chants chêne hors/sans stock: ${chantsChene.length - chantsCheneStock.length}`);

  // Chants ABS avec chêne
  const chantsABSChene = chantsBCB.filter(c =>
    c.panelSubType === 'CHANT_ABS' &&
    (c.name.toLowerCase().includes('chene') ||
      c.name.toLowerCase().includes('chêne') ||
      c.name.toLowerCase().includes('oak'))
  );
  console.log('\n═══ Chants ABS avec chêne ═══');
  console.log(`Total: ${chantsABSChene.length}`);
  chantsABSChene.forEach(c => {
    console.log(`  [${c.reference}] ${c.name.substring(0, 55)}...`);
    console.log(`    stock: ${c.stockStatus || 'NULL'}`);
  });

  // Échantillon de tous les chants BCB pour comprendre leur structure
  console.log('\n═══ Échantillon de chants BCB (15 premiers) ═══');
  chantsBCB.slice(0, 15).forEach(c => {
    console.log(`\n  [${c.reference}]`);
    console.log(`    ${c.name.substring(0, 60)}`);
    console.log(`    Type: ${c.panelType} | SubType: ${c.panelSubType}`);
    console.log(`    Décor: ${c.decorName || 'NULL'} | stock: ${c.stockStatus || 'NULL'}`);
  });

  // Recherche spécifique: comment la recherche frontend fonctionne
  console.log('\n═══ TEST: Simulation recherche "chêne" catégorie chants ═══');

  const searchResults = await prisma.panel.findMany({
    where: {
      panelType: 'CHANT',
      reference: { startsWith: 'BCB' },
      OR: [
        { name: { contains: 'chêne', mode: 'insensitive' } },
        { name: { contains: 'chene', mode: 'insensitive' } },
        { decorName: { contains: 'chêne', mode: 'insensitive' } },
        { decorName: { contains: 'chene', mode: 'insensitive' } },
      ]
    },
    select: {
      reference: true,
      name: true,
      panelSubType: true,
      stockStatus: true
    }
  });

  console.log(`Résultats: ${searchResults.length}`);
  searchResults.forEach(r => {
    console.log(`  [${r.reference}] ${r.panelSubType} | ${r.name.substring(0, 45)}... | stock: ${r.stockStatus}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
