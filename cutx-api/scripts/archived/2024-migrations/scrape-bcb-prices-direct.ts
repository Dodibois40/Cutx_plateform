/**
 * Scrape prices for BCB chants by visiting individual product pages
 * Slower but necessary since prices aren't on search page
 */

import puppeteer, { Page, Browser } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function extractPriceFromPage(page: Page, url: string): Promise<{ price: number; unit: string } | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));

    const priceData = await page.evaluate(() => {
      // Look for price elements
      const priceEl = document.querySelector('.price, .price-box .price, .price-final_price .price');
      const priceText = priceEl?.textContent?.trim() || '';

      // Parse price
      const priceMatch = priceText.match(/([\d.,]+)\s*€/);
      if (!priceMatch) return null;

      const price = parseFloat(priceMatch[1].replace(',', '.'));
      if (isNaN(price) || price <= 0) return null;

      // Get unit from surrounding text
      const priceBox = document.querySelector('.price-box');
      const boxText = priceBox?.textContent?.toLowerCase() || '';

      let unit = 'ml'; // Default for chants
      if (boxText.includes('m²') || boxText.includes('m2')) unit = 'm2';
      else if (boxText.includes('unité') || boxText.includes('pièce')) unit = 'unit';

      return { price, unit };
    });

    return priceData;
  } catch (e) {
    console.error(`   ❌ Erreur: ${url}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Scraping prix des chants BCB (pages individuelles)\n');

  // Get BCB chants without price
  const chantsWithoutPrice = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
      pricePerMl: null,
      pricePerM2: null,
      pricePerUnit: null,
    },
    select: {
      id: true,
      reference: true,
      name: true,
    },
  });

  console.log(`📋 Chants sans prix: ${chantsWithoutPrice.length}\n`);

  if (chantsWithoutPrice.length === 0) {
    console.log('✅ Tous les chants ont déjà un prix!');
    await prisma.$disconnect();
    return;
  }

  // Connect to Chrome
  let browser: Browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Chrome connecté\n');
  } catch (e) {
    console.error('❌ Chrome non connecté');
    await prisma.$disconnect();
    return;
  }

  const page = await browser.newPage();

  // Disable trigger
  await prisma.$executeRaw`ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger`;

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < chantsWithoutPrice.length; i++) {
    const chant = chantsWithoutPrice[i];

    // Extract ref number
    const refMatch = chant.reference.match(/BCB-(\d+)/);
    if (!refMatch) {
      notFound++;
      continue;
    }

    const refNum = refMatch[1];

    // Build URL - need to find the correct URL pattern
    // We'll search for the product first
    const searchUrl = `https://www.bcommebois.fr/catalogsearch/result/?q=${refNum}`;

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(r => setTimeout(r, 1500));

      // Find product link with this ref
      const productUrl = await page.evaluate((ref) => {
        const links = document.querySelectorAll('a[href*=".html"]');
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          if (href.includes(`-${ref}.html`)) {
            return href;
          }
        }
        return null;
      }, refNum);

      if (!productUrl) {
        notFound++;
        if ((i + 1) % 20 === 0) {
          console.log(`   Progression: ${i + 1}/${chantsWithoutPrice.length} (${updated} mis à jour)`);
        }
        continue;
      }

      // Visit product page and get price
      const priceData = await extractPriceFromPage(page, productUrl);

      if (priceData) {
        // Update database
        const updateData: any = {};
        if (priceData.unit === 'ml') {
          updateData.pricePerMl = priceData.price;
        } else if (priceData.unit === 'm2') {
          updateData.pricePerM2 = priceData.price;
        } else {
          updateData.pricePerUnit = priceData.price;
        }

        await prisma.panel.update({
          where: { id: chant.id },
          data: updateData,
        });

        updated++;
        console.log(`   ✅ ${chant.reference}: ${priceData.price}€/${priceData.unit}`);
      } else {
        notFound++;
      }
    } catch (e) {
      errors++;
    }

    // Progress update every 20 items
    if ((i + 1) % 20 === 0) {
      console.log(`\n   📊 Progression: ${i + 1}/${chantsWithoutPrice.length} (${updated} mis à jour)\n`);
    }

    // Small delay to not overload the server
    await new Promise(r => setTimeout(r, 500));
  }

  // Re-enable trigger
  await prisma.$executeRaw`ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger`;

  await page.close();
  await browser.disconnect();
  await prisma.$disconnect();

  console.log(`\n✅ Terminé:`);
  console.log(`   - Mis à jour: ${updated}`);
  console.log(`   - Non trouvé: ${notFound}`);
  console.log(`   - Erreurs: ${errors}`);
}

main().catch(console.error);
