/**
 * Debug: analyze price structure on Bouney search page
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const url = 'https://www.bcommebois.fr/catalogsearch/result/?q=chant+93869';

  console.log('🔍 Debug page recherche prix Bouney');
  console.log(`📍 URL: ${url}\n`);

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Chrome connecté\n');
  } catch (e) {
    console.error('❌ Chrome non connecté');
    process.exit(1);
  }

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const data = await page.evaluate(() => {
    const results: any = { products: [] };

    // Get all product items
    const items = document.querySelectorAll('.product-item');
    console.log('Found items:', items.length);

    items.forEach((item, idx) => {
      if (idx >= 5) return;

      const productData: any = {};

      // Get name and link
      const nameEl = item.querySelector('.product-item-name a, .product-item-link');
      productData.name = nameEl?.textContent?.trim();
      productData.href = nameEl?.getAttribute('href');

      // Get all text in item
      productData.fullText = item.textContent?.replace(/\s+/g, ' ').trim().substring(0, 300);

      // Look for price elements within this item
      const priceEl = item.querySelector('.price, .price-box .price, .price-wrapper .price');
      productData.priceElement = priceEl?.textContent?.trim();

      // Look for any € in the item
      const itemText = item.textContent || '';
      const priceMatch = itemText.match(/([\d.,]+)\s*€/);
      productData.priceFromText = priceMatch ? priceMatch[0] : null;

      // Get HTML of price section
      const priceBox = item.querySelector('.price-box');
      productData.priceBoxHtml = priceBox?.innerHTML?.substring(0, 200);

      results.products.push(productData);
    });

    // Check if prices are visible at all on page
    const pageText = document.body.innerText || '';
    const allPrices = pageText.match(/([\d.,]+)\s*€/g);
    results.allPricesOnPage = [...new Set(allPrices || [])].slice(0, 20);

    // Check for login requirement message
    results.loginRequired = pageText.includes('connecter') || pageText.includes('login');

    return results;
  });

  console.log('📋 Produits trouvés:', data.products.length);
  data.products.forEach((p: any, i: number) => {
    console.log(`\n${i+1}. ${p.name}`);
    console.log(`   URL: ${p.href}`);
    console.log(`   Price element: ${p.priceElement || 'N/A'}`);
    console.log(`   Price from text: ${p.priceFromText || 'N/A'}`);
    console.log(`   Full text: ${p.fullText?.substring(0, 150)}...`);
  });

  console.log('\n💰 Tous les prix sur la page:', data.allPricesOnPage);
  console.log('🔐 Login requis mention:', data.loginRequired);

  await page.close();
  await browser.disconnect();
}

main().catch(console.error);
