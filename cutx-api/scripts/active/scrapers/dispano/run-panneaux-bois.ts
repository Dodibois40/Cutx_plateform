/**
 * Script pour scraper les catégories Panneaux Bois de Dispano
 *
 * Usage:
 *   npx tsx scripts/dispano/run-panneaux-bois.ts                     # Toutes les catégories
 *   npx tsx scripts/dispano/run-panneaux-bois.ts "Contreplaqués"     # Une catégorie spécifique
 *   npx tsx scripts/dispano/run-panneaux-bois.ts --list              # Lister les catégories
 *
 * Prérequis:
 *   Chrome lancé avec: chrome --remote-debugging-port=9222
 */

import { PrismaClient } from '@prisma/client';
import {
  PANNEAUX_BOIS_CATEGORIES,
  ALL_PANNEAUX_BOIS_SUBCATEGORIES,
  DISPANO_PANNEAUX_BOIS_CONFIG,
  determineProductTypePanneauxBois,
  generateReferencePanneauxBois,
  printCategorySummary,
  type SubCategory,
} from './config-panneaux-bois';
import {
  connectToChrome,
  getProductLinks,
  scrapeProduct,
  type DispanoProduct,
} from './scraper';

const prisma = new PrismaClient();

const DELAY_BETWEEN_PRODUCTS = 500;
const DELAY_BETWEEN_CATEGORIES = 3000;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sauvegarde un produit Panneaux Bois en base
 */
async function saveProductPanneauxBois(
  product: DispanoProduct,
  catalogueId: string,
  categorySlug: string
): Promise<boolean> {
  try {
    const reference = generateReferencePanneauxBois(product.refDispano, categorySlug);
    const productType = determineProductTypePanneauxBois(product.nom, categorySlug);

    // Métadonnées étendues
    const extendedData: Record<string, any> = {};
    if (product.marque) extendedData.marque = product.marque;
    if (product.refMarque) extendedData.refMarque = product.refMarque;
    if (product.codeEAN) extendedData.codeEAN = product.codeEAN;
    if (product.prixPublic) extendedData.prixPublic = product.prixPublic;
    if (product.poids) extendedData.poids = product.poids;
    if (product.classeFeu) extendedData.classeFeu = product.classeFeu;
    if (product.co2) extendedData.co2 = product.co2;
    if (product.teinte) extendedData.teinte = product.teinte;
    if (product.gamme) extendedData.gamme = product.gamme;
    if (product.formaldehyde) extendedData.formaldehyde = product.formaldehyde;
    if (product.classementParticules) extendedData.classementParticules = product.classementParticules;
    if (product.ignifuge) extendedData.ignifuge = product.ignifuge;
    if (product.deuxFacesIdentiques !== null) extendedData.deuxFacesIdentiques = product.deuxFacesIdentiques;
    if (product.support) extendedData.support = product.support;
    if (product.stockQuantity) extendedData.stockQuantity = product.stockQuantity;
    if (product.imageUrls.length > 1) extendedData.additionalImages = product.imageUrls.slice(1);

    const metadataJson = Object.keys(extendedData).length > 0 ? JSON.stringify(extendedData) : null;
    const stockLocationsJson = product.stockLocations.length > 0 ? JSON.stringify(product.stockLocations) : null;

    await prisma.panel.upsert({
      where: {
        catalogueId_reference: { catalogueId, reference },
      },
      update: {
        name: product.nom,
        thickness: product.epaisseur > 0 ? [product.epaisseur] : [],
        defaultLength: product.longueur,
        defaultWidth: product.largeur,
        pricePerM2: product.prixM2,
        manufacturerRef: product.refMarque,
        material: product.support || null,
        finish: product.finition,
        productType,
        decor: product.decor,
        colorCode: product.refDecor,
        imageUrl: product.imageUrl,
        stockStatus: product.stockStatus,
        stockLocations: stockLocationsJson,
        isActive: true,
        metadata: metadataJson,
      },
      create: {
        reference,
        name: product.nom,
        thickness: product.epaisseur > 0 ? [product.epaisseur] : [],
        defaultLength: product.longueur,
        defaultWidth: product.largeur,
        pricePerM2: product.prixM2,
        manufacturerRef: product.refMarque,
        material: product.support || null,
        finish: product.finition,
        productType,
        decor: product.decor,
        colorCode: product.refDecor,
        imageUrl: product.imageUrl,
        stockStatus: product.stockStatus,
        stockLocations: stockLocationsJson,
        catalogueId,
        isActive: true,
        metadata: metadataJson,
      },
    });

    return true;
  } catch (error) {
    console.log(`      ⚠️ DB: ${(error as Error).message.substring(0, 50)}`);
    return false;
  }
}

/**
 * Scraper une catégorie complète
 */
async function scrapeCategory(
  page: any,
  category: SubCategory,
  catalogueId: string
): Promise<{ saved: number; errors: number }> {
  console.log(`\n📂 ${category.name}`);
  console.log(`   URL: ${category.url}`);

  let saved = 0;
  let errors = 0;

  try {
    // Récupérer tous les liens produits de la catégorie
    const productLinks = await getProductLinks(page, category.url);

    if (productLinks.length === 0) {
      console.log(`   ⚠️ Aucun produit trouvé`);
      return { saved: 0, errors: 0 };
    }

    console.log(`   🔄 Scraping de ${productLinks.length} produits...`);

    for (let i = 0; i < productLinks.length; i++) {
      const productUrl = productLinks[i];
      const progress = `[${i + 1}/${productLinks.length}]`;

      try {
        const product = await scrapeProduct(page, productUrl);

        if (product) {
          const success = await saveProductPanneauxBois(product, catalogueId, category.slug);
          if (success) {
            saved++;
            console.log(`   ✅ ${progress} ${product.nom.substring(0, 40)}...`);
          } else {
            errors++;
          }
        } else {
          errors++;
          console.log(`   ⚠️ ${progress} Échec extraction`);
        }
      } catch (err) {
        errors++;
        console.log(`   ❌ ${progress} Erreur: ${(err as Error).message.substring(0, 30)}`);
      }

      await delay(DELAY_BETWEEN_PRODUCTS);
    }

  } catch (err) {
    console.log(`   ❌ Erreur catégorie: ${(err as Error).message}`);
  }

  console.log(`   📊 Résultat: ${saved} sauvegardés, ${errors} erreurs`);
  return { saved, errors };
}

/**
 * Main
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Option --list
  if (args.includes('--list')) {
    printCategorySummary();
    return;
  }

  console.log('🚀 Scraper Dispano - Panneaux Bois');
  console.log('==================================\n');

  // Connexion Chrome
  const browser = await connectToChrome();
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Récupérer ou créer le catalogue Dispano
  let catalogue = await prisma.catalogue.findFirst({
    where: { slug: DISPANO_PANNEAUX_BOIS_CONFIG.catalogueSlug },
  });

  if (!catalogue) {
    catalogue = await prisma.catalogue.create({
      data: {
        name: DISPANO_PANNEAUX_BOIS_CONFIG.catalogueName,
        slug: DISPANO_PANNEAUX_BOIS_CONFIG.catalogueSlug,
      },
    });
    console.log(`📦 Catalogue créé: ${catalogue.name}`);
  } else {
    console.log(`📦 Catalogue existant: ${catalogue.name}`);
  }

  // Filtrer par catégorie si spécifiée
  const categoryFilter = args.find(a => !a.startsWith('--'));
  let categoriesToScrape = ALL_PANNEAUX_BOIS_SUBCATEGORIES;

  if (categoryFilter) {
    const filterLower = categoryFilter.toLowerCase();
    categoriesToScrape = categoriesToScrape.filter(
      cat =>
        cat.name.toLowerCase().includes(filterLower) ||
        cat.slug.toLowerCase().includes(filterLower)
    );

    if (categoriesToScrape.length === 0) {
      console.log(`❌ Aucune catégorie trouvée pour "${categoryFilter}"`);
      printCategorySummary();
      await prisma.$disconnect();
      return;
    }
  }

  console.log(`\n📋 ${categoriesToScrape.length} catégories à scraper\n`);
  console.log('='.repeat(50));

  let totalSaved = 0;
  let totalErrors = 0;

  for (const cat of categoriesToScrape) {
    const { saved, errors } = await scrapeCategory(page, cat, catalogue.id);
    totalSaved += saved;
    totalErrors += errors;
    await delay(DELAY_BETWEEN_CATEGORIES);
  }

  await page.close();

  console.log('\n' + '='.repeat(50));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(50));
  console.log(`✅ Produits sauvegardés: ${totalSaved}`);
  console.log(`❌ Erreurs: ${totalErrors}`);
  console.log(`📦 Catalogue: ${catalogue.name}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  prisma.$disconnect();
  process.exit(1);
});
