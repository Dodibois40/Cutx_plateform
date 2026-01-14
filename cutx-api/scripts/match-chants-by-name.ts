/**
 * Analyse comment matcher les chants Bouney avec la page de recherche
 * On va regarder les noms pour voir le pattern
 */

import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get BCB chants from database
  const dbChants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
    },
    select: {
      reference: true,
      name: true,
      manufacturerRef: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
    },
    take: 30,
  });

  console.log('📋 Chants BCB en base:\n');
  dbChants.forEach(c => {
    console.log(`${c.reference}: ${c.name}`);
    console.log(`  ManufRef: ${c.manufacturerRef}, L=${c.defaultLength}, W=${c.defaultWidth}, T=${c.defaultThickness}`);
  });

  // Now scrape some products from search page
  console.log('\n\n🔍 Scraping search page...\n');

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome non connecté');
    return;
  }

  const page = await browser.newPage();
  await page.goto('https://www.bcommebois.fr/catalogsearch/result/?q=chant', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const pageProducts = await page.evaluate(() => {
    const products: any[] = [];

    // Get all product items
    const items = document.querySelectorAll('.product-item');
    items.forEach((item, idx) => {
      if (idx >= 30) return;

      const nameEl = item.querySelector('.product-item-name a, .product-item-link');
      const name = nameEl?.textContent?.trim();
      const href = nameEl?.getAttribute('href');

      // Get all text in the item
      const text = item.textContent?.replace(/\s+/g, ' ').trim();

      // Try to extract ref and dimensions
      const refMatch = text?.match(/(\d{5,6})/);
      const dimMatch = text?.match(/(\d{2,3})\s*[x×]\s*([\d.,]+)/);

      products.push({
        name,
        href,
        ref: refMatch ? refMatch[1] : null,
        width: dimMatch ? dimMatch[1] : null,
        thickness: dimMatch ? dimMatch[2] : null,
        rawText: text?.substring(0, 200),
      });
    });

    return products;
  });

  console.log('📋 Produits sur la page de recherche:\n');
  pageProducts.slice(0, 15).forEach((p, i) => {
    console.log(`${i+1}. ${p.name}`);
    console.log(`   Ref: ${p.ref}, Dims: ${p.width}x${p.thickness}`);
    console.log(`   Raw: ${p.rawText?.substring(0, 100)}...`);
    console.log();
  });

  await page.close();
  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(console.error);
