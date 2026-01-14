/**
 * Analyse la page de recherche "chant" de Bouney pour extraire les dimensions
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const url = 'https://www.bcommebois.fr/catalogsearch/result/?q=chant';

  console.log('🔍 Analyse page recherche chant Bouney');
  console.log('URL:', url);

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
    const results: any = { products: [], rawItems: [] };

    // Log available selectors for debugging
    results.debugSelectors = {
      productItems: document.querySelectorAll('.product-item').length,
      itemProduct: document.querySelectorAll('.item.product').length,
      productItemInfo: document.querySelectorAll('.product-item-info').length,
      olItems: document.querySelectorAll('ol.products li').length,
      dlProductItems: document.querySelectorAll('dl.product-item').length,
    };

    // Try multiple selector strategies
    let items = document.querySelectorAll('ol.products.list li.product-item');
    if (items.length === 0) {
      items = document.querySelectorAll('.product-item-info');
    }
    if (items.length === 0) {
      items = document.querySelectorAll('.products-grid .item');
    }

    items.forEach((item) => {
      const nameEl = item.querySelector('.product-item-name a, .product-item-link, a.product-item-link');
      const name = nameEl?.textContent?.trim();
      const href = nameEl?.getAttribute('href');

      // Get product reference from text
      const itemText = item.textContent || '';
      const refMatch = itemText.match(/\b(\d{5,6})\b/);
      const ref = refMatch ? refMatch[1] : null;

      // Get dimensions from item text
      const dimMatch = itemText.match(/(\d{2,3})\s*[x×]\s*([\d.,]+)/i);
      const dimensions = dimMatch ? `${dimMatch[1]}x${dimMatch[2]}` : null;

      if (name || ref) {
        results.products.push({ name, href, ref, dimensions });
      }

      // Also store raw item text for debugging
      results.rawItems.push(itemText.replace(/\s+/g, ' ').trim().substring(0, 200));
    });

    // Get page text for dimension patterns
    const pageText = document.body.innerText || '';
    const dimMatches = pageText.match(/\b(\d{2,3})\s*[x×]\s*([\d.,]+)\s*(mm)?/gi);
    results.dimensionPatterns = [...new Set(dimMatches || [])];

    // Try to find product blocks with ref and dimensions together
    results.productBlocks = [];
    // Look for pattern: reference (5-6 digits) followed by dimensions
    const blockPattern = /(\d{5,6})[^0-9]*?(\d{2,3})\s*[x×]\s*([\d.,]+)/g;
    let match;
    while ((match = blockPattern.exec(pageText)) !== null) {
      results.productBlocks.push({
        ref: match[1],
        width: match[2],
        thickness: match[3],
      });
    }

    // Count total results shown
    const countEl = document.querySelector('.toolbar-number, .search-result-count');
    results.totalCount = countEl?.textContent?.trim();

    return results;
  });

  console.log('📊 Debug selectors:', JSON.stringify(data.debugSelectors));
  console.log('📊 Produits trouvés:', data.products.length);
  console.log('Total affiché:', data.totalCount);
  console.log('Patterns de dimension:', data.dimensionPatterns.slice(0, 20).join(', '));

  console.log('\n📦 Product blocks (ref + dimensions):', data.productBlocks.length);
  data.productBlocks.slice(0, 20).forEach((b: any, i: number) => {
    console.log(`  ${i+1}. Ref: ${b.ref} → ${b.width}x${b.thickness}mm`);
  });

  console.log('\n📋 Premiers produits:\n');
  data.products.slice(0, 10).forEach((p: any, i: number) => {
    console.log(`${i+1}. ${p.name}`);
    console.log(`   Ref: ${p.ref}, Dimensions: ${p.dimensions}`);
  });

  console.log('\n📄 Raw items (premiers 5):');
  data.rawItems.slice(0, 5).forEach((text: string, i: number) => {
    console.log(`  ${i+1}. ${text}`);
  });

  await page.close();
  await browser.disconnect();
}

main().catch(console.error);
