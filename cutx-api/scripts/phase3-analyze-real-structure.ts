/**
 * PHASE 3: Analyse de la structure réelle
 *
 * Comprend où sont actuellement les panneaux et propose des réassignations.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  console.log('='.repeat(70));
  console.log('ANALYSE DE LA STRUCTURE RÉELLE');
  console.log('='.repeat(70));

  // 1. Lister tous les catalogues
  const catalogues = await prisma.catalogue.findMany({
    select: { id: true, name: true, slug: true },
  });

  console.log('\n📁 CATALOGUES:');
  for (const cat of catalogues) {
    const panelCount = await prisma.panel.count({
      where: { catalogueId: cat.id, isActive: true },
    });
    console.log(`  ${cat.name} (${cat.slug}): ${panelCount} panels`);
  }

  // 2. Pour chaque catalogue, lister les catégories de niveau 1
  console.log('\n\n📂 CATÉGORIES PAR CATALOGUE:');

  for (const catalogue of catalogues) {
    const categories = await prisma.category.findMany({
      where: { catalogueId: catalogue.id, parentId: null },
      include: {
        children: {
          select: { slug: true, name: true },
        },
        _count: {
          select: { panels: { where: { isActive: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log(`\n${catalogue.name}:`);
    console.log('-'.repeat(50));

    for (const cat of categories) {
      const childrenCount = cat.children.length;
      const directPanels = cat._count.panels;
      const childSlugs = cat.children.map((c) => c.slug).join(', ');

      console.log(`  ${cat.slug} (${directPanels} direct)`);
      if (childrenCount > 0) {
        console.log(`    └─ Enfants: ${childSlugs}`);
      }
    }
  }

  // 3. Analyser les chants spécifiquement
  console.log('\n\n🔍 ANALYSE DES CHANTS (BANDE_DE_CHANT):');
  console.log('-'.repeat(70));

  const chantsByCategory = await prisma.$queryRaw<
    Array<{
      catalogueName: string;
      parentSlug: string | null;
      categorySlug: string;
      categoryName: string;
      count: bigint;
    }>
  >`
    SELECT
      cat.name as "catalogueName",
      parent.slug as "parentSlug",
      c.slug as "categorySlug",
      c.name as "categoryName",
      COUNT(p.id) as count
    FROM "Panel" p
    JOIN "Category" c ON p."categoryId" = c.id
    LEFT JOIN "Category" parent ON c."parentId" = parent.id
    JOIN "Catalogue" cat ON p."catalogueId" = cat.id
    WHERE p."productType" = 'BANDE_DE_CHANT'
      AND p."isActive" = true
    GROUP BY cat.name, parent.slug, c.slug, c.name
    ORDER BY count DESC
  `;

  let totalChants = 0;
  let chantsInCorrectCategory = 0;

  for (const row of chantsByCategory) {
    const count = Number(row.count);
    totalChants += count;

    const path = row.parentSlug ? `${row.parentSlug}/${row.categorySlug}` : row.categorySlug;
    const isCorrect = path.includes('chant') ? '✅' : '❌';

    if (path.includes('chant')) {
      chantsInCorrectCategory += count;
    }

    console.log(`  ${isCorrect} ${row.catalogueName.padEnd(12)} ${path.padEnd(35)} ${count}`);
  }

  console.log(`\n  Total: ${totalChants} chants`);
  console.log(`  ✅ Bien classés (dans catégorie *chant*): ${chantsInCorrectCategory}`);
  console.log(`  ❌ Mal classés: ${totalChants - chantsInCorrectCategory}`);

  // 4. Analyser les plans de travail
  console.log('\n\n🔍 ANALYSE DES PLANS DE TRAVAIL:');
  console.log('-'.repeat(70));

  const pdtByCategory = await prisma.$queryRaw<
    Array<{
      catalogueName: string;
      parentSlug: string | null;
      categorySlug: string;
      count: bigint;
    }>
  >`
    SELECT
      cat.name as "catalogueName",
      parent.slug as "parentSlug",
      c.slug as "categorySlug",
      COUNT(p.id) as count
    FROM "Panel" p
    JOIN "Category" c ON p."categoryId" = c.id
    LEFT JOIN "Category" parent ON c."parentId" = parent.id
    JOIN "Catalogue" cat ON p."catalogueId" = cat.id
    WHERE p."productType" = 'PLAN_DE_TRAVAIL'
      AND p."isActive" = true
    GROUP BY cat.name, parent.slug, c.slug
    ORDER BY count DESC
  `;

  for (const row of pdtByCategory) {
    const count = Number(row.count);
    const path = row.parentSlug ? `${row.parentSlug}/${row.categorySlug}` : row.categorySlug;
    const isCorrect = path.includes('plan') || path.includes('travail') ? '✅' : '❌';
    console.log(`  ${isCorrect} ${row.catalogueName.padEnd(12)} ${path.padEnd(35)} ${count}`);
  }

  // 5. Vérifier si la catégorie "chants" existe dans CutX
  console.log('\n\n🔎 CATÉGORIE "chants" DANS CutX:');

  const cutxChants = await prisma.category.findFirst({
    where: {
      catalogue: { slug: 'cutx' },
      slug: 'chants',
    },
    include: {
      children: true,
      _count: { select: { panels: true } },
    },
  });

  if (cutxChants) {
    console.log(`  ✅ Existe: id=${cutxChants.id}`);
    console.log(`  Panels directs: ${cutxChants._count.panels}`);
    console.log(`  Enfants: ${cutxChants.children.map((c) => c.slug).join(', ')}`);
  } else {
    console.log('  ❌ N\'existe pas!');
  }

  await prisma.$disconnect();
}

analyze().catch(console.error);
