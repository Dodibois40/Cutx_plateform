/**
 * Classification intelligente des panneaux sans panelType (NULL)
 *
 * Ce script analyse le nom, la reference, les dimensions et autres attributs
 * pour determiner automatiquement le type de produit.
 *
 * Usage: npx tsx scripts/classify-null-panels.ts
 *
 * Types disponibles (enum ProductType):
 * - MELAMINE, STRATIFIE, COMPACT, PLACAGE, AGGLO_BRUT, MDF
 * - CONTREPLAQUE, OSB, MASSIF, CHANT, SOLID_SURFACE
 */

import { PrismaClient, ProductType, ProductSubType, DecorCategory, CoreType } from '@prisma/client';

const prisma = new PrismaClient();

// Interface pour un panneau a classifier
interface PanelToClassify {
  id: string;
  reference: string;
  name: string;
  productType: string | null;
  manufacturerRef: string | null;
  finish: string | null;
  material: string | null;
  defaultThickness: number | null;
  defaultWidth: number;
  defaultLength: number;
  thickness: number[];
  categoryId: string | null;
  category: { name: string; slug: string } | null;
}

// Interface pour le resultat de classification
interface Classification {
  panelType?: ProductType;
  panelSubType?: ProductSubType;
  decorCategory?: DecorCategory;
  coreType?: CoreType;
  manufacturer?: string;
  decorCode?: string;
  decorName?: string;
  finishCode?: string;
  finishName?: string;
  isHydrofuge?: boolean;
  isIgnifuge?: boolean;
  isPreglued?: boolean;
}

// Stats de classification
interface ClassificationStats {
  [key: string]: number;
}

/**
 * Fonction principale de classification
 * Applique les regles dans l'ordre de priorite
 */
function classifyPanel(panel: PanelToClassify): Classification | null {
  const name = panel.name.toLowerCase();
  const ref = panel.reference.toLowerCase();
  const manuRef = panel.manufacturerRef?.toLowerCase() || '';
  const finish = panel.finish?.toLowerCase() || '';
  const material = panel.material?.toLowerCase() || '';
  const categoryName = panel.category?.name?.toLowerCase() || '';
  const categorySlug = panel.category?.slug?.toLowerCase() || '';
  const productType = panel.productType?.toUpperCase() || '';
  const thickness = panel.defaultThickness;
  const width = panel.defaultWidth;
  const length = panel.defaultLength;

  const classification: Classification = {};

  // ========================================
  // REGLE 0: Exclusion des non-panneaux
  // Colle, accessoires, joints d'etancheite, etc.
  // ========================================
  if (
    productType === 'COLLE' ||
    productType === 'ACCESSOIRE' ||
    name.includes('mastic-colle') ||
    name.includes('mastic colle') ||
    name.includes("joint d'étanchéité") ||
    name.includes('joint d\'étanchéité') ||
    name.includes('colle complete') ||
    name.includes('disque scotch') ||
    name.includes('silicone')
  ) {
    // Ce n'est pas un panneau, on ne le classe pas
    return null;
  }

  // ========================================
  // REGLE 0b: Plans de travail lamelle-colle = MASSIF
  // ========================================
  if (
    productType === 'PLAN_DE_TRAVAIL' &&
    (name.includes('lamellé-collé') || name.includes('lamelle-colle') || name.includes('lamellé collé'))
  ) {
    classification.panelType = ProductType.MASSIF;
    classification.panelSubType = ProductSubType.LAMELLE_COLLE;
    classification.decorCategory = DecorCategory.BOIS;

    if (name.includes('chêne') || name.includes('chene')) classification.decorName = 'Chene';
    else if (name.includes('hêtre') || name.includes('hetre')) classification.decorName = 'Hetre';
    else if (name.includes('hévéa') || name.includes('hevea')) classification.decorName = 'Hevea';

    return classification;
  }

  // ========================================
  // REGLE 0c: Bois-ciment (Viroc) = AGGLO_BRUT special
  // ========================================
  if (
    productType === 'BOIS_CIMENT' ||
    name.includes('bois ciment') ||
    name.includes('viroc')
  ) {
    classification.panelType = ProductType.AGGLO_BRUT;
    classification.decorCategory = DecorCategory.SANS_DECOR;
    classification.manufacturer = 'Viroc';
    return classification;
  }

  // ========================================
  // REGLE 0d: Panneaux muraux etanches = COMPACT
  // ========================================
  if (
    productType === 'PANNEAU_MURAL' &&
    (name.includes('panneau étanche') || name.includes('panneau etanche'))
  ) {
    classification.panelType = ProductType.COMPACT;
    classification.panelSubType = ProductSubType.HPL;
    classification.manufacturer = 'Polyrey';

    // Extraire le code decor Polyrey
    const codeMatch = name.match(/([A-Z]\d{3})/);
    if (codeMatch) {
      classification.decorCode = codeMatch[1];
    }

    return classification;
  }

  // ========================================
  // REGLE 1: BANDE DE CHANT / CHANT
  // Priorite haute car tres distinctif
  // ========================================
  if (
    productType === 'BANDE_DE_CHANT' ||
    name.includes('chant ') ||
    name.includes('bande de chant') ||
    name.includes('chant abs') ||
    name.includes('chant pvc') ||
    name.includes('chant melamine') ||
    name.includes('alaise') ||
    name.includes('aleze') ||
    ref.startsWith('cht-') ||
    ref.includes('barr-cht') ||
    categorySlug.includes('chant') ||
    categoryName.includes('chant') ||
    categoryName.includes('bande') ||
    // Dimensions typiques des chants: epaisseur < 3mm, largeur < 100mm
    (thickness && thickness < 3 && width > 0 && width < 100)
  ) {
    classification.panelType = ProductType.CHANT;

    // Sous-type de chant
    if (name.includes('abs')) {
      classification.panelSubType = ProductSubType.CHANT_ABS;
    } else if (name.includes('pvc')) {
      classification.panelSubType = ProductSubType.CHANT_PVC;
    } else if (name.includes('melamine') || name.includes('mélaminé')) {
      classification.panelSubType = ProductSubType.CHANT_MELAMINE;
    } else if (name.includes('placage') || name.includes('bois massif')) {
      classification.panelSubType = ProductSubType.CHANT_BOIS;
    } else {
      // Default to ABS si non specifie
      classification.panelSubType = ProductSubType.CHANT_ABS;
    }

    // Precolle?
    if (name.includes('préencollé') || name.includes('preencollé') || name.includes('precolle') || name.includes('précollé')) {
      classification.isPreglued = true;
    }

    return classification;
  }

  // ========================================
  // REGLE 2: SOLID SURFACE
  // Materiaux composites haut de gamme
  // Includes "Resines" category (plans de travail en resine)
  // ========================================
  if (
    productType === 'SOLID_SURFACE' ||
    name.includes('solid surface') ||
    name.includes('corian') ||
    name.includes('kerrock') ||
    name.includes('himacs') ||
    name.includes('hi-macs') ||
    name.includes('krion') ||
    name.includes('staron') ||
    name.includes('getacore') ||
    name.includes('avonite') ||
    categoryName.includes('solid surface') ||
    categorySlug.includes('resine') ||
    categoryName.includes('résine') ||
    categoryName.includes('resine')
  ) {
    classification.panelType = ProductType.SOLID_SURFACE;
    classification.decorCategory = DecorCategory.UNIS;

    // Sous-types
    if (name.includes('acryl') || name.includes('corian') || name.includes('himacs') || name.includes('krion')) {
      classification.panelSubType = ProductSubType.SS_ACRYLIQUE;
    } else if (name.includes('polyester') || name.includes('kerrock')) {
      classification.panelSubType = ProductSubType.SS_POLYESTER;
    } else if (name.includes('quartz')) {
      classification.panelSubType = ProductSubType.SS_QUARTZ;
    }

    // Fabricants
    if (name.includes('corian')) classification.manufacturer = 'Corian';
    else if (name.includes('krion')) classification.manufacturer = 'Krion';
    else if (name.includes('himacs') || name.includes('hi-macs')) classification.manufacturer = 'HI-MACS';
    else if (name.includes('kerrock')) classification.manufacturer = 'Kerrock';
    else if (name.includes('staron')) classification.manufacturer = 'Staron';
    else if (name.includes('getacore')) classification.manufacturer = 'GetaCore';

    return classification;
  }

  // ========================================
  // REGLE 3: COMPACT
  // Panneaux compacts HPL pleine masse
  // ========================================
  if (
    productType === 'COMPACT' ||
    name.includes('compact ') ||
    name.includes('panneau compact') ||
    name.includes(' hpl compact') ||
    name.includes('compact hpl') ||
    name.includes('polyrey c ') ||
    name.includes('fundermax') ||
    name.includes('trespa') ||
    name.includes('max compact') ||
    categoryName.includes('compact')
  ) {
    classification.panelType = ProductType.COMPACT;
    classification.panelSubType = ProductSubType.HPL;

    // Fabricants
    if (name.includes('polyrey')) classification.manufacturer = 'Polyrey';
    else if (name.includes('fundermax')) classification.manufacturer = 'Fundermax';
    else if (name.includes('trespa')) classification.manufacturer = 'Trespa';
    else if (name.includes('arpa')) classification.manufacturer = 'Arpa';

    return classification;
  }

  // ========================================
  // REGLE 4: STRATIFIE (HPL/CPL feuilles)
  // Feuilles de stratifie < 2mm
  // ========================================
  if (
    productType === 'STRATIFIE' ||
    name.includes('stratifié ') ||
    name.includes('stratifie ') ||
    name.includes(' hpl ') ||
    name.includes(' cpl ') ||
    name.includes('feuille de stratifié') ||
    name.includes('fenix') ||
    name.includes('formica') ||
    categoryName.includes('stratifié') ||
    categorySlug.includes('stratifie') ||
    // Epaisseur typique stratifie: 0.6mm - 1.5mm
    (thickness && thickness > 0 && thickness < 2 && !name.includes('chant'))
  ) {
    classification.panelType = ProductType.STRATIFIE;

    // Sous-type HPL vs CPL
    if (name.includes('cpl')) {
      classification.panelSubType = ProductSubType.CPL;
    } else {
      classification.panelSubType = ProductSubType.HPL;
    }

    // Fabricants specifiques
    if (name.includes('fenix')) {
      classification.manufacturer = 'Fenix';
      classification.finishCode = 'NTM';
      classification.finishName = 'Nano Tech Matt';
    } else if (name.includes('formica')) {
      classification.manufacturer = 'Formica';
    } else if (name.includes('polyrey')) {
      classification.manufacturer = 'Polyrey';
    } else if (name.includes('egger') || manuRef.match(/^[hufw]\d{3,4}/)) {
      classification.manufacturer = 'Egger';
    }

    return classification;
  }

  // ========================================
  // REGLE 5: MDF
  // Medium Density Fiberboard
  // ========================================
  if (
    productType === 'MDF' ||
    name.includes('mdf') ||
    name.includes('médium') ||
    name.includes('medium') ||
    name.includes('fibre de bois') ||
    categoryName.includes('mdf')
  ) {
    classification.panelType = ProductType.MDF;
    classification.coreType = CoreType.MDF_STD;

    // Sous-types MDF
    if (name.includes('laqué') || name.includes('laque')) {
      classification.panelSubType = ProductSubType.MDF_LAQUE;
    } else if (name.includes('plaqué') || name.includes('plaque')) {
      classification.panelSubType = ProductSubType.MDF_PLAQUE;
    } else {
      classification.panelSubType = ProductSubType.MDF_BRUT;
    }

    // Hydrofuge
    if (name.includes('hydrofuge') || name.includes('mdf h ') || name.includes('mdf-h') || name.includes('hdf')) {
      classification.isHydrofuge = true;
      classification.coreType = CoreType.MDF_H;
    }

    // Ignifuge
    if (name.includes('ignifuge') || name.includes('m1') || name.includes('mdf fr') || name.includes('fire retardant')) {
      classification.isIgnifuge = true;
      classification.coreType = CoreType.MDF_FR;
    }

    // Couleur du coeur
    if (name.includes('noir') || name.includes('black') || name.includes('valchromat')) {
      classification.decorCategory = DecorCategory.SANS_DECOR;
    }

    return classification;
  }

  // ========================================
  // REGLE 6: CONTREPLAQUE
  // Multiplis, bouleau, okoume, peuplier
  // ========================================
  if (
    productType === 'CONTREPLAQUE' ||
    name.includes('contreplaqué') ||
    name.includes('contreplaque') ||
    name.includes('multipli') ||
    name.includes('multi-pli') ||
    name.includes('ctbx') ||
    name.includes('ctbh') ||
    name.includes('bouleau') ||
    name.includes('okoumé') ||
    name.includes('okoume') ||
    name.includes('peuplier') ||
    name.includes('panneau marin') ||
    categoryName.includes('contreplaque') ||
    categoryName.includes('multipli')
  ) {
    classification.panelType = ProductType.CONTREPLAQUE;
    classification.coreType = CoreType.CONTREPLAQUE;
    classification.decorCategory = DecorCategory.BOIS;

    // Essence specifique
    if (name.includes('bouleau')) {
      classification.decorName = 'Bouleau';
    } else if (name.includes('okoumé') || name.includes('okoume')) {
      classification.decorName = 'Okoume';
    } else if (name.includes('peuplier')) {
      classification.decorName = 'Peuplier';
    } else if (name.includes('sapin') || name.includes('epicéa') || name.includes('epicea')) {
      classification.decorName = 'Sapin';
    }

    // Hydrofuge
    if (name.includes('marine') || name.includes('extérieur') || name.includes('ctbx') || name.includes('ext.')) {
      classification.isHydrofuge = true;
    }

    return classification;
  }

  // ========================================
  // REGLE 7: OSB
  // Oriented Strand Board
  // ========================================
  if (
    productType === 'OSB' ||
    name.includes('osb') ||
    name.includes('oriented strand') ||
    categoryName.includes('osb')
  ) {
    classification.panelType = ProductType.OSB;
    classification.decorCategory = DecorCategory.SANS_DECOR;

    // OSB3/4 = hydrofuge
    if (name.includes('osb3') || name.includes('osb 3') || name.includes('osb4') || name.includes('osb 4')) {
      classification.isHydrofuge = true;
    }

    return classification;
  }

  // ========================================
  // REGLE 8: AGGLO BRUT / PARTICULES
  // Panneaux de particules sans decor
  // ========================================
  if (
    productType === 'PARTICULE' ||
    productType === 'AGGLO' ||
    name.includes('aggloméré') ||
    name.includes('agglomere') ||
    name.includes('panneau de particule') ||
    name.includes('particules') ||
    name.includes('novopan') ||
    name.includes('panneau support') ||
    categoryName.includes('particule') ||
    categoryName.includes('agglomere')
  ) {
    classification.panelType = ProductType.AGGLO_BRUT;
    classification.decorCategory = DecorCategory.SANS_DECOR;

    // P2 vs P3
    if (name.includes('hydrofuge') || name.includes('p3') || name.includes('ctbh') || name.includes('vert')) {
      classification.isHydrofuge = true;
      classification.coreType = CoreType.P3;
    } else {
      classification.coreType = CoreType.P2;
    }

    // Ignifuge
    if (name.includes('ignifuge') || name.includes('m1') || name.includes('fire')) {
      classification.isIgnifuge = true;
    }

    return classification;
  }

  // ========================================
  // REGLE 9: MASSIF / BOIS MASSIF
  // Panneaux de bois massif, lamelle-colle, 3 plis
  // ========================================
  if (
    productType === 'PANNEAU_MASSIF' ||
    productType === 'PANNEAU_3_PLIS' ||
    name.includes('bois massif') ||
    name.includes('panneau massif') ||
    name.includes('3 plis') ||
    name.includes('3-plis') ||
    name.includes('tripli') ||
    name.includes('lamellé collé') ||
    name.includes('lamelle colle') ||
    name.includes('lamelle-colle') ||
    categoryName.includes('massif') ||
    categoryName.includes('3 plis')
  ) {
    classification.panelType = ProductType.MASSIF;
    classification.decorCategory = DecorCategory.BOIS;

    // Sous-types
    if (name.includes('3 plis') || name.includes('3-plis') || name.includes('tripli')) {
      classification.panelSubType = ProductSubType.MASSIF_3_PLIS;
    } else if (name.includes('lamellé') || name.includes('lamelle')) {
      classification.panelSubType = ProductSubType.LAMELLE_COLLE;
    } else {
      classification.panelSubType = ProductSubType.MASSIF_BOIS;
    }

    // Essences
    if (name.includes('chêne') || name.includes('chene') || name.includes('oak')) {
      classification.decorName = 'Chene';
    } else if (name.includes('hêtre') || name.includes('hetre') || name.includes('beech')) {
      classification.decorName = 'Hetre';
    } else if (name.includes('sapin') || name.includes('épicéa') || name.includes('epicea')) {
      classification.decorName = 'Sapin';
    } else if (name.includes('pin') || name.includes('pine')) {
      classification.decorName = 'Pin';
    } else if (name.includes('noyer') || name.includes('walnut')) {
      classification.decorName = 'Noyer';
    } else if (name.includes('frêne') || name.includes('frene') || name.includes('ash')) {
      classification.decorName = 'Frene';
    }

    return classification;
  }

  // ========================================
  // REGLE 10: PLACAGE
  // Panneaux plaques bois veritable
  // ========================================
  if (
    productType === 'PLACAGE' ||
    name.includes('placage') ||
    name.includes('plaqué bois') ||
    name.includes('plaque bois') ||
    name.includes('feuille de bois') ||
    categoryName.includes('placage')
  ) {
    classification.panelType = ProductType.PLACAGE;
    classification.decorCategory = DecorCategory.BOIS;

    // Essences
    if (name.includes('chêne') || name.includes('chene')) {
      classification.decorName = 'Chene';
    } else if (name.includes('noyer')) {
      classification.decorName = 'Noyer';
    } else if (name.includes('hêtre') || name.includes('hetre')) {
      classification.decorName = 'Hetre';
    } else if (name.includes('wengé') || name.includes('wenge')) {
      classification.decorName = 'Wenge';
    } else if (name.includes('zebrano')) {
      classification.decorName = 'Zebrano';
    }

    return classification;
  }

  // ========================================
  // REGLE 11: MELAMINE (detection par codes Egger)
  // Codes H, U, F, W typiques Egger
  // ========================================
  const eggerCodeMatch = manuRef.match(/^([hufw])(\d{3,4})/i) || name.match(/\b([hufw])(\d{3,4})\b/i);
  if (eggerCodeMatch) {
    classification.panelType = ProductType.MELAMINE;
    classification.manufacturer = 'Egger';
    classification.decorCode = eggerCodeMatch[0].toUpperCase();

    const prefix = eggerCodeMatch[1].toUpperCase();
    if (prefix === 'H') classification.decorCategory = DecorCategory.BOIS;
    else if (prefix === 'U') classification.decorCategory = DecorCategory.UNIS;
    else if (prefix === 'F') classification.decorCategory = DecorCategory.FANTAISIE;
    else if (prefix === 'W') classification.decorCategory = DecorCategory.UNIS;

    // Finitions ST
    const stMatch = name.match(/st(\d+)/i);
    if (stMatch) {
      classification.finishCode = `ST${stMatch[1]}`;
    }

    return classification;
  }

  // ========================================
  // REGLE 12: MELAMINE (detection par codes Polyrey)
  // Codes A-Z + 3 chiffres
  // ========================================
  const polyreyCodeMatch = manuRef.match(/^([a-z])(\d{3})$/i) || ref.match(/^([a-z])(\d{3})$/i);
  if (polyreyCodeMatch) {
    classification.panelType = ProductType.MELAMINE;
    classification.manufacturer = 'Polyrey';
    classification.decorCode = polyreyCodeMatch[0].toUpperCase();

    const prefix = polyreyCodeMatch[1].toUpperCase();
    if (['B', 'E', 'M', 'D', 'H', 'C', 'Z'].includes(prefix)) {
      classification.decorCategory = DecorCategory.BOIS;
    } else if (['G', 'N'].includes(prefix)) {
      classification.decorCategory = DecorCategory.UNIS;
    } else if (['A', 'P'].includes(prefix)) {
      classification.decorCategory = DecorCategory.METAL;
    }

    return classification;
  }

  // ========================================
  // REGLE 13: MELAMINE (detection par nom/productType)
  // ========================================
  if (
    productType === 'MELAMINE' ||
    name.includes('mélaminé') ||
    name.includes('melamine') ||
    name.includes('panneau mél') ||
    name.includes('panneau mel') ||
    name.includes('décor mélaminé') ||
    name.includes('decor melamine') ||
    categoryName.includes('melamine') ||
    categoryName.includes('mélaminé')
  ) {
    classification.panelType = ProductType.MELAMINE;

    // Categorie decor par mot-cle
    if (name.includes('blanc') || name.includes('white') || name.includes('noir') || name.includes('black') ||
        name.includes('gris') || name.includes('grey') || name.includes('gray') || name.includes('uni ')) {
      classification.decorCategory = DecorCategory.UNIS;
    } else if (name.includes('chêne') || name.includes('chene') || name.includes('oak') ||
               name.includes('noyer') || name.includes('walnut') || name.includes('hêtre') ||
               name.includes('bois') || name.includes('wood')) {
      classification.decorCategory = DecorCategory.BOIS;
    } else if (name.includes('béton') || name.includes('beton') || name.includes('concrete')) {
      classification.decorCategory = DecorCategory.BETON;
    } else if (name.includes('pierre') || name.includes('stone') || name.includes('marbre') || name.includes('marble')) {
      classification.decorCategory = DecorCategory.PIERRE;
    } else if (name.includes('métal') || name.includes('metal') || name.includes('acier') || name.includes('alu')) {
      classification.decorCategory = DecorCategory.METAL;
    }

    // Hydrofuge
    if (name.includes('hydrofuge') || name.includes('p3') || name.includes('vert')) {
      classification.isHydrofuge = true;
      classification.coreType = CoreType.P3;
    }

    // Fabricants
    if (name.includes('egger')) classification.manufacturer = 'Egger';
    else if (name.includes('kronospan')) classification.manufacturer = 'Kronospan';
    else if (name.includes('unilin')) classification.manufacturer = 'Unilin';
    else if (name.includes('polyrey')) classification.manufacturer = 'Polyrey';
    else if (name.includes('pfleiderer')) classification.manufacturer = 'Pfleiderer';

    return classification;
  }

  // ========================================
  // REGLE 14: MELAMINE par defaut
  // Si panneau standard sans autre indication
  // Epaisseurs typiques: 8, 10, 12, 16, 18, 19, 22, 25mm
  // ========================================
  const typicalMelamineThickness = [8, 10, 12, 16, 18, 19, 22, 25];
  if (
    thickness &&
    typicalMelamineThickness.includes(thickness) &&
    !name.includes('brut') &&
    !name.includes('support') &&
    width > 500 &&
    panel.defaultLength > 1000
  ) {
    // Si c'est un panneau de taille standard avec epaisseur typique et pas brut
    // On suppose que c'est du melamine
    classification.panelType = ProductType.MELAMINE;
    return classification;
  }

  // ========================================
  // REGLE 15: AGGLO_BRUT par defaut
  // Si panneau avec "brut", "support", "ame" dans le nom
  // ========================================
  if (
    name.includes('brut') ||
    name.includes('support') ||
    name.includes('âme') ||
    name.includes('ame ') ||
    name.includes('panneau nu')
  ) {
    classification.panelType = ProductType.AGGLO_BRUT;
    classification.decorCategory = DecorCategory.SANS_DECOR;
    classification.coreType = CoreType.P2;

    if (name.includes('hydrofuge') || name.includes('p3') || name.includes('vert')) {
      classification.isHydrofuge = true;
      classification.coreType = CoreType.P3;
    }

    return classification;
  }

  // ========================================
  // REGLE 16: STRATIFIE par category "Panneaux Deco"
  // Panneaux decoratifs fins (4-6mm) sont souvent des stratifies
  // ========================================
  if (
    (categoryName.includes('déco') || categoryName.includes('deco') || categorySlug.includes('deco')) &&
    thickness &&
    thickness > 3 &&
    thickness < 10
  ) {
    classification.panelType = ProductType.STRATIFIE;
    classification.panelSubType = ProductSubType.HPL;
    return classification;
  }

  // ========================================
  // REGLE 17: COMPACT par category "Compact" ou epaisseur typique
  // Panneaux epais (10-13mm) sans autre indication
  // ========================================
  if (
    thickness &&
    thickness >= 10 &&
    thickness <= 13 &&
    width > 1000 &&
    length > 2000
  ) {
    classification.panelType = ProductType.COMPACT;
    classification.panelSubType = ProductSubType.HPL;
    return classification;
  }

  // ========================================
  // REGLE 18: MELAMINE fallback final
  // Pour "Panneau Standard" generique avec dimensions normales
  // ========================================
  if (
    name === 'panneau standard' &&
    width > 500 &&
    length > 1000
  ) {
    classification.panelType = ProductType.MELAMINE;
    return classification;
  }

  // Aucune regle ne correspond
  return null;
}

/**
 * Affiche les statistiques avant classification
 */
async function showStatsBefore(): Promise<number> {
  console.log('\n' + '='.repeat(70));
  console.log('STATISTIQUES AVANT CLASSIFICATION');
  console.log('='.repeat(70));

  const total = await prisma.panel.count({ where: { isActive: true } });
  const withType = await prisma.panel.count({ where: { isActive: true, panelType: { not: null } } });
  const withoutType = await prisma.panel.count({ where: { isActive: true, panelType: null } });

  console.log(`\nTotal panneaux actifs:     ${total.toLocaleString()}`);
  console.log(`Avec panelType:            ${withType.toLocaleString()} (${(withType / total * 100).toFixed(1)}%)`);
  console.log(`Sans panelType (NULL):     ${withoutType.toLocaleString()} (${(withoutType / total * 100).toFixed(1)}%)`);

  // Distribution par productType (champ legacy)
  const byProductType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true,
    where: { isActive: true, panelType: null },
    orderBy: { _count: { productType: 'desc' } },
  });

  console.log('\nDistribution des panneaux NULL par productType (legacy):');
  console.log('-'.repeat(50));
  byProductType.forEach(t => {
    console.log(`  ${(t.productType || 'NULL').padEnd(25)} ${String(t._count).padStart(6)}`);
  });

  return withoutType;
}

/**
 * Affiche les statistiques apres classification
 */
async function showStatsAfter(stats: ClassificationStats): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('STATISTIQUES APRES CLASSIFICATION');
  console.log('='.repeat(70));

  const total = await prisma.panel.count({ where: { isActive: true } });
  const withType = await prisma.panel.count({ where: { isActive: true, panelType: { not: null } } });
  const withoutType = await prisma.panel.count({ where: { isActive: true, panelType: null } });

  console.log(`\nTotal panneaux actifs:     ${total.toLocaleString()}`);
  console.log(`Avec panelType:            ${withType.toLocaleString()} (${(withType / total * 100).toFixed(1)}%)`);
  console.log(`Sans panelType (NULL):     ${withoutType.toLocaleString()} (${(withoutType / total * 100).toFixed(1)}%)`);

  // Distribution par type classifie
  console.log('\nPanneaux classifies par type:');
  console.log('-'.repeat(50));

  const sortedStats = Object.entries(stats)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  sortedStats.forEach(([type, count]) => {
    const bar = '#'.repeat(Math.ceil(count / 50));
    console.log(`  ${type.padEnd(20)} ${String(count).padStart(6)} ${bar}`);
  });

  // Distribution finale par panelType
  const byPanelType = await prisma.panel.groupBy({
    by: ['panelType'],
    _count: true,
    where: { isActive: true },
    orderBy: { _count: { panelType: 'desc' } },
  });

  console.log('\nDistribution finale panelType:');
  console.log('-'.repeat(50));
  byPanelType.forEach(t => {
    const pct = (t._count / total * 100).toFixed(1);
    console.log(`  ${(t.panelType || 'NULL').padEnd(20)} ${String(t._count).padStart(6)} (${pct.padStart(5)}%)`);
  });
}

/**
 * Fonction principale
 */
async function classifyNullPanels(): Promise<void> {
  console.log('='.repeat(70));
  console.log('CLASSIFICATION DES PANNEAUX SANS TYPE (panelType = NULL)');
  console.log('='.repeat(70));
  console.log(`Date: ${new Date().toISOString()}`);

  // Stats avant
  const toClassify = await showStatsBefore();

  if (toClassify === 0) {
    console.log('\nAucun panneau a classifier. Tous les panneaux ont deja un type.');
    await prisma.$disconnect();
    return;
  }

  // Recuperer les panneaux sans type
  console.log('\n' + '='.repeat(70));
  console.log('CLASSIFICATION EN COURS...');
  console.log('='.repeat(70));

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
      material: true,
      defaultThickness: true,
      defaultWidth: true,
      defaultLength: true,
      thickness: true,
      categoryId: true,
      category: {
        select: { name: true, slug: true },
      },
    },
  });

  console.log(`\nPanneaux a traiter: ${panels.length.toLocaleString()}`);

  // Statistiques de classification
  const stats: ClassificationStats = {
    MELAMINE: 0,
    STRATIFIE: 0,
    COMPACT: 0,
    PLACAGE: 0,
    AGGLO_BRUT: 0,
    MDF: 0,
    CONTREPLAQUE: 0,
    OSB: 0,
    MASSIF: 0,
    CHANT: 0,
    SOLID_SURFACE: 0,
    NON_CLASSIFIE: 0,
  };

  // Exemples de panneaux non classifies
  const unclassified: { ref: string; name: string; productType: string | null }[] = [];

  // Classifier les panneaux par batch pour performance
  const batchSize = 100;
  let processed = 0;
  let classified = 0;

  for (let i = 0; i < panels.length; i += batchSize) {
    const batch = panels.slice(i, i + batchSize);
    const updates: { id: string; data: Classification }[] = [];

    for (const panel of batch) {
      const classification = classifyPanel(panel);

      if (classification && classification.panelType) {
        updates.push({ id: panel.id, data: classification });
        stats[classification.panelType]++;
        classified++;
      } else {
        stats.NON_CLASSIFIE++;
        if (unclassified.length < 100) {
          unclassified.push({
            ref: panel.reference,
            name: panel.name.substring(0, 60),
            productType: panel.productType,
          });
        }
      }
    }

    // Appliquer les mises a jour
    for (const update of updates) {
      await prisma.panel.update({
        where: { id: update.id },
        data: update.data,
      });
    }

    processed += batch.length;

    // Afficher la progression
    if (processed % 500 === 0 || processed === panels.length) {
      const pct = (processed / panels.length * 100).toFixed(1);
      console.log(`  Progression: ${processed.toLocaleString()} / ${panels.length.toLocaleString()} (${pct}%) - Classifies: ${classified.toLocaleString()}`);
    }
  }

  // Stats apres
  await showStatsAfter(stats);

  // Afficher les panneaux non classifies
  if (unclassified.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log(`EXEMPLES DE PANNEAUX NON CLASSIFIES (${stats.NON_CLASSIFIE} total)`);
    console.log('='.repeat(70));
    console.log('\nLes 50 premiers:');

    unclassified.slice(0, 50).forEach((p, i) => {
      console.log(`  ${String(i + 1).padStart(3)}. [${(p.productType || 'NULL').padEnd(15)}] ${p.ref}: ${p.name}`);
    });

    if (unclassified.length > 50) {
      console.log(`  ... et ${unclassified.length - 50} autres`);
    }
  }

  // Resume final
  console.log('\n' + '='.repeat(70));
  console.log('RESUME');
  console.log('='.repeat(70));
  console.log(`  Panneaux traites:     ${panels.length.toLocaleString()}`);
  console.log(`  Panneaux classifies:  ${classified.toLocaleString()} (${(classified / panels.length * 100).toFixed(1)}%)`);
  console.log(`  Non classifies:       ${stats.NON_CLASSIFIE.toLocaleString()} (${(stats.NON_CLASSIFIE / panels.length * 100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

// Execution
classifyNullPanels().catch(console.error);
