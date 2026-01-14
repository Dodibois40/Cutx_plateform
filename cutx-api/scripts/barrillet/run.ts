#!/usr/bin/env npx tsx
/**
 * Barrillet Scraper - Script d'execution
 *
 * Usage:
 *   npx tsx scripts/barrillet/run.ts                       # Scrape toutes les categories
 *   npx tsx scripts/barrillet/run.ts "Panneau melamine"    # Scrape une categorie
 *   npx tsx scripts/barrillet/run.ts --list                # Liste les categories
 *   npx tsx scripts/barrillet/run.ts --seed                # Initialise le catalogue et categories uniquement
 *
 * Prerequis:
 *   1. Lancer Chrome en mode debug: start chrome --remote-debugging-port=9222
 *   2. Se connecter sur barillet-distribution.fr avec son compte pro
 */

import { BARRILLET_CATEGORIES, BARRILLET_CONFIG, Category, getCategoryStats } from './config';
import {
  connectToChrome,
  scrapeProductsFromListPage,
  saveProduct,
  prisma,
  ScrapingStats,
} from './scraper';

async function seedCatalogueAndCategories(): Promise<string> {
  console.log('\n Initialisation catalogue Barrillet...');

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
  console.log(`   Catalogue: ${catalogue.name} (${catalogue.id})`);

  console.log('\n Creation des categories...');

  for (const category of BARRILLET_CATEGORIES) {
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

    console.log(`   + ${category.name}`);

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
      console.log(`      - ${subCat.name}`);
    }
  }

  const stats = getCategoryStats();
  console.log(`\n Categories creees: ${stats.totalCategories} principales, ${stats.totalSubCategories} sous-categories`);

  return catalogue.id;
}

async function scrapeCategory(
  page: any,
  category: Category,
  catalogueId: string,
  parentCategoryId: string,
  stats: ScrapingStats
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(` ${category.name}`);
  console.log(`${'='.repeat(60)}`);

  // Scraper les sous-categories ou la categorie directement
  const toScrape = category.subCategories.length > 0
    ? category.subCategories
    : [{ name: category.name, slug: category.slug, url: category.url }];

  for (const subCat of toScrape) {
    console.log(`\n    ${subCat.name}`);

    if (!subCat.url) {
      console.log(`    Pas d'URL configuree pour cette categorie`);
      continue;
    }

    // Recuperer ou creer la sous-categorie en DB
    const dbCategory = await prisma.category.upsert({
      where: {
        catalogueId_slug: { catalogueId, slug: subCat.slug },
      },
      update: { name: subCat.name, parentId: parentCategoryId },
      create: {
        name: subCat.name,
        slug: subCat.slug,
        catalogueId,
        parentId: parentCategoryId,
      },
    });

    // Nouvelle methode: extraction directe depuis les pages de liste
    const products = await scrapeProductsFromListPage(page, subCat.url);

    if (products.length === 0) {
      console.log(`    Aucun produit trouve`);
      continue;
    }

    stats.byCategory.set(subCat.name, 0);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      stats.totalProducts++;

      const saved = await saveProduct(product, catalogueId, dbCategory.id, category.slug);

      if (saved) {
        stats.created++;
        stats.byCategory.set(subCat.name, (stats.byCategory.get(subCat.name) || 0) + 1);

        if (product.imageUrl) stats.withImages++;
        if (product.stockStatus) stats.withStock++;

        // Afficher progression tous les 10 produits
        if ((i + 1) % 10 === 0 || i === products.length - 1) {
          process.stdout.write(`\r   [${i + 1}/${products.length}] ${product.refBarrillet}`);
        }
      } else {
        stats.errors++;
      }
    }

    console.log(`\n   ${stats.byCategory.get(subCat.name)} produits sauvegardes`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // --list : afficher les categories
  if (args.includes('--list')) {
    console.log('\n CATEGORIES BARRILLET DISPONIBLES:\n');
    BARRILLET_CATEGORIES.forEach((cat, i) => {
      const hasUrl = cat.url ? ' [URL]' : '';
      console.log(`${i + 1}. ${cat.name}${hasUrl}`);
      cat.subCategories.forEach((sub) => {
        const subHasUrl = sub.url ? ' [URL]' : '';
        console.log(`   - ${sub.name}${subHasUrl}`);
      });
    });
    const stats = getCategoryStats();
    console.log(`\nTotal: ${stats.totalCategories} categories principales, ${stats.totalSubCategories} sous-categories`);
    return;
  }

  // --seed : initialiser le catalogue et categories uniquement
  if (args.includes('--seed')) {
    const catalogueId = await seedCatalogueAndCategories();
    console.log(`\n Catalogue initialise avec ID: ${catalogueId}`);
    await prisma.$disconnect();
    return;
  }

  // Determiner quelles categories scraper
  let categoriesToScrape = BARRILLET_CATEGORIES;

  if (args.length > 0 && !args[0].startsWith('--')) {
    const categoryName = args[0];
    const found = BARRILLET_CATEGORIES.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (!found) {
      console.error(` Categorie "${categoryName}" non trouvee.`);
      console.log('   Utilisez --list pour voir les categories disponibles.');
      process.exit(1);
    }
    categoriesToScrape = [found];
  }

  console.log(' SCRAPING BARRILLET');
  console.log('='.repeat(60));
  console.log(` Site: ${BARRILLET_CONFIG.baseUrl}`);
  console.log(` Catalogue: ${BARRILLET_CONFIG.catalogueName}`);
  console.log(` Categories: ${categoriesToScrape.length}`);
  console.log('='.repeat(60));

  // Connexion Chrome
  const browser = await connectToChrome();
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  // Stats
  const stats: ScrapingStats = {
    totalProducts: 0,
    created: 0,
    updated: 0,
    errors: 0,
    withImages: 0,
    withStock: 0,
    byCategory: new Map(),
  };

  // Initialiser le catalogue
  const catalogueId = await seedCatalogueAndCategories();

  // Scraper chaque categorie
  for (const category of categoriesToScrape) {
    const parentCategory = await prisma.category.findFirst({
      where: {
        catalogueId,
        slug: category.slug,
      },
    });

    if (parentCategory) {
      await scrapeCategory(page, category, catalogueId, parentCategory.id, stats);
    }
  }

  // Resume final
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(` SCRAPING TERMINE!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   Produits traites: ${stats.totalProducts}`);
  console.log(`   Crees/mis a jour: ${stats.created}`);
  console.log(`   Avec images: ${stats.withImages}`);
  console.log(`   Avec stock: ${stats.withStock}`);
  console.log(`   Erreurs: ${stats.errors}`);
  console.log(`${'='.repeat(60)}`);

  console.log(`\n Par categorie:`);
  for (const [cat, count] of stats.byCategory) {
    if (count > 0) {
      console.log(`   - ${cat}: ${count}`);
    }
  }

  // Verification finale
  const totalBarrillet = await prisma.panel.count({
    where: { catalogueId },
  });
  const totalDispano = await prisma.panel.count({
    where: { catalogue: { slug: 'dispano' } },
  });
  const totalBouney = await prisma.panel.count({
    where: { catalogue: { slug: 'bouney' } },
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(` ETAT DES CATALOGUES:`);
  console.log(`   Barrillet: ${totalBarrillet} panneaux`);
  console.log(`   Dispano: ${totalDispano} panneaux`);
  console.log(`   Bouney: ${totalBouney} panneaux`);
  console.log(`   TOTAL: ${totalBarrillet + totalDispano + totalBouney} panneaux`);
  console.log(`${'='.repeat(60)}`);

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(' Erreur:', e);
  await prisma.$disconnect();
  process.exit(1);
});
