/**
 * Comprehensive analysis of search quality and data issues
 * Run with: npx tsx scripts/analyze-search-quality.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AnalysisResult {
  category: string;
  issue: string;
  count: number;
  examples: string[];
}

const results: AnalysisResult[] = [];

async function main() {
  console.log('🔍 ANALYSE COMPLÈTE DE LA QUALITÉ DE RECHERCHE\n');
  console.log('='.repeat(60) + '\n');

  // 1. Stats générales
  await analyzeGeneralStats();

  // 2. Analyse des searchVector vides ou null
  await analyzeEmptySearchVectors();

  // 3. Analyse des prix manquants par type de produit
  await analyzeMissingPrices();

  // 4. Analyse des épaisseurs suspectes
  await analyzeSuspiciousThickness();

  // 5. Test de recherches courantes
  await testCommonSearches();

  // 6. Analyse des doublons potentiels
  await analyzePotentialDuplicates();

  // 7. Analyse des données incohérentes
  await analyzeInconsistentData();

  // 8. Résumé des problèmes
  printSummary();

  await prisma.$disconnect();
}

async function analyzeGeneralStats() {
  console.log('📊 1. STATISTIQUES GÉNÉRALES\n');

  const totalPanels = await prisma.panel.count();
  const activePanels = await prisma.panel.count({ where: { isActive: true } });

  const byCatalogue = await prisma.panel.groupBy({
    by: ['catalogueId'],
    _count: { id: true },
    where: { isActive: true },
  });

  const catalogues = await prisma.catalogue.findMany({
    select: { id: true, name: true },
  });

  const catalogueMap = new Map(catalogues.map(c => [c.id, c.name]));

  console.log(`   Total panneaux: ${totalPanels}`);
  console.log(`   Panneaux actifs: ${activePanels}`);
  console.log('\n   Par catalogue:');
  for (const cat of byCatalogue) {
    console.log(`   - ${catalogueMap.get(cat.catalogueId) || 'Unknown'}: ${cat._count.id}`);
  }

  const byProductType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: { id: true },
    where: { isActive: true },
  });

  console.log('\n   Par type de produit:');
  for (const pt of byProductType) {
    console.log(`   - ${pt.productType || 'NULL'}: ${pt._count.id}`);
  }
  console.log('');
}

async function analyzeEmptySearchVectors() {
  console.log('📊 2. ANALYSE DES VECTEURS DE RECHERCHE\n');

  // Panels with null or empty searchVector
  const nullSearchVector = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Panel"
    WHERE "searchVector" IS NULL AND "isActive" = true
  `;

  const emptySearchText = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Panel"
    WHERE ("searchText" IS NULL OR "searchText" = '') AND "isActive" = true
  `;

  console.log(`   searchVector NULL: ${nullSearchVector[0].count}`);
  console.log(`   searchText vide/NULL: ${emptySearchText[0].count}`);

  if (Number(nullSearchVector[0].count) > 0) {
    const examples = await prisma.$queryRaw<{ reference: string; name: string }[]>`
      SELECT reference, name FROM "Panel"
      WHERE "searchVector" IS NULL AND "isActive" = true
      LIMIT 5
    `;
    console.log('   Exemples avec searchVector NULL:');
    examples.forEach(e => console.log(`   - ${e.reference}: ${e.name.substring(0, 50)}...`));

    results.push({
      category: 'searchVector',
      issue: 'Panneaux avec searchVector NULL',
      count: Number(nullSearchVector[0].count),
      examples: examples.map(e => e.reference),
    });
  }
  console.log('');
}

async function analyzeMissingPrices() {
  console.log('📊 3. ANALYSE DES PRIX MANQUANTS\n');

  // Par type de produit
  const productTypes = ['MELAMINE', 'STRATIFIE', 'BANDE_DE_CHANT', 'MDF', 'CONTREPLAQUE', 'PARTICULE', 'PANNEAU_MASSIF', 'PLACAGE', 'COMPACT'];

  for (const productType of productTypes) {
    const noPriceM2 = await prisma.panel.count({
      where: {
        productType,
        isActive: true,
        pricePerM2: null,
      },
    });

    const total = await prisma.panel.count({
      where: { productType, isActive: true },
    });

    if (total > 0 && noPriceM2 > 0) {
      const percentage = Math.round((noPriceM2 / total) * 100);

      // Pour les bandes de chant, vérifier pricePerMl plutôt que pricePerM2
      if (productType === 'BANDE_DE_CHANT') {
        const noPriceMl = await prisma.panel.count({
          where: {
            productType: 'BANDE_DE_CHANT',
            isActive: true,
            pricePerMl: null,
          },
        });
        console.log(`   ${productType}: ${noPriceMl}/${total} sans pricePerMl (${Math.round((noPriceMl / total) * 100)}%)`);

        if (noPriceMl > 0) {
          const examples = await prisma.panel.findMany({
            where: { productType: 'BANDE_DE_CHANT', isActive: true, pricePerMl: null },
            select: { reference: true, name: true, pricePerUnit: true },
            take: 3,
          });
          results.push({
            category: 'prix',
            issue: `BANDE_DE_CHANT sans pricePerMl`,
            count: noPriceMl,
            examples: examples.map(e => `${e.reference} (pricePerUnit: ${e.pricePerUnit})`),
          });
        }
      } else {
        console.log(`   ${productType}: ${noPriceM2}/${total} sans pricePerM2 (${percentage}%)`);

        if (noPriceM2 > total * 0.1) { // Plus de 10%
          const examples = await prisma.panel.findMany({
            where: { productType, isActive: true, pricePerM2: null },
            select: { reference: true },
            take: 3,
          });
          results.push({
            category: 'prix',
            issue: `${productType} sans pricePerM2`,
            count: noPriceM2,
            examples: examples.map(e => e.reference),
          });
        }
      }
    }
  }
  console.log('');
}

async function analyzeSuspiciousThickness() {
  console.log('📊 4. ANALYSE DES ÉPAISSEURS SUSPECTES\n');

  // Panneaux avec épaisseur 0 ou très petite (sauf bandes de chant)
  const zeroThickness = await prisma.panel.findMany({
    where: {
      isActive: true,
      NOT: { productType: 'BANDE_DE_CHANT' },
      OR: [
        { defaultThickness: 0 },
        { defaultThickness: null },
      ],
    },
    select: { reference: true, name: true, productType: true, thickness: true },
    take: 10,
  });

  console.log(`   Panneaux (hors chants) avec épaisseur 0 ou NULL: ${zeroThickness.length}+`);
  if (zeroThickness.length > 0) {
    console.log('   Exemples:');
    zeroThickness.forEach(p => {
      console.log(`   - [${p.productType}] ${p.reference}: ${JSON.stringify(p.thickness)}`);
    });
    results.push({
      category: 'épaisseur',
      issue: 'Panneaux avec épaisseur 0 ou NULL',
      count: zeroThickness.length,
      examples: zeroThickness.map(p => p.reference),
    });
  }

  // Épaisseurs très petites (< 3mm) pour des panneaux (pas des chants)
  const tooThin = await prisma.panel.findMany({
    where: {
      isActive: true,
      NOT: { productType: 'BANDE_DE_CHANT' },
      defaultThickness: { lt: 3, gt: 0 },
    },
    select: { reference: true, name: true, productType: true, defaultThickness: true },
    take: 10,
  });

  if (tooThin.length > 0) {
    console.log(`\n   Panneaux avec épaisseur < 3mm (suspect): ${tooThin.length}+`);
    tooThin.forEach(p => {
      console.log(`   - [${p.productType}] ${p.reference}: ${p.defaultThickness}mm - ${p.name.substring(0, 40)}...`);
    });
    results.push({
      category: 'épaisseur',
      issue: 'Panneaux avec épaisseur < 3mm (suspect)',
      count: tooThin.length,
      examples: tooThin.map(p => p.reference),
    });
  }

  // Épaisseurs très grandes (> 50mm) - peut-être erreur de parsing
  const tooThick = await prisma.panel.findMany({
    where: {
      isActive: true,
      defaultThickness: { gt: 50 },
    },
    select: { reference: true, name: true, productType: true, defaultThickness: true },
    take: 10,
  });

  if (tooThick.length > 0) {
    console.log(`\n   Panneaux avec épaisseur > 50mm (à vérifier): ${tooThick.length}+`);
    tooThick.forEach(p => {
      console.log(`   - [${p.productType}] ${p.reference}: ${p.defaultThickness}mm`);
    });
  }
  console.log('');
}

async function testCommonSearches() {
  console.log('📊 5. TEST DE RECHERCHES COURANTES\n');

  const searchTerms = [
    { term: 'chene', expectMin: 100, description: 'Chêne (sans accent)' },
    { term: 'chêne', expectMin: 100, description: 'Chêne (avec accent)' },
    { term: 'blanc', expectMin: 50, description: 'Blanc' },
    { term: 'noir', expectMin: 20, description: 'Noir' },
    { term: 'U963', expectMin: 3, description: 'Code décor Egger U963' },
    { term: 'H3170', expectMin: 1, description: 'Code décor Egger H3170' },
    { term: 'melamine', expectMin: 50, description: 'Mélaminé (sans accent)' },
    { term: 'mélaminé', expectMin: 50, description: 'Mélaminé (avec accent)' },
    { term: 'egger', expectMin: 10, description: 'Egger (fabricant)' },
    { term: 'ST9', expectMin: 5, description: 'Finition ST9' },
    { term: 'hydrofuge', expectMin: 5, description: 'Hydrofuge' },
    { term: '19mm', expectMin: 20, description: 'Épaisseur 19mm' },
    { term: 'contreplaqué', expectMin: 10, description: 'Contreplaqué' },
    { term: 'MDF', expectMin: 10, description: 'MDF' },
  ];

  for (const { term, expectMin, description } of searchTerms) {
    // Normalize and create tsquery
    const normalized = term
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const tsquery = normalized
      .split(/\s+/)
      .filter(t => t.length > 1)
      .map(t => `${t}:*`)
      .join(' & ');

    try {
      const result = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM "Panel" p
        WHERE p."isActive" = true
          AND p."searchVector" @@ to_tsquery('french_unaccent', ${tsquery})
      `;

      const count = Number(result[0].count);
      const status = count >= expectMin ? '✅' : '⚠️';
      console.log(`   ${status} "${description}": ${count} résultats ${count < expectMin ? `(attendu: >=${expectMin})` : ''}`);

      if (count < expectMin) {
        results.push({
          category: 'recherche',
          issue: `Recherche "${term}" retourne moins de ${expectMin} résultats`,
          count: count,
          examples: [],
        });
      }
    } catch (error) {
      console.log(`   ❌ "${description}": Erreur - ${error}`);
    }
  }

  // Test de comparaison accent/sans accent
  console.log('\n   Comparaison accent/sans accent:');
  const accentPairs = [
    ['chene', 'chêne'],
    ['melamine', 'mélaminé'],
    ['hetre', 'hêtre'],
  ];

  for (const [noAccent, withAccent] of accentPairs) {
    const countNoAccent = await getSearchCount(noAccent);
    const countWithAccent = await getSearchCount(withAccent);

    const diff = Math.abs(countNoAccent - countWithAccent);
    const status = diff <= 5 ? '✅' : '⚠️';
    console.log(`   ${status} "${noAccent}" vs "${withAccent}": ${countNoAccent} vs ${countWithAccent} (diff: ${diff})`);

    if (diff > 5) {
      results.push({
        category: 'accents',
        issue: `Différence significative entre "${noAccent}" et "${withAccent}"`,
        count: diff,
        examples: [],
      });
    }
  }
  console.log('');
}

async function getSearchCount(term: string): Promise<number> {
  const normalized = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const tsquery = normalized
    .split(/\s+/)
    .filter(t => t.length > 1)
    .map(t => `${t}:*`)
    .join(' & ');

  const result = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    WHERE p."isActive" = true
      AND p."searchVector" @@ to_tsquery('french_unaccent', ${tsquery})
  `;
  return Number(result[0].count);
}

async function analyzePotentialDuplicates() {
  console.log('📊 6. ANALYSE DES DOUBLONS POTENTIELS\n');

  // Même référence dans différents catalogues (normal)
  // Même nom exact dans le même catalogue (problème)
  const duplicateNames = await prisma.$queryRaw<{ name: string; count: bigint; catalogueId: string }[]>`
    SELECT name, COUNT(*) as count, "catalogueId"
    FROM "Panel"
    WHERE "isActive" = true
    GROUP BY name, "catalogueId"
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `;

  if (duplicateNames.length > 0) {
    console.log(`   Noms en double dans le même catalogue: ${duplicateNames.length} cas`);
    duplicateNames.slice(0, 5).forEach(d => {
      console.log(`   - "${d.name.substring(0, 50)}..." x${d.count}`);
    });
    results.push({
      category: 'doublons',
      issue: 'Noms en double dans le même catalogue',
      count: duplicateNames.length,
      examples: duplicateNames.slice(0, 3).map(d => d.name.substring(0, 30)),
    });
  } else {
    console.log('   ✅ Pas de doublons de noms détectés');
  }
  console.log('');
}

async function analyzeInconsistentData() {
  console.log('📊 7. ANALYSE DES DONNÉES INCOHÉRENTES\n');

  // Panneaux sans catégorie
  const noCategory = await prisma.panel.count({
    where: { isActive: true, categoryId: null },
  });
  console.log(`   Sans catégorie: ${noCategory}`);

  // Panneaux sans productType
  const noProductType = await prisma.panel.count({
    where: { isActive: true, productType: null },
  });
  console.log(`   Sans productType: ${noProductType}`);
  if (noProductType > 0) {
    const examples = await prisma.panel.findMany({
      where: { isActive: true, productType: null },
      select: { reference: true, name: true },
      take: 3,
    });
    results.push({
      category: 'données',
      issue: 'Panneaux sans productType',
      count: noProductType,
      examples: examples.map(e => e.reference),
    });
  }

  // Panneaux avec dimensions nulles (pas de width/length)
  const noDimensions = await prisma.panel.count({
    where: {
      isActive: true,
      NOT: { productType: 'BANDE_DE_CHANT' },
      OR: [
        { defaultWidth: 0 },
        { defaultLength: 0 },
      ],
    },
  });
  console.log(`   Sans dimensions (hors chants): ${noDimensions}`);

  // manufacturerRef manquant pour les décors Egger
  const eggerNoRef = await prisma.panel.count({
    where: {
      isActive: true,
      name: { contains: 'Egger', mode: 'insensitive' },
      manufacturerRef: null,
    },
  });
  if (eggerNoRef > 0) {
    console.log(`   Egger sans manufacturerRef: ${eggerNoRef}`);
    results.push({
      category: 'données',
      issue: 'Panneaux Egger sans manufacturerRef (code décor)',
      count: eggerNoRef,
      examples: [],
    });
  }
  console.log('');
}

function printSummary() {
  console.log('='.repeat(60));
  console.log('📋 RÉSUMÉ DES PROBLÈMES IDENTIFIÉS\n');

  if (results.length === 0) {
    console.log('   ✅ Aucun problème majeur détecté!');
    return;
  }

  // Group by category
  const byCategory = new Map<string, AnalysisResult[]>();
  for (const r of results) {
    const list = byCategory.get(r.category) || [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  for (const [category, issues] of byCategory) {
    console.log(`\n   📁 ${category.toUpperCase()}`);
    for (const issue of issues) {
      console.log(`      ⚠️ ${issue.issue}: ${issue.count}`);
      if (issue.examples.length > 0) {
        console.log(`         Exemples: ${issue.examples.slice(0, 3).join(', ')}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n   Total: ${results.length} problèmes identifiés`);
}

main().catch(console.error);
