const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function classifySpecialPanels() {
  console.log('=== CLASSIFICATION DES PANNEAUX SPECIAUX ===\n');

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

    // PLANS DE TRAVAIL (worktops) - Usually stratified or melamine
    if (name.includes('plan de travail') || name.includes('pdt ')) {
      updateData = {
        panelType: 'STRATIFIE',
        panelSubType: 'HPL',
        decorCategory: 'BOIS',
        manufacturer: extractManufacturer(name)
      };

      // Extract decor code from name (e.g., "H1180 ST37")
      const decorMatch = name.match(/([A-Z]\d{3,4})\s*(ST\d+|PA|SM|SM2)?/i);
      if (decorMatch) {
        updateData.decorCode = decorMatch[1].toUpperCase();
        if (decorMatch[2]) updateData.finishCode = decorMatch[2].toUpperCase();
      }

      // Categorize by decor name
      if (name.includes('chêne') || name.includes('oak')) updateData.decorCategory = 'BOIS';
      else if (name.includes('marbre') || name.includes('marble')) updateData.decorCategory = 'PIERRE';
      else if (name.includes('béton') || name.includes('concrete')) updateData.decorCategory = 'PIERRE';
      else if (name.includes('pietra')) updateData.decorCategory = 'PIERRE';
    }

    // PURENIT - Polyurethane recycled panels (technical)
    else if (name.includes('purenit')) {
      updateData = {
        panelType: 'MASSIF', // Solid technical panel
        manufacturer: 'Purenit',
        decorCategory: 'UNIS',
        decorName: 'Purenit'
      };
    }

    // VIROC - Cement-wood composite
    else if (name.includes('viroc')) {
      updateData = {
        panelType: 'MASSIF', // Solid technical panel
        manufacturer: 'Viroc',
        decorCategory: 'UNIS'
      };

      if (name.includes('gris')) updateData.decorName = 'Gris';
      else if (name.includes('noir')) updateData.decorName = 'Noir';
      else if (name.includes('blanc')) updateData.decorName = 'Blanc';
    }

    // ASTRATA SLATS - Decorative wood slats
    else if (name.includes('astrata slat') || name.includes('astrata latte')) {
      updateData = {
        panelType: 'MASSIF',
        panelSubType: 'MASSIF_BOIS',
        manufacturer: 'Astrata',
        decorCategory: 'BOIS'
      };

      if (name.includes('oak') || name.includes('chêne')) updateData.decorName = 'Chêne';
      else if (name.includes('walnut') || name.includes('noyer')) updateData.decorName = 'Noyer';
    }

    // TOCCA ACOUSTIC - Acoustic panels
    else if (name.includes('tocca acoustic') || name.includes('acoustic')) {
      updateData = {
        panelType: 'MDF',
        manufacturer: 'Tocca',
        decorCategory: 'BOIS'
      };

      if (name.includes('oak') || name.includes('chêne')) updateData.decorName = 'Chêne';
      else if (name.includes('walnut') || name.includes('noyer')) updateData.decorName = 'Noyer';
      else if (name.includes('ebony') || name.includes('ébène')) updateData.decorName = 'Ébène';
    }

    // TRICOYA - Moisture resistant MDF (Accoya-based)
    else if (name.includes('tricoya')) {
      updateData = {
        panelType: 'MDF',
        panelSubType: 'MDF_BRUT',
        manufacturer: 'Finsa',
        isHydrofuge: true,
        decorCategory: 'UNIS',
        decorName: 'Tricoya'
      };
    }

    // TASSEAU - Wood strips
    else if (name.includes('tasseau')) {
      updateData = {
        panelType: 'MASSIF',
        panelSubType: 'MASSIF_BOIS',
        decorCategory: 'BOIS'
      };

      if (name.includes('épicéa') || name.includes('epicea')) updateData.decorName = 'Épicéa';
      else if (name.includes('pin')) updateData.decorName = 'Pin';
      else if (name.includes('chêne')) updateData.decorName = 'Chêne';
    }

    // LATT & SPLITT (Unilin decorative panels)
    else if (name.includes('latt ') || name.includes('splitt ')) {
      updateData = {
        panelType: 'MELAMINE',
        manufacturer: 'Unilin',
        decorCategory: 'BOIS'
      };

      if (name.includes('pepper oak')) updateData.decorName = 'Pepper Oak';
      else if (name.includes('castel oak')) updateData.decorName = 'Castel Oak';
      else if (name.includes('natural oak')) updateData.decorName = 'Natural Oak';
    }

    // MAROTTE - Decorative panels
    else if (name.includes('marotte')) {
      updateData = {
        panelType: 'MDF',
        panelSubType: 'MDF_LAQUE',
        manufacturer: 'Marotte',
        decorCategory: 'FANTAISIE'
      };
    }

    // PORTES EXPRESS - Doors (Okoumé plywood)
    else if (name.includes('porte express') || name.includes('okoumé')) {
      updateData = {
        panelType: 'CONTREPLAQUE',
        decorCategory: 'BOIS',
        decorName: 'Okoumé'
      };
    }

    // PANNEAU LATTE 5 PLIS - 5-ply laminated panels
    else if (name.includes('panneau latté') || name.includes('5 plis')) {
      updateData = {
        panelType: 'MASSIF',
        panelSubType: 'MASSIF_3_PLIS', // Closest match
        decorCategory: 'BOIS'
      };

      if (name.includes('épicéa') || name.includes('epicea')) updateData.decorName = 'Épicéa';
    }

    // PANNEAU ISOLANT - Insulation panels
    else if (name.includes('panneau isolant')) {
      updateData = {
        panelType: 'MASSIF',
        decorCategory: 'BOIS'
      };

      if (name.includes('chene') || name.includes('chêne')) updateData.decorName = 'Chêne';
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

  await prisma.$disconnect();
}

function extractManufacturer(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('egger')) return 'Egger';
  if (lowerName.includes('pfleiderer')) return 'Pfleiderer';
  if (lowerName.includes('kronospan')) return 'Kronospan';
  if (lowerName.includes('unilin')) return 'Unilin';
  if (lowerName.includes('finsa')) return 'Finsa';
  return null;
}

classifySpecialPanels().catch(console.error);
