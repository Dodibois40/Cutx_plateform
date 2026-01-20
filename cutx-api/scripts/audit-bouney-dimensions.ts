/**
 * Audit des dimensions manquantes dans le catalogue Bouney
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 AUDIT DIMENSIONS BOUNEY');
  console.log('='.repeat(60));

  // Récupérer le catalogue Bouney
  const catalogue = await prisma.catalogue.findUnique({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.log('❌ Catalogue Bouney non trouvé');
    return;
  }

  // Récupérer tous les panneaux Bouney
  const allPanels = await prisma.panel.findMany({
    where: { catalogueId: catalogue.id },
    select: {
      id: true,
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      categoryId: true
    }
  });

  const total = allPanels.length;
  const missingLength = allPanels.filter(p => !p.defaultLength || p.defaultLength === 0).length;
  const missingWidth = allPanels.filter(p => !p.defaultWidth || p.defaultWidth === 0).length;
  const missingBoth = allPanels.filter(p =>
    (!p.defaultLength || p.defaultLength === 0) &&
    (!p.defaultWidth || p.defaultWidth === 0)
  ).length;

  console.log(`\n📊 STATISTIQUES GLOBALES:`);
  console.log(`   Total panneaux Bouney: ${total}`);
  console.log(`   Longueur manquante (0 ou null): ${missingLength} (${(missingLength/total*100).toFixed(1)}%)`);
  console.log(`   Largeur manquante (0 ou null): ${missingWidth} (${(missingWidth/total*100).toFixed(1)}%)`);
  console.log(`   Les deux manquantes: ${missingBoth} (${(missingBoth/total*100).toFixed(1)}%)`);

  // Par catégorie
  console.log(`\n📂 PAR CATÉGORIE:`);
  const problemPanels = allPanels.filter(p =>
    (!p.defaultLength || p.defaultLength === 0) &&
    (!p.defaultWidth || p.defaultWidth === 0)
  );

  const byCategoryId = new Map<string, number>();
  for (const p of problemPanels) {
    const catId = p.categoryId || 'none';
    byCategoryId.set(catId, (byCategoryId.get(catId) || 0) + 1);
  }

  const categoryIds = Array.from(byCategoryId.keys()).filter(id => id !== 'none');
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } }
  });
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const sortedCategories = Array.from(byCategoryId.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [catId, count] of sortedCategories) {
    const catName = categoryMap.get(catId) || 'Sans catégorie';
    console.log(`   ${catName}: ${count} panneaux sans dimensions`);
  }

  // Exemples de panneaux problématiques
  console.log(`\n🔍 EXEMPLES DE PANNEAUX SANS DIMENSIONS:`);
  const examples = problemPanels.slice(0, 20);

  for (const panel of examples) {
    const catName = categoryMap.get(panel.categoryId || '') || 'Sans catégorie';
    console.log(`\n   📦 ${panel.reference}`);
    console.log(`      ${panel.name.substring(0, 60)}...`);
    console.log(`      Dim: L=${panel.defaultLength} × l=${panel.defaultWidth} × ép=${panel.defaultThickness}`);
    console.log(`      Cat: ${catName}`);
  }

  // Analyser si les dimensions sont dans le nom
  console.log(`\n\n📝 ANALYSE DES NOMS (dimensions extractibles?):`);
  const patterns: [string, RegExp][] = [
    ['Format standard (L×l)', /(\d{3,4})\s*[x×]\s*(\d{3,4})/i],
    ['Dimensions avec mm', /(\d{3,4})\s*mm?\s*[x×]\s*(\d{3,4})\s*mm?/i],
    ['Épaisseur + dimensions', /(\d+)\s*mm\s+(\d{3,4})\s*[x×]\s*(\d{3,4})/i],
    ['Format alternatif', /(\d{4})\s*\/\s*(\d{4})/],
  ];

  let extractable = 0;
  for (const panel of examples) {
    for (const [patternName, regex] of patterns) {
      const match = panel.name.match(regex);
      if (match) {
        console.log(`   ✅ ${panel.reference}: "${patternName}" → ${match[1]}×${match[2] || match[3]}`);
        extractable++;
        break;
      }
    }
  }
  console.log(`\n   Dimensions extractibles du nom: ${extractable}/${examples.length}`);

  // Vérifier les champs du panneau BCB-BAS-87981
  console.log(`\n\n🔍 ANALYSE DU PANNEAU BCB-BAS-87981:`);
  const specificPanel = await prisma.panel.findFirst({
    where: {
      catalogueId: catalogue.id,
      reference: 'BCB-BAS-87981'
    }
  });

  if (specificPanel) {
    console.log(`\n   Tous les champs:`);
    const fields = [
      'reference', 'name', 'decorCode', 'finishCode', 'colorCode',
      'supportQuality', 'coreType', 'coreColor', 'manufacturer',
      'manufacturerRef', 'grainDirection', 'defaultLength', 'defaultWidth',
      'defaultThickness', 'decorCategory', 'decorName', 'decorSubCategory'
    ];
    for (const field of fields) {
      const value = (specificPanel as Record<string, unknown>)[field];
      if (value !== null && value !== undefined) {
        console.log(`      ${field}: ${JSON.stringify(value)}`);
      }
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Audit terminé');
}

main().catch(console.error);
