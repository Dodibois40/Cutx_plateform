/**
 * PHASE 2: CRÉATION DES CATÉGORIES MANQUANTES
 *
 * Crée les catégories de niveau 1 pour les 7 productTypes sans mapping :
 * - panneaux-muraux (PANNEAU_MURAL)
 * - panneaux-decoratifs (PANNEAU_DECORATIF)
 * - panneaux-3-plis (PANNEAU_3_PLIS)
 * - panneaux-lattes (LATTE)
 * - panneaux-isolants (PANNEAU_ISOLANT)
 * - panneaux-alveolaires (PANNEAU_ALVEOLAIRE)
 * - ciment-bois (CIMENT_BOIS)
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface CategoryToCreate {
  slug: string;
  name: string;
  productType: string;
}

const CATEGORIES_TO_CREATE: CategoryToCreate[] = [
  {
    slug: 'panneaux-muraux',
    name: 'Panneaux Muraux',
    productType: 'PANNEAU_MURAL',
  },
  {
    slug: 'panneaux-decoratifs',
    name: 'Panneaux Décoratifs',
    productType: 'PANNEAU_DECORATIF',
  },
  {
    slug: 'panneaux-3-plis',
    name: 'Panneaux 3 Plis',
    productType: 'PANNEAU_3_PLIS',
  },
  {
    slug: 'panneaux-lattes',
    name: 'Panneaux Lattés',
    productType: 'LATTE',
  },
  {
    slug: 'panneaux-isolants',
    name: 'Panneaux Isolants',
    productType: 'PANNEAU_ISOLANT',
  },
  {
    slug: 'panneaux-alveolaires',
    name: 'Panneaux Alvéolaires',
    productType: 'PANNEAU_ALVEOLAIRE',
  },
  {
    slug: 'ciment-bois',
    name: 'Ciment-Bois',
    productType: 'CIMENT_BOIS',
  },
];

async function phase2() {
  console.log('='.repeat(70));
  console.log('PHASE 2: CRÉATION DES CATÉGORIES MANQUANTES');
  console.log('='.repeat(70));

  // 0. Récupérer les catalogues existants
  console.log('\n--- 0. Catalogues existants ---');
  const catalogues = await prisma.catalogue.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true },
  });

  console.log('Catalogues:');
  for (const c of catalogues) {
    console.log(`  - ${c.slug} (${c.name})`);
  }

  // On va créer les catégories pour chaque catalogue
  for (const catalogue of catalogues) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`CATALOGUE: ${catalogue.name} (${catalogue.slug})`);
    console.log('='.repeat(60));

    // 1. Vérifier les catégories existantes
    const existingCategories = await prisma.category.findMany({
      where: {
        catalogueId: catalogue.id,
        slug: {
          in: CATEGORIES_TO_CREATE.map(c => c.slug),
        },
      },
      select: { slug: true, name: true },
    });

    if (existingCategories.length > 0) {
      console.log('Catégories déjà existantes:');
      for (const cat of existingCategories) {
        console.log(`  ⏭️  ${cat.slug} (${cat.name})`);
      }
    }

    const existingSlugs = new Set(existingCategories.map(c => c.slug));
    const categoriesToCreate = CATEGORIES_TO_CREATE.filter(c => !existingSlugs.has(c.slug));

    if (categoriesToCreate.length === 0) {
      console.log('✅ Toutes les catégories existent déjà pour ce catalogue!');
      continue;
    }

    // 2. Vérifier quelles catégories ont des panneaux dans ce catalogue
    console.log('\nVérification des panneaux par productType:');
    for (const cat of categoriesToCreate) {
      const count = await prisma.panel.count({
        where: {
          catalogueId: catalogue.id,
          productType: cat.productType,
          isActive: true,
        },
      });

      if (count > 0) {
        console.log(`  ${cat.productType.padEnd(25)} : ${count} panneaux → Création de ${cat.slug}`);

        // Créer la catégorie
        const created = await prisma.category.create({
          data: {
            slug: cat.slug,
            name: cat.name,
            parentId: null, // Niveau 1
            catalogueId: catalogue.id,
          },
        });

        console.log(`  ✅ Créé: ${created.slug}`);
      } else {
        console.log(`  ${cat.productType.padEnd(25)} : 0 panneaux → Pas de création`);
      }
    }
  }

  // 3. Résumé final
  console.log('\n' + '='.repeat(70));
  console.log('RÉSUMÉ FINAL');
  console.log('='.repeat(70));

  const allNewCategories = await prisma.category.findMany({
    where: {
      slug: { in: CATEGORIES_TO_CREATE.map(c => c.slug) },
    },
    include: {
      catalogue: { select: { name: true } },
      _count: { select: { panels: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  console.log('\nNouvelles catégories créées:');
  for (const cat of allNewCategories) {
    console.log(`  ${cat.slug.padEnd(25)} | ${cat.catalogue.name.padEnd(15)} | ${cat._count.panels} panneaux`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ PHASE 2 TERMINÉE');
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

phase2().catch(console.error);
