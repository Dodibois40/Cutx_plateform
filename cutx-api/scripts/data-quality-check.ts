/**
 * Script de vérification de qualité des données
 *
 * Vérifie:
 * 1. Épaisseurs aberrantes (> 100mm)
 * 2. Chants mal classifiés (petites dimensions mais pas BANDE_DE_CHANT)
 * 3. defaultThickness manquant (mais thickness[] existe)
 * 4. Prix manquants ou suspects
 * 5. Références en double
 *
 * Usage:
 *   npx tsx scripts/data-quality-check.ts
 *   npx tsx scripts/data-quality-check.ts --fix  # Corrige les problèmes automatiquement
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QualityIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  count: number;
  examples: string[];
  fixable: boolean;
}

async function checkDataQuality(): Promise<QualityIssue[]> {
  console.log('═'.repeat(70));
  console.log('🔍 VÉRIFICATION QUALITÉ DES DONNÉES');
  console.log('═'.repeat(70));
  console.log('');

  const issues: QualityIssue[] = [];

  // ========================================
  // 1. Épaisseurs aberrantes
  // ========================================
  console.log('📏 Vérification des épaisseurs...');

  const aberrantThickness = await prisma.panel.findMany({
    where: {
      defaultThickness: { gt: 100 },
      isActive: true,
    },
    select: { reference: true, name: true, defaultThickness: true },
    take: 10,
  });

  if (aberrantThickness.length > 0) {
    const total = await prisma.panel.count({
      where: { defaultThickness: { gt: 100 }, isActive: true },
    });

    issues.push({
      type: 'Épaisseur aberrante (> 100mm)',
      severity: 'error',
      count: total,
      examples: aberrantThickness.map(
        (p) => `${p.reference}: ${p.defaultThickness}mm - "${p.name?.substring(0, 40)}"`
      ),
      fixable: false,
    });
  }

  // ========================================
  // 2. Chants potentiellement mal classifiés
  // ========================================
  console.log('🏷️  Vérification des classifications...');

  const misclassifiedChants = await prisma.$queryRaw<
    {
      id: string;
      reference: string;
      name: string;
      productType: string | null;
      defaultWidth: number;
      defaultThickness: number;
    }[]
  >`
    SELECT id, reference, name, "productType", "defaultWidth", "defaultThickness"
    FROM "Panel"
    WHERE "defaultWidth" IS NOT NULL
      AND "defaultWidth" <= 50
      AND "defaultThickness" IS NOT NULL
      AND "defaultThickness" <= 2
      AND ("productType" IS NULL OR "productType" != 'BANDE_DE_CHANT')
      AND "isActive" = true
    ORDER BY reference
    LIMIT 10
  `;

  if (misclassifiedChants.length > 0) {
    const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Panel"
      WHERE "defaultWidth" <= 50
        AND "defaultThickness" <= 2
        AND ("productType" IS NULL OR "productType" != 'BANDE_DE_CHANT')
        AND "isActive" = true
    `;

    issues.push({
      type: 'Chants potentiellement mal classifiés',
      severity: 'warning',
      count: Number(countResult[0]?.count || 0),
      examples: misclassifiedChants.map(
        (p) =>
          `${p.reference}: ${p.productType || 'NULL'} (${p.defaultWidth}x${p.defaultThickness}mm)`
      ),
      fixable: true,
    });
  }

  // ========================================
  // 3. defaultThickness manquant
  // ========================================
  console.log('📐 Vérification defaultThickness...');

  const missingThickness = await prisma.$queryRaw<
    { id: string; reference: string; thickness: number[] }[]
  >`
    SELECT id, reference, thickness
    FROM "Panel"
    WHERE "defaultThickness" IS NULL
      AND array_length(thickness, 1) > 0
      AND "isActive" = true
    ORDER BY reference
    LIMIT 10
  `;

  if (missingThickness.length > 0) {
    const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Panel"
      WHERE "defaultThickness" IS NULL
        AND array_length(thickness, 1) > 0
        AND "isActive" = true
    `;

    issues.push({
      type: 'defaultThickness NULL (mais thickness[] existe)',
      severity: 'warning',
      count: Number(countResult[0]?.count || 0),
      examples: missingThickness.map(
        (p) => `${p.reference}: thickness=[${p.thickness.join(',')}]`
      ),
      fixable: true,
    });
  }

  // ========================================
  // 4. Prix suspects
  // ========================================
  console.log('💰 Vérification des prix...');

  // Prix trop bas (< 1€/m²) - probablement erreur
  const lowPrice = await prisma.panel.findMany({
    where: {
      OR: [{ pricePerM2: { gt: 0, lt: 1 } }, { pricePerMl: { gt: 0, lt: 0.1 } }],
      isActive: true,
    },
    select: { reference: true, pricePerM2: true, pricePerMl: true },
    take: 10,
  });

  if (lowPrice.length > 0) {
    const total = await prisma.panel.count({
      where: {
        OR: [{ pricePerM2: { gt: 0, lt: 1 } }, { pricePerMl: { gt: 0, lt: 0.1 } }],
        isActive: true,
      },
    });

    issues.push({
      type: 'Prix suspect (trop bas)',
      severity: 'info',
      count: total,
      examples: lowPrice.map(
        (p) => `${p.reference}: ${p.pricePerM2}€/m² ou ${p.pricePerMl}€/ml`
      ),
      fixable: false,
    });
  }

  // Prix très élevé (> 500€/m²) - vérifier
  const highPrice = await prisma.panel.findMany({
    where: {
      pricePerM2: { gt: 500 },
      isActive: true,
    },
    select: { reference: true, name: true, pricePerM2: true },
    take: 10,
  });

  if (highPrice.length > 0) {
    const total = await prisma.panel.count({
      where: { pricePerM2: { gt: 500 }, isActive: true },
    });

    issues.push({
      type: 'Prix élevé (> 500€/m²)',
      severity: 'info',
      count: total,
      examples: highPrice.map(
        (p) => `${p.reference}: ${p.pricePerM2}€/m² - "${p.name?.substring(0, 30)}"`
      ),
      fixable: false,
    });
  }

  // ========================================
  // 5. Références en double
  // ========================================
  console.log('🔢 Vérification des doublons...');

  const duplicates = await prisma.$queryRaw<{ reference: string; count: bigint }[]>`
    SELECT reference, COUNT(*) as count
    FROM "Panel"
    WHERE "isActive" = true
    GROUP BY reference
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `;

  if (duplicates.length > 0) {
    const totalDuplicates = duplicates.reduce(
      (sum, d) => sum + Number(d.count) - 1,
      0
    );

    issues.push({
      type: 'Références en double',
      severity: 'warning',
      count: totalDuplicates,
      examples: duplicates.map((d) => `${d.reference}: ${d.count} occurrences`),
      fixable: false,
    });
  }

  // ========================================
  // 6. Produits sans catégorie
  // ========================================
  console.log('📂 Vérification des catégories...');

  const noCategory = await prisma.panel.count({
    where: {
      categoryId: null,
      isActive: true,
    },
  });

  if (noCategory > 0) {
    issues.push({
      type: 'Produits sans catégorie',
      severity: 'info',
      count: noCategory,
      examples: ['Produits non catégorisés'],
      fixable: false,
    });
  }

  return issues;
}

async function fixIssues(): Promise<void> {
  console.log('\n' + '═'.repeat(70));
  console.log('🔧 CORRECTION DES PROBLÈMES');
  console.log('═'.repeat(70));

  // ========================================
  // Fix 1: Remplir defaultThickness
  // ========================================
  console.log('\n📐 Correction defaultThickness...');

  const fixedThickness = await prisma.$executeRaw`
    UPDATE "Panel"
    SET "defaultThickness" = thickness[1]
    WHERE "defaultThickness" IS NULL
      AND array_length(thickness, 1) > 0
      AND thickness[1] >= 0.1
      AND thickness[1] <= 100
  `;

  console.log(`   ✅ ${fixedThickness} panneaux corrigés`);

  // ========================================
  // Fix 2: Reclassifier les chants
  // ========================================
  console.log('\n🏷️  Reclassification des chants...');

  // D'abord désactiver le trigger full-text pour éviter les erreurs
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger`
    );
  } catch {
    // Trigger n'existe peut-être pas
  }

  const fixedChants = await prisma.$executeRaw`
    UPDATE "Panel"
    SET
      "productType" = 'BANDE_DE_CHANT',
      "pricePerMl" = COALESCE("pricePerMl", "pricePerM2"),
      "pricePerM2" = CASE WHEN "pricePerMl" IS NULL THEN NULL ELSE "pricePerM2" END
    WHERE "defaultWidth" <= 50
      AND "defaultThickness" <= 2
      AND ("productType" IS NULL OR "productType" != 'BANDE_DE_CHANT')
      AND "isActive" = true
      AND (
        LOWER(name) LIKE '%chant%'
        OR LOWER(name) LIKE '%bande de chant%'
      )
  `;

  // Réactiver le trigger
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger`
    );
  } catch {
    // Trigger n'existe peut-être pas
  }

  console.log(`   ✅ ${fixedChants} chants reclassifiés`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  try {
    const issues = await checkDataQuality();

    // ========================================
    // AFFICHAGE DES RÉSULTATS
    // ========================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(70));

    if (issues.length === 0) {
      console.log('\n✅ Aucun problème de qualité détecté!');
      return;
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    const infos = issues.filter((i) => i.severity === 'info');

    console.log(`\n   ❌ Erreurs: ${errors.length}`);
    console.log(`   ⚠️  Warnings: ${warnings.length}`);
    console.log(`   ℹ️  Infos: ${infos.length}`);

    // Détails
    for (const issue of issues) {
      const icon =
        issue.severity === 'error'
          ? '❌'
          : issue.severity === 'warning'
            ? '⚠️'
            : 'ℹ️';
      const fixLabel = issue.fixable ? ' [FIXABLE]' : '';

      console.log(`\n${icon} ${issue.type}${fixLabel}`);
      console.log(`   Nombre: ${issue.count}`);
      console.log('   Exemples:');
      issue.examples.slice(0, 5).forEach((ex) => {
        console.log(`     - ${ex}`);
      });
      if (issue.examples.length > 5) {
        console.log(`     ... et ${issue.examples.length - 5} de plus`);
      }
    }

    // Fix si demandé
    if (shouldFix) {
      const fixableCount = issues.filter((i) => i.fixable).length;
      if (fixableCount > 0) {
        await fixIssues();
      } else {
        console.log('\n⚠️  Aucun problème corrigible automatiquement.');
      }
    } else {
      const fixableCount = issues.filter((i) => i.fixable).length;
      if (fixableCount > 0) {
        console.log(
          `\n💡 ${fixableCount} problème(s) corrigible(s). Relancez avec --fix pour corriger.`
        );
      }
    }

    // Statistiques globales
    console.log('\n' + '═'.repeat(70));
    console.log('📈 STATISTIQUES GLOBALES');
    console.log('═'.repeat(70));

    const totalPanels = await prisma.panel.count({ where: { isActive: true } });
    const totalCatalogues = await prisma.catalogue.count({
      where: { isActive: true },
    });

    console.log(`   Panneaux actifs: ${totalPanels.toLocaleString()}`);
    console.log(`   Catalogues actifs: ${totalCatalogues}`);

    // Par type de produit
    const byType = await prisma.$queryRaw<{ productType: string; count: bigint }[]>`
      SELECT "productType", COUNT(*) as count
      FROM "Panel"
      WHERE "isActive" = true AND "productType" IS NOT NULL
      GROUP BY "productType"
      ORDER BY count DESC
    `;

    console.log('\n   Par type:');
    byType.forEach((t) => {
      console.log(`     - ${t.productType}: ${Number(t.count).toLocaleString()}`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
