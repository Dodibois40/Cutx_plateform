/**
 * PHASE 3: ANALYSE DES CATÉGORIES MAL ASSIGNÉES
 *
 * Vérifie où sont actuellement les panneaux par productType
 * et identifie les réassignations nécessaires.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ProductTypes qui devraient avoir leur propre catégorie niveau 1
const PRODUCT_TYPE_TO_EXPECTED_CATEGORY: Record<string, string> = {
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  OSB: 'osb',
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  CONTREPLAQUE: 'contreplaque',
  MELAMINE: 'melamines',
  STRATIFIE: 'stratifies-hpl',
  COMPACT: 'compacts-hpl',
  BANDE_DE_CHANT: 'chants',
  PANNEAU_MASSIF: 'bois-massifs',
  SOLID_SURFACE: 'solid-surface',
  PLACAGE: 'plaques-bois',
};

async function analyseCategories() {
  console.log('='.repeat(70));
  console.log('PHASE 3: ANALYSE DES CATÉGORIES MAL ASSIGNÉES');
  console.log('='.repeat(70));

  for (const [productType, expectedSlug] of Object.entries(PRODUCT_TYPE_TO_EXPECTED_CATEGORY)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${productType} → devrait être dans "${expectedSlug}"`);
    console.log('='.repeat(60));

    // Trouver tous les panneaux avec ce productType
    const panels = await prisma.panel.findMany({
      where: { productType, isActive: true },
      select: {
        id: true,
        name: true,
        categoryId: true,
        catalogueId: true,
        category: { select: { slug: true, name: true, parent: { select: { slug: true } } } },
        catalogue: { select: { name: true } },
      },
    });

    if (panels.length === 0) {
      console.log(`  Aucun panneau avec productType=${productType}`);
      continue;
    }

    console.log(`  Total: ${panels.length} panneaux`);

    // Grouper par catégorie actuelle
    const byCategory = new Map<string, number>();
    const byCatalogue = new Map<string, number>();
    let inCorrectCategory = 0;
    let inWrongCategory = 0;

    for (const panel of panels) {
      const catSlug = panel.category?.slug || 'SANS_CATEGORIE';
      const parentSlug = panel.category?.parent?.slug || '';
      const fullPath = parentSlug ? `${parentSlug}/${catSlug}` : catSlug;
      const catName = panel.catalogue?.name || 'Unknown';

      byCategory.set(fullPath, (byCategory.get(fullPath) || 0) + 1);
      byCatalogue.set(catName, (byCatalogue.get(catName) || 0) + 1);

      // Vérifier si dans la bonne catégorie
      if (catSlug === expectedSlug || parentSlug === expectedSlug) {
        inCorrectCategory++;
      } else {
        inWrongCategory++;
      }
    }

    console.log(`\n  ✅ Dans la bonne catégorie: ${inCorrectCategory}`);
    console.log(`  ❌ Dans une mauvaise catégorie: ${inWrongCategory}`);

    console.log('\n  Par catégorie actuelle:');
    const sortedCats = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cat, count] of sortedCats.slice(0, 10)) {
      const isCorrect = cat.includes(expectedSlug) ? '✅' : '❌';
      console.log(`    ${isCorrect} ${cat}: ${count}`);
    }
    if (sortedCats.length > 10) {
      console.log(`    ... et ${sortedCats.length - 10} autres catégories`);
    }

    console.log('\n  Par catalogue:');
    for (const [cat, count] of byCatalogue.entries()) {
      console.log(`    - ${cat}: ${count}`);
    }
  }

  // Résumé des actions nécessaires
  console.log('\n' + '='.repeat(70));
  console.log('RÉSUMÉ DES RÉASSIGNATIONS NÉCESSAIRES');
  console.log('='.repeat(70));

  let totalToReassign = 0;
  for (const [productType, expectedSlug] of Object.entries(PRODUCT_TYPE_TO_EXPECTED_CATEGORY)) {
    const wrongCount = await prisma.panel.count({
      where: {
        productType,
        isActive: true,
        NOT: {
          category: {
            OR: [
              { slug: expectedSlug },
              { parent: { slug: expectedSlug } },
            ],
          },
        },
      },
    });

    if (wrongCount > 0) {
      console.log(`  ${productType}: ${wrongCount} panneaux à réassigner vers "${expectedSlug}"`);
      totalToReassign += wrongCount;
    }
  }

  console.log(`\n  TOTAL: ${totalToReassign} panneaux à réassigner`);

  await prisma.$disconnect();
}

analyseCategories().catch(console.error);
