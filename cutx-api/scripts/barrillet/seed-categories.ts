#!/usr/bin/env npx tsx
/**
 * Script d'initialisation du catalogue Barrillet
 *
 * Cree le catalogue et toutes les categories/sous-categories en base de donnees.
 * Ne necessite pas Chrome, utile pour initialiser rapidement la structure.
 *
 * Usage:
 *   npx tsx scripts/barrillet/seed-categories.ts
 */

import { PrismaClient } from '@prisma/client';
import { BARRILLET_CATEGORIES, BARRILLET_CONFIG, getCategoryStats } from './config';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log(' INITIALISATION CATALOGUE BARRILLET');
  console.log('='.repeat(60));

  // Creer le catalogue
  console.log('\n Creation du catalogue...');
  const catalogue = await prisma.catalogue.upsert({
    where: { slug: BARRILLET_CONFIG.catalogueSlug },
    update: {
      name: BARRILLET_CONFIG.catalogueName,
      description: 'Catalogue Barrillet - Negoce de panneaux et derives bois',
      isActive: true,
    },
    create: {
      name: BARRILLET_CONFIG.catalogueName,
      slug: BARRILLET_CONFIG.catalogueSlug,
      description: 'Catalogue Barrillet - Negoce de panneaux et derives bois',
      isActive: true,
    },
  });

  console.log(`   Catalogue cree: ${catalogue.name}`);
  console.log(`   ID: ${catalogue.id}`);
  console.log(`   Slug: ${catalogue.slug}`);

  // Creer les categories
  console.log('\n Creation des categories...\n');

  let createdCategories = 0;
  let createdSubCategories = 0;

  for (const category of BARRILLET_CATEGORIES) {
    // Creer la categorie principale
    const parentCategory = await prisma.category.upsert({
      where: {
        catalogueId_slug: { catalogueId: catalogue.id, slug: category.slug },
      },
      update: { name: category.name },
      create: {
        name: category.name,
        slug: category.slug,
        catalogueId: catalogue.id,
      },
    });

    createdCategories++;
    console.log(` + ${category.name} (${category.subCategories.length} sous-categories)`);

    // Creer les sous-categories
    for (const subCat of category.subCategories) {
      await prisma.category.upsert({
        where: {
          catalogueId_slug: { catalogueId: catalogue.id, slug: subCat.slug },
        },
        update: { name: subCat.name, parentId: parentCategory.id },
        create: {
          name: subCat.name,
          slug: subCat.slug,
          catalogueId: catalogue.id,
          parentId: parentCategory.id,
        },
      });

      createdSubCategories++;
      console.log(`    - ${subCat.name}`);
    }
  }

  // Resume
  console.log('\n' + '='.repeat(60));
  console.log(' INITIALISATION TERMINEE');
  console.log('='.repeat(60));
  console.log(`   Catalogue: ${catalogue.name}`);
  console.log(`   Categories principales: ${createdCategories}`);
  console.log(`   Sous-categories: ${createdSubCategories}`);
  console.log(`   Total: ${createdCategories + createdSubCategories} categories`);
  console.log('='.repeat(60));

  // Afficher l'etat des catalogues
  const catalogues = await prisma.catalogue.findMany({
    include: {
      _count: {
        select: {
          panels: true,
          categories: true,
        },
      },
    },
  });

  console.log('\n ETAT DES CATALOGUES:');
  for (const cat of catalogues) {
    console.log(`   ${cat.name}: ${cat._count.panels} panneaux, ${cat._count.categories} categories`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(' Erreur:', e);
  await prisma.$disconnect();
  process.exit(1);
});
