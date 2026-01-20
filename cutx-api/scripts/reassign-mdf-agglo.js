/**
 * Redistribution des MDF et Aggloméré dans leurs sous-catégories
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('=== REDISTRIBUTION MDF ET AGGLOMERE ===\n');

  // Charger toutes les sous-catégories
  const cats = await p.category.findMany({
    where: {
      slug: {
        in: [
          'mdf', 'mdf-standard', 'mdf-hydrofuge', 'mdf-ignifuge', 'mdf-leger',
          'mdf-a-laquer', 'mdf-teinte-couleurs', 'mdf-cintrable',
          'agglomere', 'agglo-standard', 'agglo-hydrofuge', 'agglo-ignifuge', 'agglo-rainure'
        ]
      }
    }
  });

  const catMap = {};
  for (const c of cats) {
    catMap[c.slug] = c.id;
  }

  console.log('Catégories chargées:', Object.keys(catMap).join(', '));

  // === MDF ===
  console.log('\n--- MDF ---');

  const mdfCat = await p.category.findFirst({ where: { slug: 'mdf' } });
  const mdfPanels = await p.panel.findMany({
    where: { categoryId: mdfCat.id },
    select: {
      id: true, name: true, panelSubType: true,
      isHydrofuge: true, isIgnifuge: true, description: true
    }
  });

  const mdfAssignments = {
    'mdf-hydrofuge': [],
    'mdf-ignifuge': [],
    'mdf-leger': [],
    'mdf-a-laquer': [],
    'mdf-teinte-couleurs': [],
    'mdf-cintrable': [],
    'mdf-standard': []
  };

  for (const panel of mdfPanels) {
    const text = (panel.name + ' ' + (panel.description || '') + ' ' + (panel.panelSubType || '')).toLowerCase();

    if (panel.isHydrofuge || text.includes('hydro') || text.includes('ctb-h') || text.includes('moisture')) {
      mdfAssignments['mdf-hydrofuge'].push(panel.id);
    } else if (panel.isIgnifuge || text.includes('ignifug') || text.includes('fire') || text.includes('m1') || text.includes('b-s')) {
      mdfAssignments['mdf-ignifuge'].push(panel.id);
    } else if (text.includes('leger') || text.includes('léger') || text.includes('light') || text.includes('ultralight')) {
      mdfAssignments['mdf-leger'].push(panel.id);
    } else if (text.includes('laqu') || text.includes('laqué') || text.includes('lacquer') || text.includes('lack')) {
      mdfAssignments['mdf-a-laquer'].push(panel.id);
    } else if (text.includes('teint') || text.includes('color') || text.includes('couleur') || text.includes('noir') || text.includes('black') || text.includes('gris') || text.includes('grey')) {
      mdfAssignments['mdf-teinte-couleurs'].push(panel.id);
    } else if (text.includes('cintr') || text.includes('flexible') || text.includes('flex')) {
      mdfAssignments['mdf-cintrable'].push(panel.id);
    } else {
      mdfAssignments['mdf-standard'].push(panel.id);
    }
  }

  // Assigner MDF
  for (const [slug, ids] of Object.entries(mdfAssignments)) {
    if (ids.length === 0 || !catMap[slug]) continue;

    await p.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap[slug] }
    });

    console.log('✅ ' + slug.padEnd(20) + ': ' + ids.length);
  }

  // === AGGLOMERE ===
  console.log('\n--- AGGLOMERE ---');

  const aggloCat = await p.category.findFirst({ where: { slug: 'agglomere' } });
  const aggloPanels = await p.panel.findMany({
    where: { categoryId: aggloCat.id },
    select: {
      id: true, name: true, panelSubType: true,
      isHydrofuge: true, isIgnifuge: true, description: true
    }
  });

  const aggloAssignments = {
    'agglo-hydrofuge': [],
    'agglo-ignifuge': [],
    'agglo-rainure': [],
    'agglo-standard': []
  };

  for (const panel of aggloPanels) {
    const text = (panel.name + ' ' + (panel.description || '') + ' ' + (panel.panelSubType || '')).toLowerCase();

    if (panel.isHydrofuge || text.includes('hydro') || text.includes('ctb-h') || text.includes('p3') || text.includes('p5') || text.includes('moisture')) {
      aggloAssignments['agglo-hydrofuge'].push(panel.id);
    } else if (panel.isIgnifuge || text.includes('ignifug') || text.includes('fire') || text.includes('m1')) {
      aggloAssignments['agglo-ignifuge'].push(panel.id);
    } else if (text.includes('rainur') || text.includes('groove') || text.includes('cannelé')) {
      aggloAssignments['agglo-rainure'].push(panel.id);
    } else {
      aggloAssignments['agglo-standard'].push(panel.id);
    }
  }

  // Assigner Aggloméré
  for (const [slug, ids] of Object.entries(aggloAssignments)) {
    if (ids.length === 0 || !catMap[slug]) continue;

    await p.panel.updateMany({
      where: { id: { in: ids } },
      data: { categoryId: catMap[slug] }
    });

    console.log('✅ ' + slug.padEnd(20) + ': ' + ids.length);
  }

  console.log('\n✅ TERMINÉ');

  await p.$disconnect();
}

main().catch(console.error);
