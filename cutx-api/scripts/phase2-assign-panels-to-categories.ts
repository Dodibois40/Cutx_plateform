/**
 * PHASE 2B: ASSIGNER LES PANNEAUX AUX NOUVELLES CATÉGORIES
 *
 * Les panneaux ont le bon productType mais pas encore le bon categoryId.
 * Ce script assigne les panneaux aux nouvelles catégories créées.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PRODUCT_TYPE_TO_CATEGORY_SLUG: Record<string, string> = {
  PANNEAU_MURAL: 'panneaux-muraux',
  PANNEAU_DECORATIF: 'panneaux-decoratifs',
  PANNEAU_3_PLIS: 'panneaux-3-plis',
  LATTE: 'panneaux-lattes',
  PANNEAU_ISOLANT: 'panneaux-isolants',
  PANNEAU_ALVEOLAIRE: 'panneaux-alveolaires',
  CIMENT_BOIS: 'ciment-bois',
};

async function phase2b() {
  console.log('='.repeat(70));
  console.log('PHASE 2B: ASSIGNER LES PANNEAUX AUX NOUVELLES CATÉGORIES');
  console.log('='.repeat(70));

  // Pour chaque mapping productType → categorySlug
  for (const [productType, categorySlug] of Object.entries(PRODUCT_TYPE_TO_CATEGORY_SLUG)) {
    console.log(`\n--- ${productType} → ${categorySlug} ---`);

    // Trouver tous les panneaux avec ce productType
    const panels = await prisma.panel.findMany({
      where: {
        productType,
        isActive: true,
      },
      select: {
        id: true,
        catalogueId: true,
        categoryId: true,
      },
    });

    if (panels.length === 0) {
      console.log(`  Aucun panneau avec productType=${productType}`);
      continue;
    }

    // Grouper par catalogue
    const panelsByCatalogue = new Map<string, typeof panels>();
    for (const panel of panels) {
      const existing = panelsByCatalogue.get(panel.catalogueId) || [];
      existing.push(panel);
      panelsByCatalogue.set(panel.catalogueId, existing);
    }

    for (const [catalogueId, cataloguePanels] of panelsByCatalogue) {
      // Trouver la catégorie correspondante dans ce catalogue
      const category = await prisma.category.findFirst({
        where: {
          catalogueId,
          slug: categorySlug,
        },
      });

      if (!category) {
        console.log(`  ⚠️  Catégorie ${categorySlug} non trouvée pour catalogue ${catalogueId}`);
        continue;
      }

      // Compter combien sont déjà assignés
      const alreadyAssigned = cataloguePanels.filter(p => p.categoryId === category.id).length;
      const toAssign = cataloguePanels.filter(p => p.categoryId !== category.id);

      if (toAssign.length === 0) {
        console.log(`  ✅ ${cataloguePanels.length} panneaux déjà assignés (catalogue: ${catalogueId.substring(0, 8)}...)`);
        continue;
      }

      // Assigner les panneaux
      const result = await prisma.panel.updateMany({
        where: {
          id: { in: toAssign.map(p => p.id) },
        },
        data: {
          categoryId: category.id,
        },
      });

      console.log(`  ✅ ${result.count} panneaux assignés à ${categorySlug} (catalogue: ${catalogueId.substring(0, 8)}...)`);
    }
  }

  // Vérification finale
  console.log('\n' + '='.repeat(70));
  console.log('VÉRIFICATION FINALE');
  console.log('='.repeat(70));

  for (const [productType, categorySlug] of Object.entries(PRODUCT_TYPE_TO_CATEGORY_SLUG)) {
    const categories = await prisma.category.findMany({
      where: { slug: categorySlug },
      include: {
        catalogue: { select: { name: true } },
        _count: { select: { panels: { where: { isActive: true } } } },
      },
    });

    if (categories.length === 0) {
      console.log(`\n${productType}: Aucune catégorie ${categorySlug}`);
      continue;
    }

    const totalPanels = categories.reduce((acc, c) => acc + c._count.panels, 0);
    console.log(`\n${productType} → ${categorySlug}: ${totalPanels} panneaux total`);
    for (const cat of categories) {
      console.log(`  - ${cat.catalogue.name}: ${cat._count.panels} panneaux`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ PHASE 2B TERMINÉE');
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

phase2b().catch(console.error);
