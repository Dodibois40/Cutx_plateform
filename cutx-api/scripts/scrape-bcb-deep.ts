/**
 * SCRAPER BCB - Deep Scraping (visite chaque page produit)
 *
 * 1. Récupère tous les liens produits depuis la page catégorie
 * 2. Visite chaque page produit individuellement
 * 3. Extrait toutes les références et variantes
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductVariant {
  reference: string;
  manufacturerRef: string;
  name: string;
  productType: string;
  length: number;
  width: number;
  thickness: number;
  supportQuality: string;
  pricePerM2: number | null;
  pricePerMl: number | null;
  stockStatus: string;
  imageUrl: string | null;
  decor: string;
  colorChoice: string;
  finish: string;
}

/**
 * Scroll pour charger tous les produits
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  console.log('   📜 Scroll pour charger tous les produits...');

  let previousHeight = 0;
  let passes = 0;

  while (passes < 30) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    if (currentHeight === previousHeight) {
      passes++;
      if (passes >= 3) break;
    } else {
      passes = 0;
    }

    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 300));
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
  console.log('   ✅ Scroll terminé');
}

/**
 * Récupérer tous les liens produits depuis la page catégorie
 */
async function getProductLinks(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const links: string[] = [];
    const wrappers = document.querySelectorAll('[id^="product-wrapper-"]');

    wrappers.forEach(wrapper => {
      const link = wrapper.querySelector('a[href*=".html"]') as HTMLAnchorElement;
      if (link && link.href && !link.href.includes('#')) {
        // Get the actual product page link (not the anchor link)
        const href = link.href;
        if (href.includes('bcommebois.fr') && !href.includes('unis.html')) {
          links.push(href);
        }
      }
    });

    // Deduplicate
    return [...new Set(links)];
  });
}

/**
 * Extraire la référence depuis l'URL (pour les produits sans table)
 */
function extractRefFromUrl(url: string): string | null {
  // Pattern: product-name-XXXXX.html where XXXXX is 5-6 digits
  const match = url.match(/-(\d{5,6})\.html$/);
  return match ? match[1] : null;
}

/**
 * Extraire les données d'une page produit individuelle
 */
async function extractProductPage(page: Page, url: string): Promise<ProductVariant[]> {
  const results: ProductVariant[] = [];

  // Check if URL contains a reference code
  const urlRef = extractRefFromUrl(url);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    const data = await page.evaluate(() => {
      const variants: any[] = [];

      // Get product name from page title or h1
      const h1 = document.querySelector('h1');
      const productName = h1?.textContent?.trim() || '';

      // Get manufacturer ref
      const refMatch = productName.match(/^([A-Z0-9]+)\s/);
      const manufacturerRef = refMatch ? refMatch[1] : '';

      // Get image
      const img = document.querySelector('.product-media img, .product-image img') as HTMLImageElement;
      const imageUrl = img?.src || null;

      // Find all tables with product variants
      const tables = document.querySelectorAll('table');

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');

        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 5) return;

          const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');
          const rowText = cellTexts.join(' ').toLowerCase();

          // Find the reference code (5-6 digits)
          let code = '';
          for (const text of cellTexts) {
            const codeMatch = text.match(/^\s*(\d{5,6})\s*$/);
            if (codeMatch) {
              code = codeMatch[1];
              break;
            }
          }

          if (!code) return;

          // Determine product type
          let productType = 'STRATIFIE';
          if (rowText.includes('mélamin') || rowText.includes('melamin')) productType = 'MELAMINE';
          else if (rowText.includes('compact')) productType = 'COMPACT';
          else if (rowText.includes('chant') || rowText.includes('abs')) productType = 'BANDE_DE_CHANT';

          // Parse dimensions
          let length = 0, width = 0, thickness = 0;

          for (let i = 0; i < Math.min(cellTexts.length, 4); i++) {
            const text = cellTexts[i];
            const numMatch = text.match(/^[\d.,]+$/);
            if (numMatch) {
              const val = parseFloat(text.replace(',', '.'));
              if (i === 0 || (i === 1 && length === 0)) {
                // First numeric column is usually length in meters
                if (val < 10) length = Math.round(val * 1000);
                else length = Math.round(val);
              } else if (i === 1 || (i === 2 && width === 0)) {
                // Second numeric column is width
                if (val < 10) width = Math.round(val * 1000);
                else width = Math.round(val);
              } else if (i === 2 || i === 3) {
                // Third column is thickness in mm
                thickness = val;
              }
            }
          }

          // Parse support quality
          let supportQuality = '';
          for (const text of cellTexts) {
            const lower = text.toLowerCase();
            if (lower.includes('hpl') || lower.includes('panneau') ||
                lower.includes('particule') || lower.includes('mdf') ||
                lower.includes('abs')) {
              supportQuality = text;
              break;
            }
          }

          // Parse stock status
          let stockStatus = 'Sur commande';
          if (rowText.includes('en stock')) stockStatus = 'EN STOCK';

          // Parse price
          let pricePerM2: number | null = null;
          let pricePerMl: number | null = null;

          for (const text of cellTexts) {
            if (text.includes('€')) {
              const priceMatch = text.match(/([\d.,]+)\s*€/);
              if (priceMatch) {
                const price = parseFloat(priceMatch[1].replace(',', '.'));
                if (productType === 'BANDE_DE_CHANT' || rowText.includes('/ml')) {
                  pricePerMl = price;
                } else {
                  pricePerM2 = price;
                }
              }
              break;
            }
          }

          variants.push({
            code,
            productName,
            manufacturerRef,
            productType,
            length,
            width,
            thickness,
            supportQuality,
            pricePerM2,
            pricePerMl,
            stockStatus,
            imageUrl,
          });
        });
      });

      // Extract characteristics from page
      const pageText = document.body.innerText || '';
      let decor = 'unis';
      let colorChoice = '';
      let finish = '';
      let supportQuality = '';
      let length = 0;
      let width = 0;
      let thickness = 0;
      let pricePerM2: number | null = null;
      let stockStatus = 'Sur commande';

      // Extract from characteristics section
      const lengthMatch = pageText.match(/Longueur\s*\(m\)\s*[\n\r]+\s*([\d.,]+)/i);
      if (lengthMatch) length = Math.round(parseFloat(lengthMatch[1].replace(',', '.')) * 1000);

      const widthMatch = pageText.match(/Largeur\s*\(m\)\s*[\n\r]+\s*([\d.,]+)/i);
      if (widthMatch) width = Math.round(parseFloat(widthMatch[1].replace(',', '.')) * 1000);

      const thicknessMatch = pageText.match(/Hauteur\s*\(mm\)\s*[\n\r]+\s*([\d.,]+)/i);
      if (thicknessMatch) thickness = parseFloat(thicknessMatch[1].replace(',', '.'));

      const supportMatch = pageText.match(/Qualité\/Support\s*[\n\r]+\s*([^\n\r]+)/i);
      if (supportMatch) supportQuality = supportMatch[1].trim();

      const decorMatch = pageText.match(/Décor\/Essence\s*[\n\r]+\s*(\w+)/i);
      if (decorMatch) decor = decorMatch[1];

      const colorMatch = pageText.match(/Coloris\/Choix\s*[\n\r]+\s*([^\n\r]+)/i);
      if (colorMatch) colorChoice = colorMatch[1].trim();

      const finishMatch = pageText.match(/Finition\s*[\n\r]+\s*(\w+)/i);
      if (finishMatch) finish = finishMatch[1];

      // Extract price
      const priceMatch = pageText.match(/([\d.,]+)\s*€\s*\(unité de vente:\s*M2\)/i);
      if (priceMatch) pricePerM2 = parseFloat(priceMatch[1].replace(',', '.'));

      // Check stock
      if (pageText.includes('EN STOCK')) stockStatus = 'EN STOCK';

      return {
        variants,
        productName,
        manufacturerRef,
        imageUrl,
        decor,
        colorChoice,
        finish,
        supportQuality,
        length,
        width,
        thickness,
        pricePerM2,
        stockStatus,
      };
    });

    // Build final variants from table rows
    for (const v of data.variants) {
      results.push({
        reference: `BCB-${v.code}`,
        manufacturerRef: v.manufacturerRef,
        name: v.productName || `${v.productType} ${v.code}`,
        productType: v.productType,
        length: v.length,
        width: v.width,
        thickness: v.thickness,
        supportQuality: v.supportQuality,
        pricePerM2: v.pricePerM2,
        pricePerMl: v.pricePerMl,
        stockStatus: v.stockStatus,
        imageUrl: v.imageUrl,
        decor: data.decor,
        colorChoice: data.colorChoice,
        finish: data.finish,
      });
    }

    // If no table variants found but URL has a reference, create variant from page data
    if (data.variants.length === 0 && urlRef) {
      // Determine product type from name
      let productType = 'STRATIFIE';
      const nameLower = data.productName.toLowerCase();
      if (nameLower.includes('mélamin') || nameLower.includes('melamin')) productType = 'MELAMINE';
      else if (nameLower.includes('compact')) productType = 'COMPACT';
      else if (nameLower.includes('chant')) productType = 'BANDE_DE_CHANT';

      results.push({
        reference: `BCB-${urlRef}`,
        manufacturerRef: data.manufacturerRef,
        name: data.productName,
        productType,
        length: data.length,
        width: data.width,
        thickness: data.thickness,
        supportQuality: data.supportQuality,
        pricePerM2: data.pricePerM2,
        pricePerMl: null,
        stockStatus: data.stockStatus,
        imageUrl: data.imageUrl,
        decor: data.decor,
        colorChoice: data.colorChoice,
        finish: data.finish,
      });
    }

  } catch (err) {
    console.log(`   ⚠️ Error on ${url}: ${(err as Error).message.substring(0, 50)}`);
  }

  return results;
}

/**
 * Sauvegarder les produits en base
 */
async function saveProducts(products: ProductVariant[], catalogueId: string): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;

  // Disable triggers
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" DISABLE TRIGGER ALL`);
  } catch (e) {
    console.log('   ⚠️ Could not disable triggers');
  }

  for (const product of products) {
    try {
      await prisma.panel.upsert({
        where: {
          catalogueId_reference: {
            catalogueId,
            reference: product.reference,
          },
        },
        update: {
          name: product.name,
          manufacturerRef: product.manufacturerRef || null,
          productType: product.productType,
          material: product.productType === 'STRATIFIE' ? 'Stratifié' :
                    product.productType === 'MELAMINE' ? 'Mélaminé' :
                    product.productType === 'COMPACT' ? 'Compact' :
                    product.productType === 'BANDE_DE_CHANT' ? 'Chant' : 'Panneau',
          thickness: product.thickness > 0 ? [product.thickness] : [],
          defaultThickness: product.thickness > 0 ? product.thickness : null,
          defaultLength: product.length,
          defaultWidth: product.width,
          pricePerM2: product.pricePerM2,
          pricePerMl: product.pricePerMl,
          stockStatus: product.stockStatus,
          supportQuality: product.supportQuality || null,
          imageUrl: product.imageUrl,
          decor: product.decor || null,
          colorChoice: product.colorChoice || null,
          finish: product.finish || null,
          isActive: true,
        },
        create: {
          reference: product.reference,
          name: product.name,
          manufacturerRef: product.manufacturerRef || null,
          productType: product.productType,
          material: product.productType === 'STRATIFIE' ? 'Stratifié' :
                    product.productType === 'MELAMINE' ? 'Mélaminé' :
                    product.productType === 'COMPACT' ? 'Compact' :
                    product.productType === 'BANDE_DE_CHANT' ? 'Chant' : 'Panneau',
          thickness: product.thickness > 0 ? [product.thickness] : [],
          defaultThickness: product.thickness > 0 ? product.thickness : null,
          defaultLength: product.length,
          defaultWidth: product.width,
          pricePerM2: product.pricePerM2,
          pricePerMl: product.pricePerMl,
          stockStatus: product.stockStatus,
          supportQuality: product.supportQuality || null,
          imageUrl: product.imageUrl,
          decor: product.decor || null,
          colorChoice: product.colorChoice || null,
          finish: product.finish || null,
          isActive: true,
          catalogueId,
        },
      });
      saved++;
    } catch (err) {
      errors++;
      if (errors <= 3) {
        console.log(`   ❌ Error saving ${product.reference}: ${(err as Error).message.substring(0, 80)}`);
      }
    }
  }

  // Re-enable triggers
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" ENABLE TRIGGER ALL`);
  } catch (e) {
    // Ignore
  }

  return { saved, errors };
}

/**
 * Main
 */
async function main() {
  const categoryUrl = process.argv[2] || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html';
  const testMode = process.argv.includes('--test');
  const maxProducts = process.argv.includes('--limit') ?
    parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : 0;

  console.log('═'.repeat(60));
  console.log('🔄 SCRAPER BCB - Deep Mode (visite chaque produit)');
  console.log('═'.repeat(60));
  console.log(`📍 Catégorie: ${categoryUrl}`);
  console.log(`🧪 Mode test: ${testMode ? 'OUI' : 'NON'}`);
  if (maxProducts > 0) console.log(`🔢 Limite: ${maxProducts} produits`);
  console.log('');

  // Connect to Chrome
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Chrome connecté');
  } catch (e) {
    console.error('❌ Chrome non connecté. Lancez launch-chrome-debug.bat');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // Get catalogue
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' },
  });

  if (!catalogue) {
    console.error('❌ Catalogue Bouney non trouvé');
    process.exit(1);
  }
  console.log(`📦 Catalogue: ${catalogue.name}`);

  // Step 1: Load category page and get all product links
  console.log('\n📄 Chargement de la page catégorie...');
  await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  await scrollToLoadAll(page);

  console.log('\n🔗 Récupération des liens produits...');
  let productLinks = await getProductLinks(page);
  console.log(`   ✅ ${productLinks.length} liens produits trouvés`);

  if (maxProducts > 0) {
    productLinks = productLinks.slice(0, maxProducts);
    console.log(`   📌 Limité à ${productLinks.length} produits`);
  }

  // Step 2: Visit each product page
  console.log('\n📊 Extraction des produits (page par page)...');
  const allVariants: ProductVariant[] = [];

  for (let i = 0; i < productLinks.length; i++) {
    const url = productLinks[i];
    const shortUrl = url.split('/').pop()?.substring(0, 50) || url;

    process.stdout.write(`   [${i + 1}/${productLinks.length}] ${shortUrl}...`);

    const variants = await extractProductPage(page, url);
    allVariants.push(...variants);

    console.log(` ${variants.length} variantes`);

    // Small delay to be nice to the server
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n   ✅ Total: ${allVariants.length} variantes extraites`);

  // Show examples
  console.log('\n🔎 Exemples (5 premiers):');
  allVariants.slice(0, 5).forEach((p, i) => {
    console.log(`   [${i + 1}] ${p.reference} - ${p.name.substring(0, 40)}...`);
    console.log(`       ${p.length}x${p.width}x${p.thickness}mm | ${p.pricePerM2 || p.pricePerMl || 'N/A'}€`);
  });

  // Check for 79155
  console.log('\n🔍 Recherche de 79155...');
  const found79155 = allVariants.find(p => p.reference.includes('79155'));
  if (found79155) {
    console.log('   ✅ Trouvé:', found79155.reference, '-', found79155.name);
  } else {
    console.log('   ⚠️ Non trouvé');
  }

  // Save or test
  if (testMode) {
    console.log('\n🧪 Mode test - pas de sauvegarde');
    console.log(`   Total: ${allVariants.length} variantes prêtes`);
  } else {
    console.log('\n💾 Sauvegarde en base...');
    const result = await saveProducts(allVariants, catalogue.id);
    console.log(`   ✅ ${result.saved} sauvegardées`);
    if (result.errors > 0) {
      console.log(`   ❌ ${result.errors} erreurs`);
    }
  }

  // Stats
  console.log('\n' + '═'.repeat(60));
  console.log('📈 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Pages visitées: ${productLinks.length}`);
  console.log(`   Variantes extraites: ${allVariants.length}`);
  console.log(`   Types: ${[...new Set(allVariants.map(p => p.productType))].join(', ')}`);
  console.log(`   Avec prix: ${allVariants.filter(p => p.pricePerM2 || p.pricePerMl).length}`);
  console.log(`   En stock: ${allVariants.filter(p => p.stockStatus === 'EN STOCK').length}`);

  await browser.disconnect();
  await prisma.$disconnect();

  console.log('\n✅ Terminé!');
}

main().catch(console.error);
