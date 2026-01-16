/**
 * Script d'analyse complete de la qualite des donnees de la bibliotheque de panneaux
 *
 * Usage: npx tsx scripts/comprehensive-data-quality-report.ts
 */

import { PrismaClient, ProductType, DecorCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface FieldCompleteness {
  field: string;
  total: number;
  filled: number;
  percentage: number;
}

interface TypeAnalysis {
  type: string;
  count: number;
  completeness: FieldCompleteness[];
}

interface PriceAnomaly {
  type: string;
  count: number;
  examples: { reference: string; name: string; price: number | null }[];
}

interface DimensionAnomaly {
  type: string;
  count: number;
  examples: { reference: string; name: string; width: number; height: number; thickness: number | null }[];
}

interface DuplicateGroup {
  reference: string;
  count: number;
}

// ============================================
// SECTION 1: Distribution par type de produit
// ============================================
async function analyzeProductTypeDistribution() {
  console.log('\n' + '='.repeat(80));
  console.log('1. DISTRIBUTION PAR TYPE DE PRODUIT (panelType)');
  console.log('='.repeat(80));

  // panelType (enum ProductType)
  const byPanelType = await prisma.panel.groupBy({
    by: ['panelType'],
    _count: true,
    where: { isActive: true },
    orderBy: { _count: { panelType: 'desc' } },
  });

  const total = byPanelType.reduce((sum, t) => sum + t._count, 0);

  console.log('\nDistribution panelType:');
  console.log('-'.repeat(50));

  byPanelType.forEach((t) => {
    const pct = ((t._count / total) * 100).toFixed(1);
    const bar = '#'.repeat(Math.round(t._count / total * 40));
    console.log(`  ${(t.panelType || 'NULL').padEnd(20)} ${String(t._count).padStart(6)} (${pct.padStart(5)}%) ${bar}`);
  });

  // productType (legacy string field)
  const byProductType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true,
    where: { isActive: true },
    orderBy: { _count: { productType: 'desc' } },
  });

  console.log('\n\nDistribution productType (champ legacy):');
  console.log('-'.repeat(50));

  byProductType.forEach((t) => {
    const pct = ((t._count / total) * 100).toFixed(1);
    console.log(`  ${(t.productType || 'NULL').padEnd(25)} ${String(t._count).padStart(6)} (${pct.padStart(5)}%)`);
  });

  // Par catalogue
  console.log('\n\nDistribution par catalogue:');
  console.log('-'.repeat(50));

  const catalogues = await prisma.catalogue.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { panels: true } },
    },
    orderBy: { panels: { _count: 'desc' } },
  });

  catalogues.forEach((c) => {
    console.log(`  ${c.name.padEnd(30)} ${String(c._count.panels).padStart(6)} panneaux`);
  });

  return { total, byPanelType, byProductType };
}

// ============================================
// SECTION 2: Completude des champs critiques
// ============================================
async function analyzeFieldCompleteness() {
  console.log('\n' + '='.repeat(80));
  console.log('2. COMPLETUDE DES CHAMPS CRITIQUES');
  console.log('='.repeat(80));

  const total = await prisma.panel.count({ where: { isActive: true } });

  // Liste des champs a verifier
  const fieldsToCheck = [
    { name: 'name', query: { name: { not: '' } } },
    { name: 'reference', query: { reference: { not: '' } } },
    { name: 'pricePerM2', query: { pricePerM2: { not: null } } },
    { name: 'pricePerMl', query: { pricePerMl: { not: null } } },
    { name: 'pricePerPanel', query: { pricePerPanel: { not: null } } },
    { name: 'pricePerUnit', query: { pricePerUnit: { not: null } } },
    { name: 'defaultWidth', query: { defaultWidth: { not: 0 } } },
    { name: 'defaultLength', query: { defaultLength: { not: 0 } } },
    { name: 'defaultThickness', query: { defaultThickness: { not: null } } },
    { name: 'decor', query: { decor: { not: null } } },
    { name: 'decorCode', query: { decorCode: { not: null } } },
    { name: 'decorName', query: { decorName: { not: null } } },
    { name: 'decorCategory', query: { decorCategory: { not: null } } },
    { name: 'finish', query: { finish: { not: null } } },
    { name: 'finishCode', query: { finishCode: { not: null } } },
    { name: 'finishName', query: { finishName: { not: null } } },
    { name: 'imageUrl', query: { imageUrl: { not: null } } },
    { name: 'manufacturer', query: { manufacturer: { not: null } } },
    { name: 'manufacturerRef', query: { manufacturerRef: { not: null } } },
    { name: 'categoryId', query: { categoryId: { not: null } } },
    { name: 'panelType', query: { panelType: { not: null } } },
    { name: 'productCategory', query: { productCategory: { not: null } } },
    { name: 'metadata', query: { metadata: { not: null } } },
  ];

  console.log('\nCompletude globale:');
  console.log('-'.repeat(70));
  console.log(`${'Champ'.padEnd(25)} ${'Remplis'.padStart(8)} ${'Total'.padStart(8)} ${'%'.padStart(7)}  Barre`);
  console.log('-'.repeat(70));

  const globalResults: FieldCompleteness[] = [];

  for (const field of fieldsToCheck) {
    const filled = await prisma.panel.count({
      where: { isActive: true, ...field.query },
    });
    const pct = (filled / total * 100).toFixed(1);
    const bar = getProgressBar(filled / total);

    globalResults.push({
      field: field.name,
      total,
      filled,
      percentage: parseFloat(pct),
    });

    console.log(`  ${field.name.padEnd(23)} ${String(filled).padStart(8)} ${String(total).padStart(8)} ${pct.padStart(6)}%  ${bar}`);
  }

  // Analyse par type de produit
  console.log('\n\nCompletude par panelType:');
  console.log('-'.repeat(70));

  const panelTypes = Object.values(ProductType);

  for (const pType of panelTypes) {
    const typeTotal = await prisma.panel.count({
      where: { isActive: true, panelType: pType },
    });

    if (typeTotal === 0) continue;

    console.log(`\n  [${pType}] (${typeTotal} panneaux)`);

    // Prix selon le type
    let priceField = 'pricePerM2';
    if (pType === 'CHANT') priceField = 'pricePerMl';

    const criticalFields = [
      { name: 'Prix', query: pType === 'CHANT'
        ? { OR: [{ pricePerMl: { not: null } }, { pricePerUnit: { not: null } }] }
        : { OR: [{ pricePerM2: { not: null } }, { pricePerPanel: { not: null } }] }
      },
      { name: 'Dimensions', query: { defaultWidth: { not: 0 }, defaultLength: { not: 0 } } },
      { name: 'Epaisseur', query: { defaultThickness: { not: null } } },
      { name: 'Decor', query: { OR: [{ decorCode: { not: null } }, { decorName: { not: null } }] } },
      { name: 'Finition', query: { OR: [{ finishCode: { not: null } }, { finishName: { not: null } }] } },
      { name: 'Image', query: { imageUrl: { not: null } } },
      { name: 'Fabricant', query: { manufacturer: { not: null } } },
    ];

    for (const field of criticalFields) {
      const filled = await prisma.panel.count({
        where: { isActive: true, panelType: pType, ...field.query },
      });
      const pct = (filled / typeTotal * 100).toFixed(1);
      const bar = getProgressBar(filled / typeTotal);
      console.log(`    ${field.name.padEnd(15)} ${pct.padStart(6)}% ${bar}`);
    }
  }

  return globalResults;
}

// ============================================
// SECTION 3: Anomalies de prix
// ============================================
async function analyzePriceAnomalies() {
  console.log('\n' + '='.repeat(80));
  console.log('3. ANOMALIES DE PRIX');
  console.log('='.repeat(80));

  const anomalies: PriceAnomaly[] = [];

  // Prix null ou 0 (panneaux, pas chants)
  const noPricePanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      panelType: { not: 'CHANT' },
      OR: [
        { pricePerM2: null },
        { pricePerM2: 0 },
      ],
      pricePerPanel: null,
    },
    select: { reference: true, name: true, pricePerM2: true, panelType: true },
    take: 10,
  });

  const noPriceCount = await prisma.panel.count({
    where: {
      isActive: true,
      panelType: { not: 'CHANT' },
      OR: [
        { pricePerM2: null },
        { pricePerM2: 0 },
      ],
      pricePerPanel: null,
    },
  });

  if (noPriceCount > 0) {
    anomalies.push({
      type: 'Panneaux sans prix (pricePerM2 null/0 et pricePerPanel null)',
      count: noPriceCount,
      examples: noPricePanels.map(p => ({ reference: p.reference, name: p.name, price: p.pricePerM2 })),
    });
  }

  // Chants sans prix
  const noPriceChants = await prisma.panel.findMany({
    where: {
      isActive: true,
      panelType: 'CHANT',
      pricePerMl: null,
      pricePerUnit: null,
    },
    select: { reference: true, name: true, pricePerMl: true },
    take: 10,
  });

  const noPriceChantsCount = await prisma.panel.count({
    where: {
      isActive: true,
      panelType: 'CHANT',
      pricePerMl: null,
      pricePerUnit: null,
    },
  });

  if (noPriceChantsCount > 0) {
    anomalies.push({
      type: 'Chants sans prix (pricePerMl et pricePerUnit null)',
      count: noPriceChantsCount,
      examples: noPriceChants.map(p => ({ reference: p.reference, name: p.name, price: p.pricePerMl })),
    });
  }

  // Prix tres eleves (> 500 EUR/m2)
  const highPricePanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      pricePerM2: { gt: 500 },
    },
    select: { reference: true, name: true, pricePerM2: true, panelType: true },
    orderBy: { pricePerM2: 'desc' },
    take: 10,
  });

  const highPriceCount = await prisma.panel.count({
    where: {
      isActive: true,
      pricePerM2: { gt: 500 },
    },
  });

  if (highPriceCount > 0) {
    anomalies.push({
      type: 'Prix eleves (> 500 EUR/m2) - peut etre normal pour certains materiaux',
      count: highPriceCount,
      examples: highPricePanels.map(p => ({ reference: p.reference, name: p.name, price: p.pricePerM2 })),
    });
  }

  // Prix tres bas (< 5 EUR/m2 mais > 0)
  const lowPricePanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      pricePerM2: { gt: 0, lt: 5 },
      panelType: { notIn: ['CHANT'] },
    },
    select: { reference: true, name: true, pricePerM2: true, panelType: true },
    orderBy: { pricePerM2: 'asc' },
    take: 10,
  });

  const lowPriceCount = await prisma.panel.count({
    where: {
      isActive: true,
      pricePerM2: { gt: 0, lt: 5 },
      panelType: { notIn: ['CHANT'] },
    },
  });

  if (lowPriceCount > 0) {
    anomalies.push({
      type: 'Prix suspects (< 5 EUR/m2) - peut etre prix par panneau mal interprete',
      count: lowPriceCount,
      examples: lowPricePanels.map(p => ({ reference: p.reference, name: p.name, price: p.pricePerM2 })),
    });
  }

  // Prix aberrants (> 1000 EUR/m2)
  const aberrantPricePanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      pricePerM2: { gt: 1000 },
    },
    select: { reference: true, name: true, pricePerM2: true, panelType: true },
    orderBy: { pricePerM2: 'desc' },
    take: 10,
  });

  const aberrantPriceCount = await prisma.panel.count({
    where: {
      isActive: true,
      pricePerM2: { gt: 1000 },
    },
  });

  if (aberrantPriceCount > 0) {
    anomalies.push({
      type: 'Prix aberrants (> 1000 EUR/m2) - probablement erreur de saisie',
      count: aberrantPriceCount,
      examples: aberrantPricePanels.map(p => ({ reference: p.reference, name: p.name, price: p.pricePerM2 })),
    });
  }

  // Affichage
  console.log('\nResume des anomalies de prix:');
  console.log('-'.repeat(70));

  for (const anomaly of anomalies) {
    const severity = anomaly.type.includes('aberrant') ? '[ERREUR]' :
                     anomaly.type.includes('sans prix') ? '[CRITIQUE]' : '[ATTENTION]';
    console.log(`\n${severity} ${anomaly.type}`);
    console.log(`   Nombre: ${anomaly.count}`);
    console.log('   Exemples:');
    anomaly.examples.slice(0, 5).forEach(ex => {
      console.log(`     - ${ex.reference}: ${ex.price ?? 'null'} EUR - "${(ex.name || '').substring(0, 40)}"`);
    });
  }

  // Stats globales de prix
  console.log('\n\nStatistiques de prix par type:');
  console.log('-'.repeat(70));

  const priceStats = await prisma.$queryRaw<{
    panelType: string;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    count: bigint;
  }[]>`
    SELECT
      "panelType",
      ROUND(AVG("pricePerM2")::numeric, 2) as "avgPrice",
      ROUND(MIN("pricePerM2")::numeric, 2) as "minPrice",
      ROUND(MAX("pricePerM2")::numeric, 2) as "maxPrice",
      COUNT(*) as count
    FROM "Panel"
    WHERE "isActive" = true AND "pricePerM2" IS NOT NULL AND "pricePerM2" > 0
    GROUP BY "panelType"
    ORDER BY "avgPrice" DESC
  `;

  console.log(`${'Type'.padEnd(20)} ${'Moy'.padStart(10)} ${'Min'.padStart(10)} ${'Max'.padStart(10)} ${'Nb'.padStart(8)}`);
  console.log('-'.repeat(60));

  priceStats.forEach(stat => {
    console.log(`${(stat.panelType || 'NULL').padEnd(20)} ${String(stat.avgPrice).padStart(10)} ${String(stat.minPrice).padStart(10)} ${String(stat.maxPrice).padStart(10)} ${String(stat.count).padStart(8)}`);
  });

  return anomalies;
}

// ============================================
// SECTION 4: Anomalies de dimensions
// ============================================
async function analyzeDimensionAnomalies() {
  console.log('\n' + '='.repeat(80));
  console.log('4. ANOMALIES DE DIMENSIONS');
  console.log('='.repeat(80));

  const anomalies: DimensionAnomaly[] = [];

  // Dimensions manquantes (hors chants)
  const missingDimsPanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      panelType: { not: 'CHANT' },
      OR: [
        { defaultWidth: 0 },
        { defaultLength: 0 },
      ],
    },
    select: { reference: true, name: true, defaultWidth: true, defaultLength: true, defaultThickness: true, panelType: true },
    take: 10,
  });

  const missingDimsCount = await prisma.panel.count({
    where: {
      isActive: true,
      panelType: { not: 'CHANT' },
      OR: [
        { defaultWidth: 0 },
        { defaultLength: 0 },
      ],
    },
  });

  if (missingDimsCount > 0) {
    anomalies.push({
      type: 'Dimensions manquantes (width ou length = 0)',
      count: missingDimsCount,
      examples: missingDimsPanels.map(p => ({
        reference: p.reference,
        name: p.name,
        width: p.defaultWidth,
        height: p.defaultLength,
        thickness: p.defaultThickness,
      })),
    });
  }

  // Epaisseur manquante
  const missingThicknessPanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      defaultThickness: null,
    },
    select: { reference: true, name: true, defaultWidth: true, defaultLength: true, defaultThickness: true, panelType: true },
    take: 10,
  });

  const missingThicknessCount = await prisma.panel.count({
    where: {
      isActive: true,
      defaultThickness: null,
    },
  });

  if (missingThicknessCount > 0) {
    anomalies.push({
      type: 'Epaisseur manquante (defaultThickness null)',
      count: missingThicknessCount,
      examples: missingThicknessPanels.map(p => ({
        reference: p.reference,
        name: p.name,
        width: p.defaultWidth,
        height: p.defaultLength,
        thickness: p.defaultThickness,
      })),
    });
  }

  // Dimensions aberrantes - largeur > longueur pour panneaux standards
  // (normalement longueur > largeur pour un panneau)
  const swappedDimsPanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      panelType: { notIn: ['CHANT', 'COMPACT'] },
      defaultWidth: { gt: 0 },
      defaultLength: { gt: 0 },
    },
    select: { reference: true, name: true, defaultWidth: true, defaultLength: true, defaultThickness: true, panelType: true },
  });

  const swappedCount = swappedDimsPanels.filter(p => p.defaultWidth > p.defaultLength).length;
  const swappedExamples = swappedDimsPanels.filter(p => p.defaultWidth > p.defaultLength).slice(0, 10);

  if (swappedCount > 0) {
    anomalies.push({
      type: 'Dimensions potentiellement inversees (largeur > longueur)',
      count: swappedCount,
      examples: swappedExamples.map(p => ({
        reference: p.reference,
        name: p.name,
        width: p.defaultWidth,
        height: p.defaultLength,
        thickness: p.defaultThickness,
      })),
    });
  }

  // Epaisseurs aberrantes (> 100mm)
  const aberrantThicknessPanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      defaultThickness: { gt: 100 },
    },
    select: { reference: true, name: true, defaultWidth: true, defaultLength: true, defaultThickness: true, panelType: true },
    take: 10,
  });

  const aberrantThicknessCount = await prisma.panel.count({
    where: {
      isActive: true,
      defaultThickness: { gt: 100 },
    },
  });

  if (aberrantThicknessCount > 0) {
    anomalies.push({
      type: 'Epaisseur aberrante (> 100mm)',
      count: aberrantThicknessCount,
      examples: aberrantThicknessPanels.map(p => ({
        reference: p.reference,
        name: p.name,
        width: p.defaultWidth,
        height: p.defaultLength,
        thickness: p.defaultThickness,
      })),
    });
  }

  // Epaisseurs tres petites pour panneaux (< 3mm et pas chant)
  const thinPanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      panelType: { notIn: ['CHANT', 'STRATIFIE'] },
      defaultThickness: { gt: 0, lt: 3 },
    },
    select: { reference: true, name: true, defaultWidth: true, defaultLength: true, defaultThickness: true, panelType: true },
    take: 10,
  });

  const thinPanelsCount = await prisma.panel.count({
    where: {
      isActive: true,
      panelType: { notIn: ['CHANT', 'STRATIFIE'] },
      defaultThickness: { gt: 0, lt: 3 },
    },
  });

  if (thinPanelsCount > 0) {
    anomalies.push({
      type: 'Panneaux tres fins (< 3mm, hors chants et stratifies)',
      count: thinPanelsCount,
      examples: thinPanels.map(p => ({
        reference: p.reference,
        name: p.name,
        width: p.defaultWidth,
        height: p.defaultLength,
        thickness: p.defaultThickness,
      })),
    });
  }

  // Affichage
  console.log('\nResume des anomalies de dimensions:');
  console.log('-'.repeat(70));

  for (const anomaly of anomalies) {
    const severity = anomaly.type.includes('aberrant') ? '[ERREUR]' :
                     anomaly.type.includes('manquant') ? '[CRITIQUE]' : '[ATTENTION]';
    console.log(`\n${severity} ${anomaly.type}`);
    console.log(`   Nombre: ${anomaly.count}`);
    console.log('   Exemples:');
    anomaly.examples.slice(0, 5).forEach(ex => {
      console.log(`     - ${ex.reference}: ${ex.width}x${ex.height}mm ep.${ex.thickness ?? 'null'}mm - "${(ex.name || '').substring(0, 35)}"`);
    });
  }

  // Stats globales de dimensions
  console.log('\n\nStatistiques de dimensions par type:');
  console.log('-'.repeat(80));

  const dimStats = await prisma.$queryRaw<{
    panelType: string;
    avgWidth: number;
    avgLength: number;
    avgThickness: number;
    count: bigint;
  }[]>`
    SELECT
      "panelType",
      ROUND(AVG("defaultWidth")::numeric, 0) as "avgWidth",
      ROUND(AVG("defaultLength")::numeric, 0) as "avgLength",
      ROUND(AVG("defaultThickness")::numeric, 1) as "avgThickness",
      COUNT(*) as count
    FROM "Panel"
    WHERE "isActive" = true AND "defaultThickness" IS NOT NULL
    GROUP BY "panelType"
    ORDER BY count DESC
  `;

  console.log(`${'Type'.padEnd(20)} ${'Larg.moy'.padStart(10)} ${'Long.moy'.padStart(10)} ${'Ep.moy'.padStart(10)} ${'Nb'.padStart(8)}`);
  console.log('-'.repeat(60));

  dimStats.forEach(stat => {
    console.log(`${(stat.panelType || 'NULL').padEnd(20)} ${String(stat.avgWidth).padStart(10)} ${String(stat.avgLength).padStart(10)} ${String(stat.avgThickness).padStart(10)} ${String(stat.count).padStart(8)}`);
  });

  // Epaisseurs disponibles par type
  console.log('\n\nEpaisseurs les plus courantes par type:');
  console.log('-'.repeat(70));

  for (const pType of Object.values(ProductType)) {
    const thicknesses = await prisma.$queryRaw<{ thickness: number; count: bigint }[]>`
      SELECT "defaultThickness" as thickness, COUNT(*) as count
      FROM "Panel"
      WHERE "isActive" = true AND "panelType" = ${pType}::"ProductType" AND "defaultThickness" IS NOT NULL
      GROUP BY "defaultThickness"
      ORDER BY count DESC
      LIMIT 5
    `;

    if (thicknesses.length > 0) {
      console.log(`  ${pType}: ${thicknesses.map(t => `${t.thickness}mm(${t.count})`).join(', ')}`);
    }
  }

  return anomalies;
}

// ============================================
// SECTION 5: Problemes d'images
// ============================================
async function analyzeImageIssues() {
  console.log('\n' + '='.repeat(80));
  console.log('5. PROBLEMES D\'IMAGES');
  console.log('='.repeat(80));

  // Panneaux sans image
  const noImagePanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      imageUrl: null,
    },
    select: { reference: true, name: true, panelType: true },
    take: 10,
  });

  const noImageCount = await prisma.panel.count({
    where: {
      isActive: true,
      imageUrl: null,
    },
  });

  const totalPanels = await prisma.panel.count({ where: { isActive: true } });
  const withImageCount = totalPanels - noImageCount;
  const withImagePct = ((withImageCount / totalPanels) * 100).toFixed(1);

  console.log('\nStatistiques images:');
  console.log('-'.repeat(50));
  console.log(`  Total panneaux:     ${totalPanels}`);
  console.log(`  Avec image:         ${withImageCount} (${withImagePct}%)`);
  console.log(`  Sans image:         ${noImageCount} (${(100 - parseFloat(withImagePct)).toFixed(1)}%)`);

  // Par type
  console.log('\n\nPanneaux sans image par type:');
  console.log('-'.repeat(50));

  const noImageByType = await prisma.panel.groupBy({
    by: ['panelType'],
    _count: true,
    where: { isActive: true, imageUrl: null },
    orderBy: { _count: { panelType: 'desc' } },
  });

  for (const t of noImageByType) {
    const typeTotal = await prisma.panel.count({
      where: { isActive: true, panelType: t.panelType },
    });
    const pct = typeTotal > 0 ? ((t._count / typeTotal) * 100).toFixed(1) : '0';
    console.log(`  ${(t.panelType || 'NULL').padEnd(20)} ${String(t._count).padStart(6)} / ${String(typeTotal).padStart(6)} (${pct}% sans image)`);
  }

  // Exemples de panneaux sans image
  if (noImagePanels.length > 0) {
    console.log('\n\nExemples de panneaux sans image:');
    noImagePanels.forEach(p => {
      console.log(`  - [${p.panelType || 'NULL'}] ${p.reference}: "${(p.name || '').substring(0, 50)}"`);
    });
  }

  // URLs suspectes
  const suspectUrls = await prisma.panel.findMany({
    where: {
      isActive: true,
      imageUrl: { not: null },
      OR: [
        { imageUrl: { startsWith: 'data:' } },
        { imageUrl: { contains: 'placeholder' } },
        { imageUrl: { contains: 'default' } },
      ],
    },
    select: { reference: true, imageUrl: true },
    take: 10,
  });

  if (suspectUrls.length > 0) {
    console.log('\n\n[ATTENTION] URLs d\'images suspectes (placeholders, data URIs):');
    suspectUrls.forEach(p => {
      console.log(`  - ${p.reference}: ${(p.imageUrl || '').substring(0, 60)}...`);
    });
  }

  return { noImageCount, withImageCount, totalPanels };
}

// ============================================
// SECTION 6: Doublons potentiels
// ============================================
async function analyzeDuplicates() {
  console.log('\n' + '='.repeat(80));
  console.log('6. DOUBLONS POTENTIELS');
  console.log('='.repeat(80));

  // References exactement identiques (meme catalogue)
  const duplicateRefs = await prisma.$queryRaw<{ reference: string; catalogueId: string; count: bigint }[]>`
    SELECT reference, "catalogueId", COUNT(*) as count
    FROM "Panel"
    WHERE "isActive" = true
    GROUP BY reference, "catalogueId"
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `;

  console.log('\n[CRITIQUE] References en double (meme catalogue):');
  console.log('-'.repeat(60));

  if (duplicateRefs.length === 0) {
    console.log('  Aucun doublon exact trouve');
  } else {
    for (const dup of duplicateRefs) {
      const catalogue = await prisma.catalogue.findUnique({
        where: { id: dup.catalogueId },
        select: { name: true },
      });
      console.log(`  ${dup.reference}: ${dup.count} occurrences dans "${catalogue?.name}"`);
    }
  }

  // Noms tres similaires (meme type, meme fabricant)
  console.log('\n\n[INFO] Recherche de noms tres similaires...');

  // Panneaux avec meme nom et meme type (possibles doublons)
  const sameNameType = await prisma.$queryRaw<{ name: string; panelType: string; count: bigint }[]>`
    SELECT name, "panelType", COUNT(*) as count
    FROM "Panel"
    WHERE "isActive" = true AND name IS NOT NULL AND name != ''
    GROUP BY name, "panelType"
    HAVING COUNT(*) > 2
    ORDER BY count DESC
    LIMIT 10
  `;

  if (sameNameType.length > 0) {
    console.log('\n  Panneaux avec nom et type identiques:');
    for (const dup of sameNameType) {
      console.log(`    "${(dup.name || '').substring(0, 40)}" [${dup.panelType}]: ${dup.count} occurrences`);
    }
  }

  // Memes codes decor mais references differentes
  const sameDecorCode = await prisma.$queryRaw<{ decorCode: string; count: bigint; refs: string }[]>`
    SELECT
      "decorCode",
      COUNT(*) as count,
      STRING_AGG(reference, ', ' ORDER BY reference) as refs
    FROM "Panel"
    WHERE "isActive" = true AND "decorCode" IS NOT NULL AND "decorCode" != ''
    GROUP BY "decorCode"
    HAVING COUNT(*) > 5
    ORDER BY count DESC
    LIMIT 10
  `;

  if (sameDecorCode.length > 0) {
    console.log('\n\n  [INFO] Codes decor avec beaucoup de panneaux (normal si plusieurs epaisseurs/formats):');
    for (const dec of sameDecorCode) {
      const refs = dec.refs.split(', ').slice(0, 3).join(', ');
      console.log(`    ${dec.decorCode}: ${dec.count} panneaux (${refs}...)`);
    }
  }

  return { duplicateRefs, sameNameType, sameDecorCode };
}

// ============================================
// SECTION 7: Resume et score de qualite
// ============================================
async function generateQualityScore() {
  console.log('\n' + '='.repeat(80));
  console.log('7. SCORE DE QUALITE GLOBAL');
  console.log('='.repeat(80));

  const total = await prisma.panel.count({ where: { isActive: true } });

  // Criteres de qualite
  const criteria = [
    {
      name: 'Prix renseigne',
      weight: 25,
      passed: await prisma.panel.count({
        where: {
          isActive: true,
          OR: [
            { pricePerM2: { gt: 0 } },
            { pricePerPanel: { gt: 0 } },
            { pricePerMl: { gt: 0 } },
            { pricePerUnit: { gt: 0 } },
          ],
        },
      }),
    },
    {
      name: 'Dimensions completes',
      weight: 20,
      passed: await prisma.panel.count({
        where: {
          isActive: true,
          defaultWidth: { gt: 0 },
          defaultLength: { gt: 0 },
          defaultThickness: { not: null },
        },
      }),
    },
    {
      name: 'Type de produit (panelType)',
      weight: 15,
      passed: await prisma.panel.count({
        where: { isActive: true, panelType: { not: null } },
      }),
    },
    {
      name: 'Image disponible',
      weight: 15,
      passed: await prisma.panel.count({
        where: { isActive: true, imageUrl: { not: null } },
      }),
    },
    {
      name: 'Decor identifie',
      weight: 10,
      passed: await prisma.panel.count({
        where: {
          isActive: true,
          OR: [
            { decorCode: { not: null } },
            { decorName: { not: null } },
          ],
        },
      }),
    },
    {
      name: 'Fabricant identifie',
      weight: 10,
      passed: await prisma.panel.count({
        where: { isActive: true, manufacturer: { not: null } },
      }),
    },
    {
      name: 'Categorie assignee',
      weight: 5,
      passed: await prisma.panel.count({
        where: { isActive: true, categoryId: { not: null } },
      }),
    },
  ];

  console.log('\nScore par critere:');
  console.log('-'.repeat(70));
  console.log(`${'Critere'.padEnd(30)} ${'Remplis'.padStart(8)} ${'Total'.padStart(8)} ${'%'.padStart(7)} ${'Poids'.padStart(6)} ${'Score'.padStart(6)}`);
  console.log('-'.repeat(70));

  let totalScore = 0;
  let totalWeight = 0;

  for (const c of criteria) {
    const pct = (c.passed / total * 100);
    const score = pct * c.weight / 100;
    totalScore += score;
    totalWeight += c.weight;

    console.log(`${c.name.padEnd(30)} ${String(c.passed).padStart(8)} ${String(total).padStart(8)} ${pct.toFixed(1).padStart(6)}% ${String(c.weight).padStart(5)}% ${score.toFixed(1).padStart(5)}`);
  }

  const finalScore = (totalScore / totalWeight * 100);

  console.log('-'.repeat(70));
  console.log(`${'SCORE GLOBAL'.padEnd(30)} ${' '.repeat(8)} ${' '.repeat(8)} ${' '.repeat(7)} ${String(totalWeight).padStart(5)}% ${finalScore.toFixed(1).padStart(5)}`);

  // Interpretation
  console.log('\n\nInterpretation du score:');
  console.log('-'.repeat(40));

  if (finalScore >= 90) {
    console.log('  [EXCELLENT] Donnees de tres haute qualite');
  } else if (finalScore >= 75) {
    console.log('  [BON] Donnees de bonne qualite, quelques ameliorations possibles');
  } else if (finalScore >= 60) {
    console.log('  [MOYEN] Qualite acceptable mais ameliorations necessaires');
  } else if (finalScore >= 40) {
    console.log('  [FAIBLE] Donnees incompletes, travail significatif requis');
  } else {
    console.log('  [CRITIQUE] Donnees tres incompletes, nettoyage urgent necessaire');
  }

  // Recommandations prioritaires
  console.log('\n\nRecommandations prioritaires:');
  console.log('-'.repeat(40));

  const sortedCriteria = [...criteria].sort((a, b) =>
    (a.passed / total) - (b.passed / total)
  );

  let priority = 1;
  for (const c of sortedCriteria.slice(0, 3)) {
    const pct = (c.passed / total * 100);
    if (pct < 90) {
      console.log(`  ${priority}. ${c.name}: ${pct.toFixed(1)}% complete - ${total - c.passed} panneaux a corriger`);
      priority++;
    }
  }

  return { finalScore, criteria };
}

// ============================================
// HELPERS
// ============================================
function getProgressBar(ratio: number): string {
  const filled = Math.round(ratio * 20);
  const empty = 20 - filled;
  return '[' + '#'.repeat(filled) + '-'.repeat(empty) + ']';
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('='.repeat(80));
  console.log('RAPPORT COMPLET DE QUALITE DES DONNEES - BIBLIOTHEQUE DE PANNEAUX');
  console.log('='.repeat(80));
  console.log(`Date: ${new Date().toISOString()}`);

  try {
    await analyzeProductTypeDistribution();
    await analyzeFieldCompleteness();
    await analyzePriceAnomalies();
    await analyzeDimensionAnomalies();
    await analyzeImageIssues();
    await analyzeDuplicates();
    await generateQualityScore();

    console.log('\n' + '='.repeat(80));
    console.log('FIN DU RAPPORT');
    console.log('='.repeat(80));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
