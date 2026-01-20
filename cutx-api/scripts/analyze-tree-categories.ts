/**
 * Analyse de l'arborescence des catégories et des panneaux
 * Pour comprendre pourquoi les panneaux ne sont pas bien affectés
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  console.log('='.repeat(70));
  console.log('ANALYSE DE L\'ARBORESCENCE DES CATÉGORIES');
  console.log('='.repeat(70));

  // ==========================================================================
  // 1. VUE D'ENSEMBLE DES CATALOGUES
  // ==========================================================================
  console.log('\n\n📊 VUE D\'ENSEMBLE DES CATALOGUES');
  console.log('='.repeat(50));

  const catalogues = await prisma.catalogue.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          panels: { where: { isActive: true } },
          categories: true,
        },
      },
    },
  });

  for (const cat of catalogues) {
    console.log(`\n${cat.name} (${cat.slug}):`);
    console.log(`  Panneaux actifs: ${cat._count.panels}`);
    console.log(`  Catégories: ${cat._count.categories}`);
  }

  // ==========================================================================
  // 2. CATÉGORIES DU CATALOGUE CUTX (utilisé par le tree)
  // ==========================================================================
  console.log('\n\n🌳 CATÉGORIES DU CATALOGUE CUTX');
  console.log('='.repeat(50));

  const cutx = await prisma.catalogue.findFirst({ where: { slug: 'cutx' } });
  if (!cutx) {
    console.log('❌ Catalogue CutX non trouvé !');
    await prisma.$disconnect();
    return;
  }

  // Get all categories with panel counts
  const categories = await prisma.category.findMany({
    where: { catalogueId: cutx.id },
    include: {
      parent: { select: { name: true, slug: true } },
      _count: {
        select: { panels: { where: { isActive: true } } },
      },
    },
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
  });

  // Build hierarchy display
  const rootCats = categories.filter((c) => !c.parentId);
  const childCats = categories.filter((c) => c.parentId);

  console.log(`\nTotal catégories CutX: ${categories.length}`);
  console.log(`  Racines (niveau 1): ${rootCats.length}`);
  console.log(`  Enfants (niveau 2+): ${childCats.length}`);

  console.log('\n📁 Hiérarchie complète:');
  for (const root of rootCats) {
    console.log(`\n├── ${root.name} (${root.slug}) [${root._count.panels} panneaux directs]`);
    const children = childCats.filter((c) => c.parentId === root.id);
    for (const child of children) {
      console.log(`│   ├── ${child.name} (${child.slug}) [${child._count.panels} panneaux]`);
      const grandchildren = childCats.filter((c) => c.parentId === child.id);
      for (const gc of grandchildren) {
        console.log(`│   │   └── ${gc.name} (${gc.slug}) [${gc._count.panels} panneaux]`);
      }
    }
  }

  // ==========================================================================
  // 3. FOCUS SUR "TROIS PLIS"
  // ==========================================================================
  console.log('\n\n🔍 FOCUS SUR "TROIS PLIS"');
  console.log('='.repeat(50));

  const troisPlisCats = categories.filter(
    (c) => c.name.toLowerCase().includes('trois') || c.slug.includes('trois') || c.slug.includes('3-plis')
  );

  console.log(`\nCatégories contenant "trois plis": ${troisPlisCats.length}`);
  for (const cat of troisPlisCats) {
    const parentInfo = cat.parent ? `(parent: ${cat.parent.name})` : '(racine)';
    console.log(`  - ${cat.name} ${parentInfo} → ${cat._count.panels} panneaux`);
  }

  // Get actual panels in "trois plis" categories
  if (troisPlisCats.length > 0) {
    console.log('\n📋 Exemples de panneaux dans ces catégories:');
    for (const cat of troisPlisCats.slice(0, 5)) {
      const panels = await prisma.panel.findMany({
        where: { categoryId: cat.id, isActive: true },
        select: {
          name: true,
          reference: true,
          productType: true,
          catalogue: { select: { name: true } },
        },
        take: 3,
      });

      console.log(`\n  ${cat.name} (${panels.length > 0 ? panels.length + ' panneaux trouvés' : '0 panneau'}):`);
      for (const p of panels) {
        console.log(`    - [${p.catalogue?.name}] ${p.productType} | ${p.name?.substring(0, 50)}`);
      }
    }
  }

  // ==========================================================================
  // 4. PANNEAUX TROIS PLIS PAR CATALOGUE SOURCE
  // ==========================================================================
  console.log('\n\n📊 PANNEAUX "TROIS PLIS" PAR CATALOGUE SOURCE');
  console.log('='.repeat(50));

  // Search for panels that SHOULD be in "trois plis" by productType or name
  const troisPlisPatterns = ['TROIS_PLIS', '3_PLIS', 'TRIPLIS'];

  const troisPlisBySource = await prisma.$queryRaw<
    Array<{ catalogueName: string; productType: string | null; count: bigint }>
  >`
    SELECT
      c.name as "catalogueName",
      p."productType",
      COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND (
        p."productType" IN ('TROIS_PLIS', '3_PLIS', 'TRIPLIS')
        OR p.name ILIKE '%trois plis%'
        OR p.name ILIKE '%3 plis%'
        OR p.name ILIKE '%tripli%'
      )
    GROUP BY c.name, p."productType"
    ORDER BY c.name, count DESC
  `;

  console.log('\nDistribution par source et type:');
  for (const row of troisPlisBySource) {
    console.log(`  ${row.catalogueName.padEnd(12)} ${(row.productType || 'null').padEnd(15)} ${row.count}`);
  }

  // ==========================================================================
  // 5. VÉRIFIER LES ASSIGNMENTS DE CATÉGORIES
  // ==========================================================================
  console.log('\n\n⚠️ PROBLÈMES D\'ASSIGNATION DE CATÉGORIES');
  console.log('='.repeat(50));

  // Panels without category
  const noCategoryCount = await prisma.panel.count({
    where: { isActive: true, categoryId: null },
  });
  console.log(`\nPanneaux SANS catégorie: ${noCategoryCount}`);

  // Panels with category from different catalogue
  const crossCataloguePanels = await prisma.$queryRaw<
    Array<{ panelCatalogue: string; categoryCatalogue: string; count: bigint }>
  >`
    SELECT
      pc.name as "panelCatalogue",
      cc.name as "categoryCatalogue",
      COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" pc ON p."catalogueId" = pc.id
    JOIN "Category" cat ON p."categoryId" = cat.id
    JOIN "Catalogue" cc ON cat."catalogueId" = cc.id
    WHERE p."isActive" = true
      AND p."catalogueId" != cat."catalogueId"
    GROUP BY pc.name, cc.name
    ORDER BY count DESC
  `;

  if (crossCataloguePanels.length > 0) {
    console.log('\nPanneaux avec catégorie d\'un AUTRE catalogue:');
    for (const row of crossCataloguePanels) {
      console.log(`  Panneau de ${row.panelCatalogue} → Catégorie de ${row.categoryCatalogue}: ${row.count}`);
    }
  } else {
    console.log('\n✅ Tous les panneaux ont une catégorie de leur propre catalogue');
  }

  // ==========================================================================
  // 6. POURQUOI LE TREE MONTRE SEULEMENT BARILLET ?
  // ==========================================================================
  console.log('\n\n🔎 POURQUOI LE TREE MONTRE SEULEMENT BARILLET ?');
  console.log('='.repeat(50));

  // Le tree utilise le catalogue CutX par défaut
  // Vérifions les catégories CutX et les panneaux qu'elles contiennent

  const cutxCatsWithPanels = await prisma.category.findMany({
    where: {
      catalogueId: cutx.id,
      panels: { some: { isActive: true } },
    },
    include: {
      panels: {
        where: { isActive: true },
        select: {
          catalogue: { select: { name: true } },
        },
        take: 1,
      },
      _count: { select: { panels: { where: { isActive: true } } } },
    },
  });

  console.log(`\nCatégories CutX avec des panneaux: ${cutxCatsWithPanels.length}`);

  // Group by source catalogue
  const sourceDistribution: Record<string, number> = {};
  for (const cat of cutxCatsWithPanels) {
    for (const panel of cat.panels) {
      const source = panel.catalogue?.name || 'Inconnu';
      sourceDistribution[source] = (sourceDistribution[source] || 0) + cat._count.panels;
    }
  }

  console.log('\nDistribution des panneaux dans catégories CutX par source:');
  for (const [source, count] of Object.entries(sourceDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source}: ${count}`);
  }

  // Check if Bouney/Dispano panels are in CutX categories
  console.log('\n📋 Panneaux Bouney/Dispano dans catégories CutX:');

  for (const catalogueName of ['Bouney', 'Dispano']) {
    const panelsInCutxCats = await prisma.panel.count({
      where: {
        isActive: true,
        catalogue: { name: { contains: catalogueName, mode: 'insensitive' } },
        category: { catalogueId: cutx.id },
      },
    });

    const totalPanels = await prisma.panel.count({
      where: {
        isActive: true,
        catalogue: { name: { contains: catalogueName, mode: 'insensitive' } },
      },
    });

    console.log(`  ${catalogueName}: ${panelsInCutxCats}/${totalPanels} dans catégories CutX`);
  }

  // ==========================================================================
  // 7. RECOMMANDATIONS
  // ==========================================================================
  console.log('\n\n💡 RECOMMANDATIONS');
  console.log('='.repeat(50));

  const issues: string[] = [];

  if (noCategoryCount > 0) {
    issues.push(`${noCategoryCount} panneaux n'ont pas de catégorie assignée`);
  }

  if (cutxCatsWithPanels.length === 0) {
    issues.push('Aucune catégorie CutX ne contient de panneaux');
  }

  // Check if panels use their own catalogue's categories instead of CutX
  const panelsInOwnCats = await prisma.panel.count({
    where: {
      isActive: true,
      categoryId: { not: null },
      catalogue: { slug: { not: 'cutx' } },
      category: { catalogue: { slug: { not: 'cutx' } } },
    },
  });

  if (panelsInOwnCats > 0) {
    issues.push(`${panelsInOwnCats} panneaux utilisent les catégories de leur catalogue source au lieu de CutX`);
  }

  if (issues.length === 0) {
    console.log('\n✅ Aucun problème majeur détecté');
  } else {
    console.log('\n⚠️ Problèmes identifiés:');
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
  }

  await prisma.$disconnect();
}

analyze().catch(console.error);
