const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function classifyRemainingPanels() {
  console.log('=== CLASSIFICATION DES PANNEAUX RESTANTS ===\n');

  const unclassified = await prisma.panel.findMany({
    where: { panelType: null },
    select: { id: true, name: true, manufacturerRef: true }
  });

  console.log('Panneaux non classifiés: ' + unclassified.length + '\n');

  let classified = 0;
  let skipped = 0;

  for (const panel of unclassified) {
    const name = (panel.name || '').toLowerCase();
    const ref = (panel.manufacturerRef || '').toLowerCase();

    let updateData = null;

    // LATHO - Decorative milled/flexible panels (Cleaf/Alvic product line)
    if (name.includes('latho ') || name.includes('latho flex')) {
      updateData = {
        panelType: 'MELAMINE',
        manufacturer: 'Cleaf',
        decorCategory: 'BOIS'
      };

      if (name.includes('chêne') || name.includes('chene')) updateData.decorName = 'Chêne';
      else if (name.includes('noyer')) updateData.decorName = 'Noyer';

      // Identify specific Latho product lines
      if (name.includes('asolo')) updateData.decorCode = 'ASOLO';
      else if (name.includes('capri')) updateData.decorCode = 'CAPRI';
      else if (name.includes('milano')) updateData.decorCode = 'MILANO';
      else if (name.includes('roma')) updateData.decorCode = 'ROMA';
      else if (name.includes('verona')) updateData.decorCode = 'VERONA';
      else if (name.includes('portofino')) updateData.decorCode = 'PORTOFINO';
      else if (name.includes('move')) updateData.decorCode = 'MOVE';
      else if (name.includes('nathwood')) updateData.decorCode = 'NATHWOOD';
    }

    // COMPACMEL PLUS - Compact melamine panels (Finsa)
    else if (name.includes('compacmel')) {
      updateData = {
        panelType: 'COMPACT',
        manufacturer: 'Finsa',
        decorCategory: 'UNIS'
      };

      if (name.includes('blanc')) updateData.decorName = 'Blanc';
      else if (name.includes('gris')) updateData.decorName = 'Gris';
      else if (name.includes('crema') || name.includes('crème')) updateData.decorName = 'Crème';
      else if (name.includes('natural grey')) updateData.decorName = 'Natural Grey';
    }

    // OCEAN - Unilin decorative panels
    else if (name.includes('ocean ')) {
      updateData = {
        panelType: 'MELAMINE',
        manufacturer: 'Unilin',
        decorCategory: 'BOIS'
      };

      if (name.includes('pepper oak')) updateData.decorName = 'Pepper Oak';
      else if (name.includes('natural oak')) updateData.decorName = 'Natural Oak';
    }

    // PVC EXPANSE - Expanded PVC panels
    else if (name.includes('pvc expans') || name.includes('pvc foam')) {
      updateData = {
        panelType: 'SOLID_SURFACE', // Closest match for technical panels
        panelSubType: 'SS_ACRYLIQUE',
        manufacturer: 'Generic',
        decorCategory: 'UNIS'
      };

      if (name.includes('blanc')) updateData.decorName = 'Blanc';
      else if (name.includes('noir')) updateData.decorName = 'Noir';
    }

    // LATTE LEGER faces HDF - Lightweight laminated panels with HDF faces
    else if (name.includes('latté léger') || name.includes('latte leger')) {
      updateData = {
        panelType: 'MDF', // HDF is a type of MDF
        panelSubType: 'MDF_BRUT',
        decorCategory: 'UNIS',
        decorName: 'HDF Faces'
      };
    }

    // PANNEAU ALVEOLAIRE - Honeycomb panels
    else if (name.includes('panneau alvéolaire') || name.includes('alveolaire')) {
      updateData = {
        panelType: 'MDF', // Often has MDF or cardboard honeycomb core
        decorCategory: 'UNIS'
      };

      if (name.includes('blanc')) updateData.decorName = 'Blanc';
      else if (name.includes('brut')) updateData.decorName = 'Brut';
    }

    // PLAN TRAVAIL LAM.COLLE - Laminated solid wood worktops
    else if (name.includes('plan travail lam.collé') || name.includes('plan travail lam collé')) {
      updateData = {
        panelType: 'MASSIF',
        panelSubType: 'LAMELLE_COLLE',
        decorCategory: 'BOIS'
      };

      if (name.includes('acacia')) updateData.decorName = 'Acacia';
      else if (name.includes('bambou natur')) updateData.decorName = 'Bambou Naturel';
      else if (name.includes('bambou caram')) updateData.decorName = 'Bambou Caramel';
      else if (name.includes('chêne') || name.includes('chene')) updateData.decorName = 'Chêne';
      else if (name.includes('hêtre') || name.includes('hetre')) updateData.decorName = 'Hêtre';
    }

    // GREENPANEL - Eco-friendly panels
    else if (name.includes('greenpanel')) {
      updateData = {
        panelType: 'MDF',
        manufacturer: 'GreenPanel',
        decorCategory: 'UNIS',
        decorName: 'Eco'
      };
    }

    // MEDILAND / FINLIGHT - Lightweight panels
    else if (name.includes('mediland') || name.includes('finlight')) {
      updateData = {
        panelType: 'MDF',
        decorCategory: 'UNIS',
        decorName: 'Lightweight'
      };
    }

    // MASTIC-COLLE - Adhesive products (not a panel but in the catalog)
    else if (name.includes('mastic') || name.includes('colle')) {
      // Skip - this is not a panel product
      skipped++;
      console.log('✗ SKIP (non-panel): ' + name.substring(0, 60));
      continue;
    }

    // Apply update if we have classification data
    if (updateData) {
      await prisma.panel.update({
        where: { id: panel.id },
        data: updateData
      });
      classified++;
      console.log('✓ ' + panel.name.substring(0, 60) + ' -> ' + updateData.panelType);
    } else {
      skipped++;
      console.log('✗ SKIP: ' + panel.name.substring(0, 70));
    }
  }

  console.log('\n=== RESULTATS ===');
  console.log('Classifiés: ' + classified);
  console.log('Non classifiés: ' + skipped);

  // Show remaining unclassified
  const remaining = await prisma.panel.findMany({
    where: { panelType: null },
    select: { name: true }
  });

  if (remaining.length > 0) {
    console.log('\n=== PANNEAUX ENCORE NON CLASSIFIES (' + remaining.length + ') ===');
    remaining.forEach(p => console.log('  - ' + (p.name || 'N/A').substring(0, 70)));
  }

  await prisma.$disconnect();
}

classifyRemainingPanels().catch(console.error);
