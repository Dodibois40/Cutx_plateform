/**
 * Script pour découvrir les URLs des catégories Chants sur Dispano
 * et valider/mettre à jour la configuration
 *
 * Usage:
 *   npx tsx scripts/dispano/discover-chants-urls.ts
 *
 * Prérequis:
 *   Chrome lancé avec: chrome --remote-debugging-port=9222
 */

import puppeteer from 'puppeteer-core';
import { CHANTS_CATEGORIES, printChantCategorySummary } from './config-chants';

const BASE_URL = 'https://www.dispano.fr';

interface DiscoveredCategory {
  name: string;
  url: string;
  productCount: number;
}

async function discoverChantUrls(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║    DECOUVERTE URLs CHANTS DISPANO                ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Afficher la configuration actuelle
  console.log('CONFIGURATION ACTUELLE:');
  console.log('-'.repeat(50));
  printChantCategorySummary();

  // Vérifier chaque catégorie configurée
  console.log('\nVERIFICATION DES URLs CONFIGUREES...\n');

  const results: DiscoveredCategory[] = [];

  for (const mainCat of CHANTS_CATEGORIES) {
    console.log(`\n📂 ${mainCat.name}`);

    // Vérifier la catégorie principale
    if (mainCat.url) {
      console.log(`   Verification: ${mainCat.url}`);
      try {
        await page.goto(mainCat.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 2000));

        const productCount = await page.evaluate(() => {
          return document.querySelectorAll('a[href*="/p/"]').length;
        });

        console.log(`   ✅ OK - ${productCount} produits trouves`);
        results.push({ name: mainCat.name, url: mainCat.url, productCount });
      } catch (e) {
        console.log(`   ❌ Erreur: ${(e as Error).message.substring(0, 50)}`);
      }
    }

    // Vérifier les sous-catégories
    for (const subCat of mainCat.subCategories) {
      if (subCat.url) {
        console.log(`   └─ ${subCat.name}`);
        console.log(`      Verification: ${subCat.url}`);
        try {
          await page.goto(subCat.url, { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise((r) => setTimeout(r, 2000));

          const productCount = await page.evaluate(() => {
            return document.querySelectorAll('a[href*="/p/"]').length;
          });

          console.log(`      ✅ OK - ${productCount} produits trouves`);
          results.push({ name: subCat.name, url: subCat.url, productCount });
        } catch (e) {
          console.log(`      ❌ Erreur: ${(e as Error).message.substring(0, 50)}`);
        }
      } else {
        console.log(`   └─ ${subCat.name}`);
        console.log(`      ⚠️ URL manquante`);
      }
    }
  }

  // Explorer la page principale pour découvrir de nouvelles catégories
  console.log('\n\nDECOUVERTE DE NOUVELLES CATEGORIES...\n');

  const mainUrl = 'https://www.dispano.fr/c/abs-standard/x2visu_dig_onv2_2079134R5';
  await page.goto(mainUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const discoveredLinks = await page.evaluate(() => {
    const links: { name: string; url: string }[] = [];

    document.querySelectorAll('a[href*="/c/"]').forEach((el) => {
      const href = (el as HTMLAnchorElement).href;
      const text = el.textContent?.trim() || '';

      if (
        text &&
        href &&
        (href.includes('abs') ||
          href.includes('chant') ||
          href.includes('melamine') ||
          href.includes('laser') ||
          href.includes('bois') ||
          href.includes('decospan') ||
          href.includes('losan'))
      ) {
        if (!links.some((l) => l.url === href)) {
          links.push({ name: text, url: href });
        }
      }
    });

    return links;
  });

  console.log(`Liens de categories trouves: ${discoveredLinks.length}\n`);
  discoveredLinks.forEach((link) => {
    const isConfigured = results.some((r) => r.url === link.url);
    const status = isConfigured ? '✅' : '🆕';
    console.log(`${status} ${link.name}`);
    console.log(`   ${link.url}`);
  });

  await page.close();

  // Résumé
  console.log('\n' + '='.repeat(60));
  console.log('RESUME');
  console.log('='.repeat(60));
  console.log(`Categories verifiees: ${results.length}`);
  console.log(
    `Produits totaux estimes: ${results.reduce((sum, r) => sum + r.productCount, 0)}`
  );
  console.log('');
  console.log('Pour lancer le scraping:');
  console.log('  npx tsx scripts/dispano/run-chants.ts');
  console.log('');
  console.log('Pour tester un produit:');
  console.log('  npx tsx scripts/dispano/test-chant.ts');
  console.log('');
}

discoverChantUrls().catch((e) => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
