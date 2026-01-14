/**
 * Scrape prices for BCB chants from Bouney website
 * Uses the search page to get prices for products without prices
 */

import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ChantPrice {
  ref: string;
  price: number;
  priceUnit: 'ml' | 'm2' | 'unit';
}

async function scrapePricesFromSearch(): Promise<ChantPrice[]> {
  const url = 'https://www.bcommebois.fr/catalogsearch/result/?q=chant';

  console.log('🔍 Scraping chant prices from:', url);

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Chrome connecté\n');
  } catch (e) {
    console.error('❌ Chrome non connecté');
    throw e;
  }

  const page = await browser.newPage();
  const allPrices: ChantPrice[] = [];

  // Paginate through all results
  let currentPage = 1;
  const maxPages = 30;

  while (currentPage <= maxPages) {
    const pageUrl = currentPage === 1 ? url : `${url}&p=${currentPage}`;
    console.log(`📄 Page ${currentPage}: ${pageUrl}`);

    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const pageData = await page.evaluate(() => {
      const results: { prices: any[], hasNext: boolean } = { prices: [], hasNext: false };

      // Get all product items
      const items = document.querySelectorAll('.product-item');

      items.forEach((item) => {
        const nameEl = item.querySelector('.product-item-name a, .product-item-link, a[href*=".html"]');
        const href = nameEl?.getAttribute('href') || '';

        // Extract ref from URL (last number before .html)
        const refMatch = href.match(/-(\d{5,6})\.html$/);
        if (!refMatch) return;

        const ref = refMatch[1];

        // Get price - look for various price formats
        const priceEl = item.querySelector('.price, .special-price .price, .regular-price .price');
        const priceText = priceEl?.textContent?.trim() || '';

        // Parse price: "0,45 €" or "0.45 €" or "0,45€/ml"
        const priceMatch = priceText.match(/([\d.,]+)\s*€/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(',', '.'));
          if (price > 0) {
            // Determine price unit - chants are usually per ml
            const priceUnit = priceText.toLowerCase().includes('/m²') ? 'm2' :
                             priceText.toLowerCase().includes('/ml') ? 'ml' : 'ml';
            results.prices.push({ ref, price, priceUnit });
          }
        }
      });

      // Check if there's a next page
      const nextLink = document.querySelector('.pages-item-next a, a.next');
      results.hasNext = nextLink !== null;

      return results;
    });

    allPrices.push(...pageData.prices);
    console.log(`   Trouvé: ${pageData.prices.length} prix`);

    if (!pageData.hasNext) {
      console.log('   → Dernière page atteinte');
      break;
    }

    currentPage++;
  }

  await page.close();
  await browser.disconnect();

  // Deduplicate by ref
  const uniqueMap = new Map<string, ChantPrice>();
  allPrices.forEach(p => {
    if (!uniqueMap.has(p.ref)) {
      uniqueMap.set(p.ref, p);
    }
  });

  const unique = Array.from(uniqueMap.values());
  console.log(`\n📊 Total prix uniques: ${unique.length}`);

  return unique;
}

async function updatePrices(prices: ChantPrice[]) {
  console.log('\n📝 Mise à jour des prix en base de données...\n');

  // Get all BCB chants without price
  const bcbChants = await prisma.panel.findMany({
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

  console.log(`📋 Chants BCB sans prix: ${bcbChants.length}`);

  // Create lookup map
  const priceMap = new Map<string, ChantPrice>();
  prices.forEach(p => {
    priceMap.set(p.ref, p);
  });

  // Disable trigger
  await prisma.$executeRaw`ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger`;

  let updated = 0;
  let notFound = 0;
  const updatedList: string[] = [];

  for (const panel of bcbChants) {
    // Extract ref number from BCB-xxxxx
    const refMatch = panel.reference.match(/BCB-(\d+)/);
    if (!refMatch) continue;

    const refNum = refMatch[1];
    const priceData = priceMap.get(refNum);

    if (!priceData) {
      notFound++;
      continue;
    }

    // Update price
    const updateData: any = {};
    if (priceData.priceUnit === 'ml') {
      updateData.pricePerMl = priceData.price;
    } else if (priceData.priceUnit === 'm2') {
      updateData.pricePerM2 = priceData.price;
    } else {
      updateData.pricePerUnit = priceData.price;
    }

    await prisma.panel.update({
      where: { id: panel.id },
      data: updateData,
    });

    updated++;
    updatedList.push(`${panel.reference}: ${priceData.price}€/${priceData.priceUnit}`);

    if (updated % 20 === 0) {
      console.log(`   ✅ ${updated} prix mis à jour...`);
    }
  }

  // Re-enable trigger
  await prisma.$executeRaw`ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger`;

  console.log(`\n✅ Mise à jour terminée:`);
  console.log(`   - Mis à jour: ${updated}`);
  console.log(`   - Non trouvé sur le site: ${notFound}`);

  // Show sample of updates
  if (updatedList.length > 0) {
    console.log(`\n📋 Exemples de mises à jour:`);
    updatedList.slice(0, 15).forEach(u => console.log(`   ${u}`));
    if (updatedList.length > 15) {
      console.log(`   ... et ${updatedList.length - 15} autres`);
    }
  }
}

async function main() {
  try {
    const prices = await scrapePricesFromSearch();

    // Show sample
    console.log('\n📋 Exemples de prix extraits:');
    prices.slice(0, 10).forEach(p => {
      console.log(`   BCB-${p.ref}: ${p.price}€/${p.priceUnit}`);
    });

    await updatePrices(prices);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
