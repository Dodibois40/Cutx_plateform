/**
 * Script pour scraper les catégories Chants de Dispano
 *
 * Usage:
 *   npx tsx scripts/dispano/run-chants.ts                     # Toutes les catégories
 *   npx tsx scripts/dispano/run-chants.ts "ABS Standard"      # Une catégorie spécifique
 *   npx tsx scripts/dispano/run-chants.ts --list              # Lister les catégories
 *   npx tsx scripts/dispano/run-chants.ts --discover          # Découvrir les URLs
 *
 * Prérequis:
 *   Chrome lancé avec: chrome --remote-debugging-port=9222
 */

import { PrismaClient } from '@prisma/client';
import {
  CHANTS_CATEGORIES,
  ALL_CHANTS_SUBCATEGORIES,
  DISPANO_CHANTS_CONFIG,
  printChantCategorySummary,
  type ChantSubCategory,
} from './config-chants';
import {
  connectToChrome,
  getChantProductLinks,
  scrapeChant,
  saveChant,
  type DispanoChant,
} from './scraper-chants';

const prisma = new PrismaClient();

const DELAY_BETWEEN_PRODUCTS = 500;
const DELAY_BETWEEN_CATEGORIES = 3000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Scraper une catégorie complète de chants
 */
async function scrapeCategory(
  page: any,
  category: ChantSubCategory,
  catalogueId: string
): Promise<{ saved: number; errors: number }> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`CATEGORIE: ${category.name}`);
  console.log(`URL: ${category.url}`);
  console.log('='.repeat(50));

  let saved = 0;
  let errors = 0;

  try {
    // Récupérer tous les liens produits de la catégorie
    const productLinks = await getChantProductLinks(page, category.url);

    if (productLinks.length === 0) {
      console.log(`   Aucun produit trouve`);
      return { saved: 0, errors: 0 };
    }

    console.log(`   Scraping de ${productLinks.length} produits...\n`);

    for (let i = 0; i < productLinks.length; i++) {
      const productUrl = productLinks[i];
      const progress = `[${i + 1}/${productLinks.length}]`;

      try {
        const chant = await scrapeChant(page, productUrl, category.slug);

        if (chant) {
          const success = await saveChant(chant, catalogueId, category.slug);
          if (success) {
            saved++;
            // Afficher infos utiles
            const priceInfo = chant.prixRouleau
              ? `${chant.prixRouleau.toFixed(2)}EUR/rouleau`
              : 'prix N/A';
            const dimInfo =
              chant.largeur > 0
                ? `${chant.largeur}mm x ${chant.longueurRouleau}m`
                : 'dim N/A';
            console.log(
              `   OK ${progress} ${chant.nom.substring(0, 35)}... | ${dimInfo} | ${priceInfo}`
            );
          } else {
            errors++;
          }
        } else {
          errors++;
          console.log(`   SKIP ${progress} Echec extraction`);
        }
      } catch (err) {
        errors++;
        console.log(`   ERR ${progress} ${(err as Error).message.substring(0, 30)}`);
      }

      await delay(DELAY_BETWEEN_PRODUCTS);
    }
  } catch (err) {
    console.log(`   Erreur categorie: ${(err as Error).message}`);
  }

  console.log(`\n   RESULTAT: ${saved} sauvegardes, ${errors} erreurs`);
  return { saved, errors };
}

/**
 * Découvrir les URLs des catégories
 */
async function discoverUrls(page: any): Promise<void> {
  console.log('\nDECOUVERTE DES URLs CHANTS...\n');

  // Aller sur la page principale ABS Standard pour commencer
  const mainUrl = 'https://www.dispano.fr/c/abs-standard/x2visu_dig_onv2_2079134R5';
  console.log(`Navigation vers: ${mainUrl}`);

  await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  // Chercher tous les liens de catégories
  const categories = await page.evaluate(() => {
    const results: { name: string; url: string }[] = [];

    document.querySelectorAll('a[href*="/c/"]').forEach((link) => {
      const href = (link as HTMLAnchorElement).href;
      const text = link.textContent?.trim() || '';

      // Filtrer les liens pertinents
      if (
        text &&
        href &&
        (href.includes('abs-') ||
          href.includes('chant') ||
          href.includes('melamine') ||
          href.includes('laser') ||
          href.includes('bois') ||
          href.includes('decospan') ||
          href.includes('losan'))
      ) {
        if (!results.some((r) => r.url === href)) {
          results.push({ name: text, url: href });
        }
      }
    });

    return results;
  });

  console.log(`\nCategories trouvees: ${categories.length}\n`);
  categories.forEach((cat) => {
    console.log(`  - ${cat.name}`);
    console.log(`    ${cat.url}`);
  });

  // Analyser un produit pour voir la structure
  console.log('\n\nANALYSE D\'UN PRODUIT CHANT...\n');

  const firstProductUrl = await page.evaluate(() => {
    const link = document.querySelector('a[href*="/p/"]') as HTMLAnchorElement;
    return link?.href || null;
  });

  if (firstProductUrl) {
    console.log(`Premier produit: ${firstProductUrl}`);

    await page.goto(firstProductUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const productData = await page.evaluate(() => {
      const pageText = document.body.innerText;

      return {
        title: document.querySelector('h1')?.textContent?.trim(),
        pageTextSample: pageText.substring(0, 2000),
      };
    });

    console.log(`\nTitre: ${productData.title}`);
    console.log('\n--- Extrait du texte de la page ---');
    console.log(productData.pageTextSample);
    console.log('--- Fin extrait ---\n');
  }

  console.log('\nDecouverte terminee');
}

/**
 * Main
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Option --list
  if (args.includes('--list')) {
    printChantCategorySummary();
    return;
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       SCRAPER DISPANO - CHANTS                   ║');
  console.log('║       Bandes de chant ABS, Melamine, Bois        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // Connexion Chrome
  const browser = await connectToChrome();
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Option --discover
  if (args.includes('--discover')) {
    await discoverUrls(page);
    await page.close();
    return;
  }

  // Récupérer ou créer le catalogue Dispano
  let catalogue = await prisma.catalogue.findFirst({
    where: { slug: DISPANO_CHANTS_CONFIG.catalogueSlug },
  });

  if (!catalogue) {
    catalogue = await prisma.catalogue.create({
      data: {
        name: DISPANO_CHANTS_CONFIG.catalogueName,
        slug: DISPANO_CHANTS_CONFIG.catalogueSlug,
      },
    });
    console.log(`Catalogue cree: ${catalogue.name}`);
  } else {
    console.log(`Catalogue existant: ${catalogue.name}`);
  }

  // Filtrer par catégorie si spécifiée
  const categoryFilter = args.find((a) => !a.startsWith('--'));
  let categoriesToScrape = ALL_CHANTS_SUBCATEGORIES;

  if (categoryFilter) {
    const filterLower = categoryFilter.toLowerCase();
    categoriesToScrape = categoriesToScrape.filter(
      (cat) =>
        cat.name.toLowerCase().includes(filterLower) ||
        cat.slug.toLowerCase().includes(filterLower)
    );

    if (categoriesToScrape.length === 0) {
      console.log(`Aucune categorie trouvee pour "${categoryFilter}"`);
      printChantCategorySummary();
      await prisma.$disconnect();
      return;
    }
  }

  console.log(`\n${categoriesToScrape.length} categories a scraper:\n`);
  categoriesToScrape.forEach((cat, i) => {
    console.log(`  ${i + 1}. ${cat.name}`);
  });
  console.log('');

  let totalSaved = 0;
  let totalErrors = 0;

  for (const cat of categoriesToScrape) {
    const { saved, errors } = await scrapeCategory(page, cat, catalogue.id);
    totalSaved += saved;
    totalErrors += errors;
    await delay(DELAY_BETWEEN_CATEGORIES);
  }

  await page.close();

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                 RESUME FINAL                     ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Chants sauvegardes: ${String(totalSaved).padStart(6)}                    ║`);
  console.log(`║  Erreurs:            ${String(totalErrors).padStart(6)}                    ║`);
  console.log(`║  Catalogue:          ${catalogue.name.padEnd(27)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Erreur fatale:', err);
  prisma.$disconnect();
  process.exit(1);
});
