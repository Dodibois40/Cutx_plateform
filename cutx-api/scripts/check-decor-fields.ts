/**
 * Check decor fields in panels
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Check a sample of MELAMINE panels from each catalogue
  const catalogues = await prisma.catalogue.findMany();

  for (const cat of catalogues) {
    const samples = await prisma.panel.findMany({
      where: { productType: 'MELAMINE', isActive: true, catalogueId: cat.id },
      select: {
        name: true,
        decorName: true,
        decorCode: true,
        decor: true,
        finish: true,
        finishName: true,
        finishCode: true,
        colorCode: true,
        colorChoice: true,
        manufacturerRef: true,
      },
      take: 10,
    });

    if (samples.length === 0) continue;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${cat.name} - MELAMINE (${samples.length} exemples)`);
    console.log('='.repeat(60));

    for (const p of samples) {
      console.log(`\nname: ${p.name?.substring(0, 50)}`);
      console.log(`  decorName: ${p.decorName || '-'}`);
      console.log(`  decorCode: ${p.decorCode || '-'}`);
      console.log(`  decor: ${p.decor || '-'}`);
      console.log(`  finish: ${p.finish || '-'}`);
      console.log(`  finishName: ${p.finishName || '-'}`);
      console.log(`  finishCode: ${p.finishCode || '-'}`);
      console.log(`  colorCode: ${p.colorCode || '-'}`);
      console.log(`  colorChoice: ${p.colorChoice || '-'}`);
      console.log(`  manufacturerRef: ${p.manufacturerRef || '-'}`);
    }
  }

  // Count how many have values in each field
  console.log('\n\n' + '='.repeat(60));
  console.log('STATISTIQUES DES CHAMPS DÉCOR');
  console.log('='.repeat(60));

  const decoratedPanels = await prisma.panel.count({
    where: { productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] }, isActive: true },
  });

  const withDecorName = await prisma.panel.count({
    where: {
      productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] },
      isActive: true,
      decorName: { not: null },
      NOT: { decorName: '' },
    },
  });

  const withDecorCode = await prisma.panel.count({
    where: {
      productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] },
      isActive: true,
      decorCode: { not: null },
      NOT: { decorCode: '' },
    },
  });

  const withDecor = await prisma.panel.count({
    where: {
      productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] },
      isActive: true,
      decor: { not: null },
      NOT: { decor: '' },
    },
  });

  const withFinish = await prisma.panel.count({
    where: {
      productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] },
      isActive: true,
      finish: { not: null },
      NOT: { finish: '' },
    },
  });

  const withColorCode = await prisma.panel.count({
    where: {
      productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] },
      isActive: true,
      colorCode: { not: null },
      NOT: { colorCode: '' },
    },
  });

  console.log(`\nTotal panneaux décorés: ${decoratedPanels}`);
  console.log(`  avec decorName:  ${withDecorName} (${((withDecorName / decoratedPanels) * 100).toFixed(1)}%)`);
  console.log(`  avec decorCode:  ${withDecorCode} (${((withDecorCode / decoratedPanels) * 100).toFixed(1)}%)`);
  console.log(`  avec decor:      ${withDecor} (${((withDecor / decoratedPanels) * 100).toFixed(1)}%)`);
  console.log(`  avec finish:     ${withFinish} (${((withFinish / decoratedPanels) * 100).toFixed(1)}%)`);
  console.log(`  avec colorCode:  ${withColorCode} (${((withColorCode / decoratedPanels) * 100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

check().catch(console.error);
