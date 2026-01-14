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
  }

  // === POLYREY (explicit) ===
  else if (name.includes('polyrey')) {
    classification.manufacturer = 'Polyrey';
    classification.panelSubType = 'HPL';

    if (panel.productType === 'BANDE_DE_CHANT') {
      classification.panelType = 'CHANT';
      classification.panelSubType = 'CHANT_ABS';
    } else if (panel.productType === 'STRATIFIE') {
      classification.panelType = 'STRATIFIE';
    } else {
      classification.panelType = 'MELAMINE';
    }

    if (finish.includes('FA') || name.includes(' fa ') || name.includes('fa(')) {
      classification.finishCode = 'FA';
      classification.finishName = 'Satin';
    } else if (finish.includes('SURF') || name.includes('surf')) {
      classification.finishCode = 'SURF';
      classification.finishName = 'Surf';
    }

    if (ref.match(/^[A-Z]\d{3}$/)) {
      classification.decorCode = ref;
    }

    // Decor categories
    if (name.includes('noir') || name.includes('blanc') || name.includes('gris') || name.includes('bleu')) {
      classification.decorCategory = 'UNIS';
    } else if (name.includes('chêne') || name.includes('chene') || name.includes('érable') || name.includes('pommier') || name.includes('merisier') || name.includes('maryland') || name.includes('banian') || name.includes('zebra') || name.includes('pécan')) {
      classification.decorCategory = 'BOIS';
    } else if (name.includes('grès') || name.includes('gres') || name.includes('pierre')) {
      classification.decorCategory = 'PIERRE';
    } else if (name.includes('acier') || name.includes('métal') || name.includes('metal') || name.includes('brushed') || name.includes('pearl')) {
      classification.decorCategory = 'METAL';
    }
  }

  // === UNILIN ===
  else if (name.includes('unilin')) {
    classification.manufacturer = 'Unilin';

    if (panel.productType === 'BANDE_DE_CHANT') {
      classification.panelType = 'CHANT';
      classification.panelSubType = 'CHANT_ABS';
    } else if (panel.productType === 'STRATIFIE') {
      classification.panelType = 'STRATIFIE';
      classification.panelSubType = 'HPL';
    } else {
      classification.panelType = 'MELAMINE';
    }

    if (finish.includes('CST')) { classification.finishCode = 'CST'; classification.finishName = 'Crystal'; }
    else if (finish.includes('MST')) { classification.finishCode = 'MST'; classification.finishName = 'Master'; }
    else if (finish.includes('BST')) { classification.finishCode = 'BST'; classification.finishName = 'Basic'; }
    else if (finish.includes('V1A')) { classification.finishCode = 'V1A'; classification.finishName = 'Vernis'; }
  }

  // === DISPANO MELAMINE with Polyrey codes ===
  else if (name.includes('mélaminé décor') && ref.match(/^[A-Z]\d{3}$/)) {
    classification.manufacturer = 'Polyrey';
    classification.panelType = 'MELAMINE';
    classification.decorCode = ref;
    classification.finishCode = 'FIA';
    classification.finishName = 'Satin';

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

  // === DISPANO MELAMINE with numeric codes (Kronospan) ===
  else if (name.includes('mélaminé décor') && ref.match(/^\d{4}$/)) {
    classification.manufacturer = 'Kronospan';
    classification.panelType = 'MELAMINE';
    classification.decorCode = ref;

    if (name.includes(' sx ')) { classification.finishCode = 'SX'; classification.finishName = 'Silk'; }
    else if (name.includes(' tx ')) { classification.finishCode = 'TX'; classification.finishName = 'Texture'; }
    else if (name.includes(' sm ')) { classification.finishCode = 'SM'; classification.finishName = 'Smooth'; }
    else if (name.includes(' pe ')) { classification.finishCode = 'PE'; classification.finishName = 'Pearl'; }
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

    if (ref.startsWith('H')) { classification.decorCategory = 'BOIS'; }
    else if (ref.startsWith('U')) { classification.decorCategory = 'UNIS'; }
    else if (ref.startsWith('F')) { classification.decorCategory = 'FANTAISIE'; }
    else if (ref.startsWith('W')) { classification.decorCategory = 'UNIS'; }

    // Finishes
    const finishMatch = name.match(/st\d+/);
    if (finishMatch) {
      classification.finishCode = finishMatch[0].toUpperCase();
    }
  }

  // === PARTICULES / AGGLOMERE ===
  else if (name.includes('particule') || name.includes('aggloméré') || name.includes('agglomere') || panel.productType === 'PARTICULE') {
    classification.panelType = 'AGGLO_BRUT';
    classification.decorCategory = 'SANS_DECOR';

    if (name.includes('ignifuge')) { classification.isIgnifuge = true; }
    if (name.includes('hydrofuge') || name.includes('p3')) {
      classification.isHydrofuge = true;
      classification.coreType = 'P3';
    } else {
      classification.coreType = 'P2';
    }
  }

  // === MDF ===
  else if (panel.productType === 'MDF' || name.includes('mdf')) {
    classification.panelType = 'MDF';
    classification.coreType = 'MDF_STD';

    if (name.includes('hydrofuge') || name.includes('mdf h ') || name.includes('mdf-h')) {
      classification.isHydrofuge = true;
      classification.coreType = 'MDF_H';
    }
    if (name.includes('ignifuge') || name.includes('mdf fr')) {
      classification.isIgnifuge = true;
      classification.coreType = 'MDF_FR';
    }
    if (name.includes('laqué') || name.includes('laque')) {
      classification.panelSubType = 'MDF_LAQUE';
    } else if (name.includes('brut')) {
      classification.panelSubType = 'MDF_BRUT';
    }

    if (name.includes('noir') || name.includes('black')) { classification.coreColor = 'BLACK'; }
    else if (name.includes('blanc') || name.includes('white')) { classification.coreColor = 'WHITE'; }
  }

  // === CONTREPLAQUE ===
  else if (panel.productType === 'CONTREPLAQUE' || name.includes('contreplaqué') || name.includes('contreplaque') || name.includes('ctbx')) {
    classification.panelType = 'CONTREPLAQUE';
    classification.coreType = 'CONTREPLAQUE';

    if (name.includes('bouleau')) { classification.decorName = 'Bouleau'; classification.decorCategory = 'BOIS'; }
    else if (name.includes('peuplier')) { classification.decorName = 'Peuplier'; classification.decorCategory = 'BOIS'; }
    else if (name.includes('okoumé') || name.includes('okoume')) { classification.decorName = 'Okoumé'; classification.decorCategory = 'BOIS'; }
    else { classification.decorCategory = 'BOIS'; }

    if (name.includes('marine') || name.includes('extérieur') || name.includes('ctbx')) {
      classification.isHydrofuge = true;
    }
  }

  // === OSB ===
  else if (panel.productType === 'OSB' || name.includes('osb')) {
    classification.panelType = 'OSB';
    classification.decorCategory = 'SANS_DECOR';

    if (name.includes('osb3') || name.includes('osb 3')) { classification.isHydrofuge = true; }
    if (name.includes('osb4') || name.includes('osb 4')) { classification.isHydrofuge = true; }
  }

  // === BANDE DE CHANT (generic) ===
  else if (panel.productType === 'BANDE_DE_CHANT') {
    classification.panelType = 'CHANT';

    if (name.includes('abs')) { classification.panelSubType = 'CHANT_ABS'; }
    else if (name.includes('pvc')) { classification.panelSubType = 'CHANT_PVC'; }
    else if (name.includes('mélamine') || name.includes('melamine')) { classification.panelSubType = 'CHANT_MELAMINE'; }
    else if (name.includes('placage') || name.includes('bois')) { classification.panelSubType = 'CHANT_BOIS'; }
    else { classification.panelSubType = 'CHANT_ABS'; }

    // Extract Egger codes from name
    const eggerMatch = name.match(/[hufw]\d{3,4}/i);
    if (eggerMatch) {
      classification.manufacturer = 'Egger';
      classification.decorCode = eggerMatch[0].toUpperCase();
      if (eggerMatch[0].toUpperCase().startsWith('H')) { classification.decorCategory = 'BOIS'; }
      else if (eggerMatch[0].toUpperCase().startsWith('U')) { classification.decorCategory = 'UNIS'; }
    }
  }

  // === STRATIFIE (generic) ===
  else if (panel.productType === 'STRATIFIE') {
    classification.panelType = 'STRATIFIE';
    classification.panelSubType = 'HPL';

    // Try to extract manufacturer from name
    if (name.includes('egger')) { classification.manufacturer = 'Egger'; }
    else if (name.includes('pfleiderer')) { classification.manufacturer = 'Pfleiderer'; }
    else if (name.includes('formica')) { classification.manufacturer = 'Formica'; }
  }

  // === MELAMINE (generic fallback) ===
  else if (panel.productType === 'MELAMINE') {
    classification.panelType = 'MELAMINE';

    if (name.includes('blanc') || name.includes('white')) { classification.decorCategory = 'UNIS'; classification.decorName = 'Blanc'; }
    else if (name.includes('noir') || name.includes('black')) { classification.decorCategory = 'UNIS'; classification.decorName = 'Noir'; }
    else if (name.includes('chêne') || name.includes('chene') || name.includes('oak')) { classification.decorCategory = 'BOIS'; }
    else if (name.includes('noyer') || name.includes('walnut')) { classification.decorCategory = 'BOIS'; }
    else if (name.includes('hêtre') || name.includes('hetre') || name.includes('beech')) { classification.decorCategory = 'BOIS'; }

    if (name.includes('hydrofuge')) { classification.isHydrofuge = true; classification.coreType = 'P3'; }
  }

  // === SOLID SURFACE ===
  else if (panel.productType === 'SOLID_SURFACE') {
    classification.panelType = 'SOLID_SURFACE';
    classification.decorCategory = 'UNIS';

    if (name.includes('corian')) { classification.manufacturer = 'Corian'; }
    else if (name.includes('krion')) { classification.manufacturer = 'Krion'; }
    else if (name.includes('himacs')) { classification.manufacturer = 'HI-MACS'; }
  }

  // === MASSIF ===
  else if (panel.productType === 'PANNEAU_MASSIF' || panel.productType === 'PANNEAU_3_PLIS' || name.includes('massif') || name.includes('3 plis') || name.includes('3-plis')) {
    classification.panelType = 'MASSIF';

    if (name.includes('3 plis') || name.includes('3-plis') || name.includes('tripli')) {
      classification.panelSubType = 'MASSIF_3_PLIS';
    } else {
      classification.panelSubType = 'MASSIF_BOIS';
    }

    classification.decorCategory = 'BOIS';

    if (name.includes('chêne') || name.includes('chene')) { classification.decorName = 'Chêne'; }
    else if (name.includes('hêtre') || name.includes('hetre')) { classification.decorName = 'Hêtre'; }
    else if (name.includes('sapin') || name.includes('épicéa') || name.includes('epicea')) { classification.decorName = 'Sapin/Épicéa'; }
    else if (name.includes('pin')) { classification.decorName = 'Pin'; }
    else if (name.includes('noyer')) { classification.decorName = 'Noyer'; }
    else if (name.includes('frêne') || name.includes('frene')) { classification.decorName = 'Frêne'; }
  }

  // === PLACAGE ===
  else if (panel.productType === 'PLACAGE' || name.includes('placage')) {
    classification.panelType = 'PLACAGE';
    classification.decorCategory = 'BOIS';

    if (name.includes('chêne') || name.includes('chene')) { classification.decorName = 'Chêne'; }
    else if (name.includes('noyer')) { classification.decorName = 'Noyer'; }
    else if (name.includes('hêtre') || name.includes('hetre')) { classification.decorName = 'Hêtre'; }
  }

  // === COMPACT ===
  else if (panel.productType === 'COMPACT') {
    classification.panelType = 'COMPACT';
    classification.panelSubType = 'HPL';

    if (name.includes('noir') || name.includes('black')) { classification.decorCategory = 'UNIS'; }
    else if (name.includes('blanc') || name.includes('white')) { classification.decorCategory = 'UNIS'; }
    else { classification.decorCategory = 'UNIS'; }
  }

  return Object.keys(classification).length > 0 ? classification : null;
}

async function classifyAll() {
  console.log('=== CLASSIFICATION DE TOUS LES PANNEAUX ===\n');

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
  });

  console.log(`Panneaux à classifier: ${panels.length}\n`);

  let classified = 0;
  let skipped = 0;
  const skippedPanels: string[] = [];

  for (const panel of panels) {
    const classification = classifyPanel(panel);

    if (classification) {
      await prisma.panel.update({
        where: { id: panel.id },
        data: classification,
      });
      classified++;
      if (classified % 100 === 0) {
        console.log(`Progression: ${classified} / ${panels.length}`);
      }
    } else {
      skipped++;
      if (skippedPanels.length < 50) {
        skippedPanels.push(`${panel.reference}: ${panel.name.substring(0, 60)}`);
      }
    }
  }

  console.log(`\n=== RÉSULTAT ===`);
  console.log(`Classifiés: ${classified}`);
  console.log(`Non matchés: ${skipped}`);

  if (skippedPanels.length > 0) {
    console.log(`\nExemples de panneaux non matchés:`);
    skippedPanels.slice(0, 20).forEach((p) => console.log(`  - ${p}`));
  }

  // Final count
  const totalClassified = await prisma.panel.count({
    where: { isActive: true, panelType: { not: null } },
  });
  const total = await prisma.panel.count({ where: { isActive: true } });
  console.log(`\n=== PROGRESSION GLOBALE ===`);
  console.log(`Classifiés: ${totalClassified} / ${total} (${(totalClassified / total * 100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

classifyAll().catch(console.error);
