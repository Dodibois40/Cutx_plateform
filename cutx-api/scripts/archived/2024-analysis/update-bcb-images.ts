/**
 * UPDATE BCB IMAGES - Mise à jour des images manquantes
 *
 * 1. Récupère tous les liens produits depuis la page catégorie
 * 2. Visite chaque page pour extraire l'image
 * 3. Met à jour les panels existants qui n'ont pas d'image
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Scroll pour charger tous les produits
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  console.log('   📜 Scroll pour charger tous les produits...');

  try {
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
  } catch (err) {
    console.log('   ⚠️ Scroll interrompu (navigation?)');
  }
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
        const href = link.href;
        if (href.includes('bcommebois.fr') && !href.includes('unis.html')) {
          links.push(href);
        }
      }
    });

    return [...new Set(links)];
  });
}

/**
 * Extraire les codes de référence et l'image d'une page produit
 */
async function extractImageAndCodes(page: Page, url: string): Promise<{ codes: string[]; imageUrl: string | null }> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    const data = await page.evaluate(() => {
      const codes: string[] = [];

      // Extract reference from URL
      const urlMatch = window.location.href.match(/-(\d{5,6})\.html$/);
      if (urlMatch) codes.push(urlMatch[1]);

      // Get image - try multiple selectors
      let imageUrl: string | null = null;

      // First try: product catalog images (main product image)
      const catalogImgs = document.querySelectorAll('img[src*="/media/catalog/product/"]');
      for (const img of catalogImgs) {
        const src = (img as HTMLImageElement).src;
        // Skip small cache versions (thumbnails) and logos
        if (src && !src.includes('logo') && src.length > 50) {
          imageUrl = src;
          break;
        }
      }

      // Fallback: any product image
      if (!imageUrl) {
        const img = document.querySelector('.product-media img, .product-image img, img[src*="product"]') as HTMLImageElement;
        imageUrl = img?.src || null;
      }

      // Find codes in tables
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          cells.forEach(cell => {
            const text = cell.textContent?.trim() || '';
            const codeMatch = text.match(/^\s*(\d{5,6})\s*$/);
            if (codeMatch) {
              codes.push(codeMatch[1]);
            }
          });
        });
      });

      return { codes: [...new Set(codes)], imageUrl };
    });

    return data;

  } catch (err) {
    return { codes: [], imageUrl: null };
  }
}

/**
 * Main
 */
async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const skipNav = args.includes('--skip-nav');
  const limitIdx = args.indexOf('--limit');
  const maxProducts = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 0;

  // Get category URL (first non-flag argument)
  const categoryUrl = args.find(a => !a.startsWith('--') && !a.match(/^\d+$/))
    || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html';

  console.log('═'.repeat(60));
  console.log('🖼️  UPDATE BCB IMAGES - Mise à jour des images manquantes');
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
    console.error('❌ Chrome non connecté. Lancez Chrome en mode debug.');
    process.exit(1);
  }

  // Always create a new tab to avoid navigation issues
  const page = await browser.newPage();

  // Get panels without images
  const panelsWithoutImages = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      imageUrl: null,
    },
    select: { id: true, reference: true },
  });

  const missingRefs = new Set(panelsWithoutImages.map(p => p.reference.replace('BCB-', '')));
  console.log(`📊 ${panelsWithoutImages.length} panels BCB sans image`);

  // Load category page
  console.log('\n📄 Chargement de la page catégorie...');
  await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  await scrollToLoadAll(page);

  // Get product links
  console.log('\n🔗 Récupération des liens produits...');
  let productLinks = await getProductLinks(page);
  console.log(`   ✅ ${productLinks.length} liens produits trouvés`);

  if (maxProducts > 0) {
    productLinks = productLinks.slice(0, maxProducts);
    console.log(`   📌 Limité à ${productLinks.length} produits`);
  }

  // Visit each page and update images
  console.log('\n🖼️  Mise à jour des images...');
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  // Disable trigger
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger`);
  } catch (e) {
    console.log('   ⚠️ Could not disable trigger');
  }

  for (let i = 0; i < productLinks.length; i++) {
    const url = productLinks[i];
    const shortUrl = url.split('/').pop()?.substring(0, 40) || url;

    const { codes, imageUrl } = await extractImageAndCodes(page, url);

    if (!imageUrl) {
      process.stdout.write(`   [${i + 1}/${productLinks.length}] ${shortUrl} - pas d'image\n`);
      continue;
    }

    // Update all panels with matching codes
    let updatedThisPage = 0;
    for (const code of codes) {
      if (missingRefs.has(code)) {
        const ref = `BCB-${code}`;

        if (!testMode) {
          try {
            await prisma.panel.updateMany({
              where: { reference: ref, imageUrl: null },
              data: { imageUrl },
            });
            updatedThisPage++;
            updated++;
            missingRefs.delete(code);
          } catch (e) {
            // Ignore
          }
        } else {
          updatedThisPage++;
          updated++;
        }
      }
    }

    if (updatedThisPage > 0) {
      console.log(`   [${i + 1}/${productLinks.length}] ${shortUrl} - ✅ ${updatedThisPage} images`);
    } else {
      skipped++;
    }

    // Small delay
    await new Promise(r => setTimeout(r, 300));
  }

  // Re-enable trigger
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger`);
  } catch (e) {
    // Ignore
  }

  // Stats
  console.log('\n' + '═'.repeat(60));
  console.log('📈 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Pages visitées: ${productLinks.length}`);
  console.log(`   Images mises à jour: ${updated}`);
  console.log(`   Panels ignorés (déjà avec image): ${skipped}`);
  console.log(`   Panels toujours sans image: ${missingRefs.size}`);

  if (missingRefs.size > 0 && missingRefs.size <= 20) {
    console.log(`   Refs manquantes: ${[...missingRefs].slice(0, 20).join(', ')}`);
  }

  // Close the page we created
  await page.close();
  await browser.disconnect();
  await prisma.$disconnect();

  console.log('\n✅ Terminé!');
}

main().catch(console.error);
