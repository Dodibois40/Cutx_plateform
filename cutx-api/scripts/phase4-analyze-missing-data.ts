/**
 * PHASE 4: Analyse des données manquantes
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  console.log('='.repeat(70));
  console.log('PHASE 4: ANALYSE DES DONNÉES MANQUANTES');
  console.log('='.repeat(70));

  // ==========================================================================
  // 1. PANNEAUX SANS PRIX
  // ==========================================================================
  console.log('\n\n📊 PANNEAUX SANS PRIX');
  console.log('='.repeat(50));

  const noPriceByType = await prisma.$queryRaw<
    Array<{ productType: string; catalogueName: string; count: bigint }>
  >`
    SELECT
      p."productType",
      c.name as "catalogueName",
      COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND p."pricePerM2" IS NULL
      AND p."pricePerPanel" IS NULL
      AND p."pricePerMl" IS NULL
      AND p."pricePerUnit" IS NULL
    GROUP BY p."productType", c.name
    ORDER BY count DESC
  `;

  console.log('\nPar type et catalogue:');
  let totalNoPrice = 0;
  for (const row of noPriceByType) {
    const count = Number(row.count);
    totalNoPrice += count;
    console.log(`  ${row.catalogueName.padEnd(12)} ${(row.productType || 'null').padEnd(20)} ${count}`);
  }
  console.log(`\n  TOTAL SANS PRIX: ${totalNoPrice}`);

  // Exemples
  console.log('\nExemples (10 premiers):');
  const noPriceExamples = await prisma.panel.findMany({
    where: {
      isActive: true,
      pricePerM2: null,
      pricePerPanel: null,
      pricePerMl: null,
      pricePerUnit: null,
    },
    include: { catalogue: { select: { name: true } } },
    take: 10,
  });

  for (const p of noPriceExamples) {
    console.log(`  [${p.catalogue?.name}] ${p.productType} - ${p.name?.substring(0, 40) || p.reference}`);
  }

  // ==========================================================================
  // 2. PANNEAUX SANS IMAGE
  // ==========================================================================
  console.log('\n\n📷 PANNEAUX SANS IMAGE');
  console.log('='.repeat(50));

  const noImageByType = await prisma.$queryRaw<
    Array<{ productType: string; catalogueName: string; count: bigint }>
  >`
    SELECT
      p."productType",
      c.name as "catalogueName",
      COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND (p."imageUrl" IS NULL OR p."imageUrl" = '')
    GROUP BY p."productType", c.name
    ORDER BY count DESC
  `;

  console.log('\nPar type et catalogue:');
  let totalNoImage = 0;
  for (const row of noImageByType) {
    const count = Number(row.count);
    totalNoImage += count;
    console.log(`  ${row.catalogueName.padEnd(12)} ${(row.productType || 'null').padEnd(20)} ${count}`);
  }
  console.log(`\n  TOTAL SANS IMAGE: ${totalNoImage}`);

  // ==========================================================================
  // 3. PANNEAUX DÉCORÉS SANS NOM DE DÉCOR
  // ==========================================================================
  console.log('\n\n🎨 PANNEAUX DÉCORÉS SANS NOM DE DÉCOR');
  console.log('='.repeat(50));

  const decoratedTypes = ['MELAMINE', 'STRATIFIE', 'COMPACT'];

  for (const pType of decoratedTypes) {
    const total = await prisma.panel.count({
      where: { productType: pType, isActive: true },
    });

    const noDecorName = await prisma.panel.count({
      where: {
        productType: pType,
        isActive: true,
        OR: [{ decorName: null }, { decorName: '' }],
      },
    });

    const byCatalogue = await prisma.$queryRaw<Array<{ catalogueName: string; count: bigint }>>`
      SELECT
        c.name as "catalogueName",
        COUNT(*) as count
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id
      WHERE p."isActive" = true
        AND p."productType" = ${pType}
        AND (p."decorName" IS NULL OR p."decorName" = '')
      GROUP BY c.name
      ORDER BY count DESC
    `;

    console.log(`\n${pType}: ${noDecorName}/${total} sans decorName`);
    for (const row of byCatalogue) {
      console.log(`  - ${row.catalogueName}: ${row.count}`);
    }
  }

  // ==========================================================================
  // 4. ANALYSE PAR FOURNISSEUR
  // ==========================================================================
  console.log('\n\n🏭 ANALYSE PAR FOURNISSEUR');
  console.log('='.repeat(50));

  const catalogues = await prisma.catalogue.findMany();

  for (const cat of catalogues) {
    const stats = await prisma.panel.aggregate({
      where: { catalogueId: cat.id, isActive: true },
      _count: true,
    });

    if (stats._count === 0) continue;

    const noPrice = await prisma.panel.count({
      where: {
        catalogueId: cat.id,
        isActive: true,
        pricePerM2: null,
        pricePerPanel: null,
        pricePerMl: null,
        pricePerUnit: null,
      },
    });

    const noImage = await prisma.panel.count({
      where: { catalogueId: cat.id, isActive: true, OR: [{ imageUrl: null }, { imageUrl: '' }] },
    });

    const noDecor = await prisma.panel.count({
      where: {
        catalogueId: cat.id,
        isActive: true,
        productType: { in: ['MELAMINE', 'STRATIFIE', 'COMPACT'] },
        OR: [{ decorName: null }, { decorName: '' }],
      },
    });

    console.log(`\n${cat.name} (${cat.slug}):`);
    console.log(`  Total:          ${stats._count}`);
    console.log(`  Sans prix:      ${noPrice} (${((noPrice / stats._count) * 100).toFixed(1)}%)`);
    console.log(`  Sans image:     ${noImage} (${((noImage / stats._count) * 100).toFixed(1)}%)`);
    console.log(`  Sans décor:     ${noDecor} (panneaux décorés sans decorName)`);
  }

  // ==========================================================================
  // 5. DÉTAIL DES RÉFÉRENCES POUR SCRAPING
  // ==========================================================================
  console.log('\n\n🔍 RÉFÉRENCES POUR SCRAPING');
  console.log('='.repeat(50));

  // Show reference patterns by catalogue
  for (const cat of catalogues) {
    const examples = await prisma.panel.findMany({
      where: {
        catalogueId: cat.id,
        isActive: true,
        pricePerM2: null,
        pricePerPanel: null,
      },
      select: { reference: true, manufacturerRef: true, productType: true },
      take: 5,
    });

    if (examples.length === 0) continue;

    console.log(`\n${cat.name} - Exemples de références sans prix:`);
    for (const ex of examples) {
      console.log(`  ${ex.productType?.padEnd(15) || 'null'.padEnd(15)} ref=${ex.reference} mfr=${ex.manufacturerRef || '-'}`);
    }
  }

  // ==========================================================================
  // 6. RÉSUMÉ ACTIONNABLE
  // ==========================================================================
  console.log('\n\n' + '='.repeat(70));
  console.log('RÉSUMÉ ACTIONNABLE');
  console.log('='.repeat(70));

  const summary: Array<{ catalogue: string; noPrice: number; topTypes: string }> = [];

  for (const cat of catalogues) {
    const stats = await prisma.panel.aggregate({
      where: { catalogueId: cat.id, isActive: true },
      _count: true,
    });

    if (stats._count === 0) continue;

    const noPrice = await prisma.panel.count({
      where: {
        catalogueId: cat.id,
        isActive: true,
        pricePerM2: null,
        pricePerPanel: null,
        pricePerMl: null,
        pricePerUnit: null,
      },
    });

    if (noPrice > 0) {
      // Get top 3 product types without price
      const topTypes = await prisma.$queryRaw<Array<{ productType: string; count: bigint }>>`
        SELECT "productType", COUNT(*) as count
        FROM "Panel"
        WHERE "catalogueId" = ${cat.id}
          AND "isActive" = true
          AND "pricePerM2" IS NULL
          AND "pricePerPanel" IS NULL
          AND "pricePerMl" IS NULL
          AND "pricePerUnit" IS NULL
        GROUP BY "productType"
        ORDER BY count DESC
        LIMIT 3
      `;

      summary.push({
        catalogue: cat.name,
        noPrice,
        topTypes: topTypes.map((t) => `${t.productType}(${t.count})`).join(', '),
      });
    }
  }

  console.log('\nPanneaux sans prix par fournisseur:');
  for (const s of summary.sort((a, b) => b.noPrice - a.noPrice)) {
    console.log(`\n  ${s.catalogue}: ${s.noPrice} panneaux`);
    console.log(`    Types: ${s.topTypes}`);
  }

  await prisma.$disconnect();
}

analyze().catch(console.error);
