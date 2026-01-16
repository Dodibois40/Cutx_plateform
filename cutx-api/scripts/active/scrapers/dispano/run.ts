#!/usr/bin/env npx tsx
/**
 * Dispano Scraper - Script d'exécution
 *
 * Usage:
 *   npx tsx scripts/dispano/run.ts                     # Scrape toutes les catégories
 *   npx tsx scripts/dispano/run.ts "Panneau Mélaminé Blanc"  # Scrape une catégorie
 *   npx tsx scripts/dispano/run.ts --list              # Liste les catégories
 *
 * Prérequis:
 *   1. Lancer Chrome en mode debug: start chrome --remote-debugging-port=9222
 *   2. Se connecter sur dispano.fr avec son compte pro
 */

import { DISPANO_CATEGORIES, DISPANO_CONFIG, Category, SubCategory } from './config';
import {
  connectToChrome,
  getProductLinks,
  scrapeProduct,
  saveProduct,
  prisma,
  ScrapingStats,
} from './scraper';

async function scrapeCategory(
  page: any,
  category: Category,
  catalogueId: string,
  parentCategoryId: string,
  stats: ScrapingStats
): Promise<void> {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📁 ${category.name}`);
  console.log(`${'━'.repeat(60)}`);

  // Scraper les sous-catégories ou la catégorie directement
  const toScrape = category.subCategories.length > 0
    ? category.subCategories
    : [{ name: category.name, slug: category.slug, url: category.url }];

  for (const subCat of toScrape) {
    console.log(`\n   📂 ${subCat.name}`);

    // Créer la sous-catégorie en DB
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

    // Récupérer les liens produits
    const productLinks = await getProductLinks(page, subCat.url);

    if (productLinks.length === 0) {
      console.log(`   ⚠️ Aucun produit trouvé`);
      continue;
    }

    stats.byCategory.set(subCat.name, 0);

    for (let i = 0; i < productLinks.length; i++) {
      const url = productLinks[i];
      stats.totalProducts++;

      const filename = url.split('/').pop()?.substring(0, 40) || '';
      process.stdout.write(`\r   [${i + 1}/${productLinks.length}] ${filename}...`);

      const product = await scrapeProduct(page, url);

      if (product) {
        const saved = await saveProduct(product, catalogueId, dbCategory.id, category.slug);

        if (saved) {
          stats.created++;
          stats.byCategory.set(subCat.name, (stats.byCategory.get(subCat.name) || 0) + 1);

          if (product.imageUrl) stats.withImages++;
          if (product.stockStatus) stats.withStock++;

          const stockIcon = product.stockStatus ? '📦' : '';
          const imgIcon = product.imageUrl ? '🖼️' : '';
          console.log(`\r   [${i + 1}/${productLinks.length}] ✅ ${product.refDispano} ${stockIcon}${imgIcon}`);
        } else {
          stats.errors++;
        }
      } else {
        stats.errors++;
        console.log(`\r   [${i + 1}/${productLinks.length}] ⚠️ Échec extraction`);
      }

      // Pause entre produits
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  // --list : afficher les catégories
  if (args.includes('--list')) {
    console.log('\n📋 CATÉGORIES DISPANO DISPONIBLES:\n');
    DISPANO_CATEGORIES.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat.name}`);
      cat.subCategories.forEach((sub) => {
        console.log(`   - ${sub.name}`);
      });
    });
    console.log(`\nTotal: ${DISPANO_CATEGORIES.length} catégories principales`);
    return;
  }

  // Déterminer quelles catégories scraper
  let categoriesToScrape = DISPANO_CATEGORIES;

  if (args.length > 0 && !args[0].startsWith('--')) {
    const categoryName = args[0];
    const found = DISPANO_CATEGORIES.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );
    if (!found) {
      console.error(`❌ Catégorie "${categoryName}" non trouvée.`);
      console.log('   Utilisez --list pour voir les catégories disponibles.');
      process.exit(1);
    }
    categoriesToScrape = [found];
  }

  console.log('🔧 SCRAPING DISPANO');
  console.log('='.repeat(60));
  console.log(`📦 Catalogue: ${DISPANO_CONFIG.catalogueName}`);
  console.log(`📂 Catégories: ${categoriesToScrape.length}`);
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

  // Créer/récupérer le catalogue Dispano
  console.log('\n📦 Initialisation catalogue...');
  const catalogue = await prisma.catalogue.upsert({
    where: { slug: DISPANO_CONFIG.catalogueSlug },
    update: {
      name: DISPANO_CONFIG.catalogueName,
      description: 'Catalogue Dispano - Panneaux et dérivés bois',
      isActive: true,
    },
    create: {
      name: DISPANO_CONFIG.catalogueName,
      slug: DISPANO_CONFIG.catalogueSlug,
      description: 'Catalogue Dispano - Panneaux et dérivés bois',
      isActive: true,
    },
  });
  console.log(`   ✅ Catalogue: ${catalogue.name} (${catalogue.id})`);

  // Scraper chaque catégorie
  for (const category of categoriesToScrape) {
    // Créer la catégorie principale
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

    await scrapeCategory(page, category, catalogue.id, parentCategory.id, stats);
  }

  // Résumé final
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`✨ SCRAPING TERMINÉ!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   📦 Produits traités: ${stats.totalProducts}`);
  console.log(`   ✅ Créés/mis à jour: ${stats.created}`);
  console.log(`   🖼️  Avec images: ${stats.withImages}`);
  console.log(`   📦 Avec stock: ${stats.withStock}`);
  console.log(`   ❌ Erreurs: ${stats.errors}`);
  console.log(`${'='.repeat(60)}`);

  console.log(`\n📊 Par catégorie:`);
  for (const [cat, count] of stats.byCategory) {
    if (count > 0) {
      console.log(`   - ${cat}: ${count}`);
    }
  }

  // Vérification finale
  const totalDispano = await prisma.panel.count({
    where: { catalogueId: catalogue.id },
  });
  const totalBouney = await prisma.panel.count({
    where: { catalogue: { slug: 'bouney' } },
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ÉTAT DES CATALOGUES:`);
  console.log(`   📌 Dispano: ${totalDispano} panneaux`);
  console.log(`   📌 Bouney: ${totalBouney} panneaux`);
  console.log(`   📌 TOTAL: ${totalDispano + totalBouney} panneaux`);
  console.log(`${'='.repeat(60)}`);

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur:', e);
  await prisma.$disconnect();
  process.exit(1);
});
