const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Analyser les MDF
  console.log('=== ANALYSE MDF ===\n');

  const mdfCat = await p.category.findFirst({ where: { slug: 'mdf' } });
  const mdfPanels = await p.panel.findMany({
    where: { categoryId: mdfCat.id },
    select: {
      id: true,
      name: true,
      panelSubType: true,
      isHydrofuge: true,
      isIgnifuge: true,
      finish: true,
      description: true
    }
  });

  console.log('Total MDF:', mdfPanels.length);

  // Distribution par attributs
  const mdfStats = {
    hydrofuge: 0,
    ignifuge: 0,
    leger: 0,
    laquer: 0,
    teinte: 0,
    cintrable: 0,
    standard: 0
  };

  for (const p of mdfPanels) {
    const text = (p.name + ' ' + (p.description || '') + ' ' + (p.panelSubType || '')).toLowerCase();

    if (p.isHydrofuge || text.includes('hydro') || text.includes('ctb-h') || text.includes('moisture')) {
      mdfStats.hydrofuge++;
    } else if (p.isIgnifuge || text.includes('ignifug') || text.includes('fire') || text.includes('m1') || text.includes('b-s')) {
      mdfStats.ignifuge++;
    } else if (text.includes('leger') || text.includes('léger') || text.includes('light') || text.includes('ultralight')) {
      mdfStats.leger++;
    } else if (text.includes('laqu') || text.includes('laqué') || text.includes('lacquer') || text.includes('lack')) {
      mdfStats.laquer++;
    } else if (text.includes('teint') || text.includes('color') || text.includes('couleur') || text.includes('noir') || text.includes('black') || text.includes('gris') || text.includes('grey')) {
      mdfStats.teinte++;
    } else if (text.includes('cintr') || text.includes('flexible') || text.includes('flex')) {
      mdfStats.cintrable++;
    } else {
      mdfStats.standard++;
    }
  }

  console.log('\nDistribution MDF:');
  for (const [key, val] of Object.entries(mdfStats)) {
    console.log('  mdf-' + key + ': ' + val);
  }

  // Analyser les Aggloméré
  console.log('\n=== ANALYSE AGGLOMERE ===\n');

  const aggloCat = await p.category.findFirst({ where: { slug: 'agglomere' } });
  const aggloPanels = await p.panel.findMany({
    where: { categoryId: aggloCat.id },
    select: {
      id: true,
      name: true,
      panelSubType: true,
      isHydrofuge: true,
      isIgnifuge: true,
      finish: true,
      description: true
    }
  });

  console.log('Total Aggloméré:', aggloPanels.length);

  const aggloStats = {
    hydrofuge: 0,
    ignifuge: 0,
    rainure: 0,
    standard: 0
  };

  for (const p of aggloPanels) {
    const text = (p.name + ' ' + (p.description || '') + ' ' + (p.panelSubType || '')).toLowerCase();

    if (p.isHydrofuge || text.includes('hydro') || text.includes('ctb-h') || text.includes('p3') || text.includes('p5') || text.includes('moisture')) {
      aggloStats.hydrofuge++;
    } else if (p.isIgnifuge || text.includes('ignifug') || text.includes('fire') || text.includes('m1')) {
      aggloStats.ignifuge++;
    } else if (text.includes('rainur') || text.includes('groove') || text.includes('cannelé')) {
      aggloStats.rainure++;
    } else {
      aggloStats.standard++;
    }
  }

  console.log('\nDistribution Aggloméré:');
  for (const [key, val] of Object.entries(aggloStats)) {
    console.log('  agglo-' + key + ': ' + val);
  }

  // Exemples
  console.log('\n=== EXEMPLES MDF (10 premiers) ===');
  for (const p of mdfPanels.slice(0, 10)) {
    console.log(p.name.substring(0, 60) + ' | hydro:' + p.isHydrofuge + ' | igni:' + p.isIgnifuge);
  }

  await p.$disconnect();
}
main();
