/**
 * Audit des chants BCB Libre-service - vérifier les champs pour le matching
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function audit() {
  // Filtrer par les références des chants scrapés aujourd'hui
  const whereClause = {
    catalogueId: 'cmjqpjtly0000by4cnkga0kaq',
    OR: [
      { reference: { startsWith: 'BCB-BOI-' } },
      { reference: { startsWith: 'BCB-MEL-' } },
      { reference: { startsWith: 'BCB-ABS-' } },
      { reference: { startsWith: 'BCB-CHANT-' } },
      { reference: { startsWith: 'BCB-QUERKUS-' } }
    ]
  };

  const chants = await prisma.panel.findMany({
    where: whereClause,
    select: {
      reference: true,
      name: true,
      panelType: true,
      panelSubType: true,
      defaultWidth: true,
      defaultThickness: true,
      decorName: true,
      decorCode: true,
      decor: true,
      supportQuality: true,
      isPreglued: true,
      productType: true
    },
    take: 10
  });

  console.log('=== AUDIT CHANTS BCB LIBRE-SERVICE ===\n');

  chants.forEach(c => {
    console.log('📦 ' + c.reference);
    console.log('   name: ' + c.name.substring(0, 50));
    console.log('   panelType: ' + c.panelType);
    console.log('   panelSubType: ' + c.panelSubType);
    console.log('   productType: ' + (c.productType || 'NULL'));
    console.log('   defaultWidth: ' + c.defaultWidth + 'mm');
    console.log('   defaultThickness: ' + c.defaultThickness + 'mm');
    console.log('   decorName: ' + (c.decorName || 'NULL'));
    console.log('   decor: ' + (c.decor || 'NULL'));
    console.log('   supportQuality: ' + (c.supportQuality || 'NULL'));
    console.log('   isPreglued: ' + c.isPreglued);
    console.log('');
  });

  // Stats
  const total = await prisma.panel.count({ where: whereClause });

  const withDecorName = await prisma.panel.count({
    where: { ...whereClause, decorName: { not: null } }
  });

  const withValidWidth = await prisma.panel.count({
    where: { ...whereClause, defaultWidth: { gte: 10 } }
  });

  const withValidThickness = await prisma.panel.count({
    where: { ...whereClause, defaultThickness: { gte: 0.1 } }
  });

  const withProductTypeBDC = await prisma.panel.count({
    where: { ...whereClause, productType: 'BANDE_DE_CHANT' }
  });

  console.log('=== STATS (chants scrapés aujourd\'hui) ===');
  console.log('Total: ' + total);
  console.log('Avec decorName: ' + withDecorName);
  console.log('Avec width >= 10mm: ' + withValidWidth);
  console.log('Avec thickness >= 0.1mm: ' + withValidThickness);
  console.log('Avec productType=BANDE_DE_CHANT: ' + withProductTypeBDC);

  await prisma.$disconnect();
}

audit();
