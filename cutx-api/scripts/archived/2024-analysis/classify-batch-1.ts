import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Règles de classification basées sur l'analyse des noms et refs
function classifyPanel(panel: {
  id: string;
  reference: string;
  name: string;
  productType: string | null;
  manufacturerRef: string | null;
  finish: string | null;
}) {
  const name = panel.name.toLowerCase();
  const ref = panel.manufacturerRef?.toUpperCase() || '';
  const finish = panel.finish?.toUpperCase() || '';

  const classification: Record<string, any> = {};

  // === FENIX ===
  if (name.includes('fenix')) {
    classification.manufacturer = 'Fenix';
    classification.panelType = 'STRATIFIE';
    classification.panelSubType = 'HPL';
    classification.decorCategory = 'UNIS';
    classification.finishCode = 'NTM';
    classification.finishName = 'Nano Tech Matt';

    // Decor names
    if (name.includes('bianco male')) { classification.decorName = 'Bianco Male'; classification.decorCode = '0029'; }
    else if (name.includes('bianco alaska')) { classification.decorName = 'Bianco Alaska'; classification.decorCode = '0030'; }
    else if (name.includes('bianco kos')) { classification.decorName = 'Bianco Kos'; classification.decorCode = '0032'; }
    else if (name.includes('castoro ottawa')) { classification.decorName = 'Castoro Ottawa'; classification.decorCode = '0717'; }
    else if (name.includes('grigio londra')) { classification.decorName = 'Grigio Londra'; classification.decorCode = '0718'; }
    else if (name.includes('beige luxor')) { classification.decorName = 'Beige Luxor'; classification.decorCode = '0719'; }
    else if (name.includes('nero ingo')) { classification.decorName = 'Nero Ingo'; classification.decorCode = '0720'; }
    else if (name.includes('grigio efeso')) { classification.decorName = 'Grigio Efeso'; classification.decorCode = '0725'; }
    else if (name.includes('verde comodoro')) { classification.decorName = 'Verde Comodoro'; classification.decorCode = '0750'; }
    else if (name.includes('rosso jaipur')) { classification.decorName = 'Rosso Jaipur'; classification.decorCode = '0754'; }
    else if (name.includes('grigio bromo')) { classification.decorName = 'Grigio Bromo'; classification.decorCode = '0725'; }
  }

  // === POLYREY ===
  else if (name.includes('polyrey') || (ref.match(/^[A-Z]\d{3}$/) && name.includes('hpl'))) {
    classification.manufacturer = 'Polyrey';
    classification.panelSubType = 'HPL';

    // Determine panelType from productType
    if (panel.productType === 'BANDE_DE_CHANT') {
      classification.panelType = 'CHANT';
      classification.panelSubType = 'CHANT_ABS';
    } else if (panel.productType === 'STRATIFIE') {
      classification.panelType = 'STRATIFIE';
    } else {
      classification.panelType = 'MELAMINE';
    }

    // Finishes
    if (finish.includes('FA') || name.includes(' fa ') || name.includes(' fa(')) {
      classification.finishCode = 'FA';
      classification.finishName = 'Satin';
    } else if (finish.includes('SURF') || name.includes('surf')) {
      classification.finishCode = 'SURF';
      classification.finishName = 'Surf';
    }

    // Decor patterns from Polyrey naming
    if (name.includes('noir classique')) { classification.decorName = 'Noir Classique'; classification.decorCategory = 'UNIS'; }
    else if (name.includes('gris paloma')) { classification.decorName = 'Gris Paloma'; classification.decorCategory = 'UNIS'; }
    else if (name.includes('gris perle')) { classification.decorName = 'Gris Perle'; classification.decorCategory = 'UNIS'; }
    else if (name.includes('blanc chamonix')) { classification.decorName = 'Blanc Chamonix'; classification.decorCategory = 'UNIS'; }
    else if (name.includes('blanc courchevel')) { classification.decorName = 'Blanc Courchevel'; classification.decorCategory = 'UNIS'; }
    else if (name.includes('bleu flash')) { classification.decorName = 'Bleu Flash'; classification.decorCategory = 'UNIS'; }
    else if (name.includes('érable') || name.includes('erable')) { classification.decorName = 'Érable'; classification.decorCategory = 'BOIS'; }
    else if (name.includes('maryland')) { classification.decorName = 'Maryland'; classification.decorCategory = 'BOIS'; }
    else if (name.includes('chêne') || name.includes('chene')) { classification.decorCategory = 'BOIS';
      if (name.includes('wengé') || name.includes('wenge')) classification.decorName = 'Chêne Wengé';
      else if (name.includes('macédoine') || name.includes('macedoine')) classification.decorName = 'Chêne de Macédoine';
      else if (name.includes('meymac')) classification.decorName = 'Chêne de Meymac';
      else if (name.includes('fil naturel')) classification.decorName = 'Chêne de Fil Naturel';
      else classification.decorName = 'Chêne';
    }
    else if (name.includes('pommier')) { classification.decorCategory = 'BOIS';
      if (name.includes('honfleur')) classification.decorName = 'Pommier de Honfleur';
      else if (name.includes('deauville')) classification.decorName = 'Pommier de Deauville';
      else classification.decorName = 'Pommier';
    }
    else if (name.includes('merisier')) { classification.decorName = 'Merisier Ambré'; classification.decorCategory = 'BOIS'; }
    else if (name.includes('pécan') || name.includes('pecan')) { classification.decorName = 'Bois de Pécan'; classification.decorCategory = 'BOIS'; }
    else if (name.includes('banian')) { classification.decorCategory = 'BOIS';
      if (name.includes('noirci')) classification.decorName = 'Banian Noirci';
      else if (name.includes('blanchi')) classification.decorName = 'Banian Blanchi';
    }
    else if (name.includes('zebra')) { classification.decorName = 'Zebra Moka'; classification.decorCategory = 'BOIS'; }
    else if (name.includes('grès') || name.includes('gres')) { classification.decorName = 'Grès'; classification.decorCategory = 'PIERRE'; }
    else if (name.includes('acier') || name.includes('métal') || name.includes('metal')) { classification.decorCategory = 'METAL';
      if (name.includes('oxydé') || name.includes('oxyde')) classification.decorName = 'Acier Oxydé';
      else if (name.includes('brushed')) classification.decorName = 'Brushed Métal';
    }
    else if (name.includes('pearl argent')) { classification.decorName = 'Pearl Argent'; classification.decorCategory = 'METAL'; }
    else if (name.includes('brossé gris')) { classification.decorName = 'Brossé Gris'; classification.decorCategory = 'METAL'; }

    // Extract decor code from ref if Polyrey pattern
    if (ref.match(/^[A-Z]\d{3}$/)) {
      classification.decorCode = ref;
    }
  }

  // === UNILIN ===
  else if (name.includes('unilin')) {
    classification.manufacturer = 'Unilin';

    // Determine panelType from productType
    if (panel.productType === 'BANDE_DE_CHANT') {
      classification.panelType = 'CHANT';
      classification.panelSubType = 'CHANT_ABS';
    } else if (panel.productType === 'STRATIFIE') {
      classification.panelType = 'STRATIFIE';
      classification.panelSubType = 'HPL';
    } else {
      classification.panelType = 'MELAMINE';
    }

    // Finishes
    if (finish.includes('CST')) { classification.finishCode = 'CST'; classification.finishName = 'Crystal'; }
    else if (finish.includes('MST')) { classification.finishCode = 'MST'; classification.finishName = 'Master'; }
    else if (finish.includes('BST')) { classification.finishCode = 'BST'; classification.finishName = 'Basic'; }
    else if (finish.includes('V1A')) { classification.finishCode = 'V1A'; classification.finishName = 'Vernis'; }

    // Decors
    if (name.includes('élégant black') || name.includes('elegant black')) {
      classification.decorName = 'Élégant Black';
      classification.decorCode = '0113';
      classification.decorCategory = 'UNIS';
    }
    else if (name.includes('silicon')) {
      classification.decorName = 'Silicon';
      classification.decorCode = '0625';
      classification.decorCategory = 'UNIS';
    }
    else if (name.includes('jasmina')) {
      classification.decorName = 'Jasmina';
      classification.decorCode = '0551';
      classification.decorCategory = 'UNIS';
    }
    else if (name.includes('jura beech')) {
      classification.decorName = 'Jura Beech';
      classification.decorCode = '0747';
      classification.decorCategory = 'BOIS';
    }
  }

  // === DISPANO MELAMINE with Polyrey codes (B001, C003, G012, etc.) ===
  else if (name.includes('mélaminé décor') && ref.match(/^[A-Z]\d{3}$/)) {
    classification.manufacturer = 'Polyrey';
    classification.panelType = 'MELAMINE';
    classification.decorCode = ref;
    classification.finishCode = 'FIA';
    classification.finishName = 'Satin';

    // Determine decor category from code prefix
    const prefix = ref.charAt(0);
    if (['B', 'E', 'M', 'D', 'H', 'C', 'Z'].includes(prefix)) {
      classification.decorCategory = 'BOIS';
    } else if (['G', 'N'].includes(prefix)) {
      classification.decorCategory = 'UNIS';
    } else if (['A', 'P'].includes(prefix)) {
      classification.decorCategory = 'METAL';
    } else {
      classification.decorCategory = 'UNIS';
    }
  }

  // === DISPANO MELAMINE with numeric codes (Kronospan style 4xxx) ===
  else if (name.includes('mélaminé décor') && ref.match(/^\d{4}$/)) {
    classification.manufacturer = 'Kronospan';
    classification.panelType = 'MELAMINE';
    classification.decorCode = ref;

    // Extract finish from name
    if (name.includes(' sx ')) { classification.finishCode = 'SX'; classification.finishName = 'Silk'; }
    else if (name.includes(' tx ')) { classification.finishCode = 'TX'; classification.finishName = 'Texture'; }
    else if (name.includes(' sm ')) { classification.finishCode = 'SM'; classification.finishName = 'Smooth'; }
    else if (name.includes(' pe ')) { classification.finishCode = 'PE'; classification.finishName = 'Pearl'; }
  }

  // === PARTICULES / AGGLOMERE ===
  else if (name.includes('particule') || name.includes('aggloméré') || name.includes('agglomere')) {
    classification.panelType = 'AGGLO_BRUT';
    classification.decorCategory = 'SANS_DECOR';

    if (name.includes('ignifuge')) {
      classification.isIgnifuge = true;
    }
    if (name.includes('hydrofuge') || name.includes('p3')) {
      classification.isHydrofuge = true;
      classification.coreType = 'P3';
    } else {
      classification.coreType = 'P2';
    }
  }

  // === EGGER (codes H, U, F, W) ===
  else if (ref.match(/^[HUFW]\d{3,4}/)) {
    classification.manufacturer = 'Egger';

    if (panel.productType === 'BANDE_DE_CHANT') {
      classification.panelType = 'CHANT';
      classification.panelSubType = 'CHANT_ABS';
    } else if (panel.productType === 'STRATIFIE') {
      classification.panelType = 'STRATIFIE';
      classification.panelSubType = 'HPL';
    } else {
      classification.panelType = 'MELAMINE';
    }

    classification.decorCode = ref;

    // Determine decor category from code prefix
    if (ref.startsWith('H')) { classification.decorCategory = 'BOIS'; } // Holz (Wood)
    else if (ref.startsWith('U')) { classification.decorCategory = 'UNIS'; } // Uni
    else if (ref.startsWith('F')) { classification.decorCategory = 'FANTAISIE'; } // Fantaisie
    else if (ref.startsWith('W')) { classification.decorCategory = 'UNIS'; } // White/Basic

    // Extract finish from name
    if (name.includes('st9')) classification.finishCode = 'ST9';
    else if (name.includes('st10')) classification.finishCode = 'ST10';
    else if (name.includes('st12')) classification.finishCode = 'ST12';
    else if (name.includes('st15')) classification.finishCode = 'ST15';
    else if (name.includes('st19')) classification.finishCode = 'ST19';
    else if (name.includes('st28')) classification.finishCode = 'ST28';
    else if (name.includes('st37')) classification.finishCode = 'ST37';
    else if (name.includes('st38')) classification.finishCode = 'ST38';
    else if (name.includes('st76')) classification.finishCode = 'ST76';
    else if (name.includes('pe')) classification.finishCode = 'PE';
    else if (name.includes('sm')) classification.finishCode = 'SM';
  }

  return Object.keys(classification).length > 0 ? classification : null;
}

async function classifyBatch() {
  console.log('=== CLASSIFICATION BATCH 1 ===\n');

  const panels = await prisma.panel.findMany({
    where: {
      isActive: true,
      panelType: null,
    },
    select: {
      id: true,
      reference: true,
      name: true,
      productType: true,
      manufacturerRef: true,
      finish: true,
    },
    orderBy: [{ manufacturerRef: 'asc' }, { name: 'asc' }],
    take: 100,
  });

  let classified = 0;
  let skipped = 0;

  for (const panel of panels) {
    const classification = classifyPanel(panel);

    if (classification) {
      await prisma.panel.update({
        where: { id: panel.id },
        data: classification,
      });
      console.log(`✅ ${panel.reference}: ${Object.entries(classification).map(([k,v]) => `${k}=${v}`).join(', ')}`);
      classified++;
    } else {
      console.log(`⏭️  ${panel.reference}: No rules matched - ${panel.name.substring(0, 50)}...`);
      skipped++;
    }
  }

  console.log(`\n=== RÉSULTAT ===`);
  console.log(`Classifiés: ${classified}`);
  console.log(`Non matchés: ${skipped}`);

  await prisma.$disconnect();
}

classifyBatch().catch(console.error);
