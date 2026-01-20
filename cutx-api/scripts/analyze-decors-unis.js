/**
 * Analyse des 1230 panneaux dans decors-unis
 * Pour comprendre quels types de panneaux s'y trouvent
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const cat = await p.category.findFirst({ where: { slug: 'decors-unis' } });
  if (!cat) {
    console.log('Catégorie non trouvée');
    return;
  }

  const panels = await p.panel.findMany({
    where: { categoryId: cat.id },
    select: {
      id: true,
      name: true,
      reference: true,
      decorCategory: true,
      productType: true,
      material: true
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== ANALYSE DECORS-UNIS ===');
  console.log('Total: ' + panels.length + ' panneaux\n');

  // Analyser par decorCategory
  const byDecorCat = {};
  for (const p of panels) {
    const key = p.decorCategory || 'NULL';
    if (!byDecorCat[key]) byDecorCat[key] = [];
    byDecorCat[key].push(p);
  }

  console.log('Par decorCategory:');
  for (const [key, items] of Object.entries(byDecorCat)) {
    console.log('  ' + key + ': ' + items.length);
  }

  // Analyser par productType
  const byType = {};
  for (const p of panels) {
    const key = p.productType || 'NULL';
    if (!byType[key]) byType[key] = [];
    byType[key].push(p);
  }

  console.log('\nPar productType:');
  for (const [key, items] of Object.entries(byType)) {
    console.log('  ' + key + ': ' + items.length);
  }

  // Montrer des exemples pour comprendre
  console.log('\n=== EXEMPLES PAR CATÉGORIE ===\n');

  // Fenix
  const fenix = panels.filter(p => p.name.toLowerCase().includes('fenix'));
  console.log('FENIX (' + fenix.length + '):');
  fenix.slice(0, 3).forEach(p => console.log('  - ' + p.name));

  // Blanc/White
  const blanc = panels.filter(p => {
    const n = p.name.toLowerCase();
    return n.includes('blanc') || n.includes('white');
  });
  console.log('\nBLANC/WHITE (' + blanc.length + '):');
  blanc.slice(0, 5).forEach(p => console.log('  - ' + p.name));

  // Noir/Black
  const noir = panels.filter(p => {
    const n = p.name.toLowerCase();
    return n.includes('noir') || n.includes('black');
  });
  console.log('\nNOIR/BLACK (' + noir.length + '):');
  noir.slice(0, 5).forEach(p => console.log('  - ' + p.name));

  // Gris/Grey
  const gris = panels.filter(p => {
    const n = p.name.toLowerCase();
    return n.includes('gris') || n.includes('grey') || n.includes('gray');
  });
  console.log('\nGRIS/GREY (' + gris.length + '):');
  gris.slice(0, 5).forEach(p => console.log('  - ' + p.name));

  // Autres couleurs
  const other = panels.filter(p => {
    const n = p.name.toLowerCase();
    return !n.includes('blanc') && !n.includes('white') &&
           !n.includes('noir') && !n.includes('black') &&
           !n.includes('gris') && !n.includes('grey') && !n.includes('gray') &&
           !n.includes('fenix');
  });
  console.log('\nAUTRES COULEURS (' + other.length + '):');
  other.slice(0, 20).forEach(p => console.log('  - ' + p.name));

  await p.$disconnect();
}

main().catch(console.error);
