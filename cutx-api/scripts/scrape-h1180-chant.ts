/**
 * Scrape specific H1180 chant page to understand the structure
 */

import puppeteer from 'puppeteer-core';

async function main() {
  // Search for H1180 chant specifically
  const url = 'https://www.bcommebois.fr/catalogsearch/result/?q=H1180+chant';

  console.log('🔍 Recherche H1180 chant');
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
    return;
  }

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // Get all products from search
  const products = await page.evaluate(() => {
    const results: any[] = [];
    const items = document.querySelectorAll('.product-item');

    items.forEach((item) => {
      const nameEl = item.querySelector('.product-item-name a, .product-item-link, a[href*=".html"]');
      const name = nameEl?.textContent?.trim();
      const href = nameEl?.getAttribute('href');

      results.push({ name, href });
    });

    return results;
  });

  console.log('📋 Produits trouvés:', products.length);
  products.forEach((p, i) => {
    console.log(`${i+1}. ${p.name}`);
    console.log(`   URL: ${p.href}`);
  });

  // If we found products, visit the first one
  if (products.length > 0 && products[0].href) {
    console.log('\n🔗 Visite de la première page produit...\n');
    await page.goto(products[0].href, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const productDetails = await page.evaluate(() => {
      const details: any = {};

      // Get product name
      details.name = document.querySelector('h1')?.textContent?.trim();

      // Get all text content
      const pageText = document.body.innerText || '';
      details.pageTextSample = pageText.substring(0, 3000);

      // Look for variants/options
      const selects = document.querySelectorAll('select');
      details.selects = [];
      selects.forEach((select, idx) => {
        const options = Array.from(select.querySelectorAll('option')).map(o => ({
          value: o.value,
          text: o.textContent?.trim(),
        }));
        const label = select.closest('div')?.querySelector('label')?.textContent?.trim();
        details.selects.push({ index: idx, label, options });
      });

      // Look for product variations table
      const tables = document.querySelectorAll('table');
      details.tables = [];
      tables.forEach((table, idx) => {
        const rows: string[][] = [];
        table.querySelectorAll('tr').forEach(row => {
          const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
          if (cells.length > 0) rows.push(cells);
        });
        details.tables.push({ index: idx, rows: rows.slice(0, 10) });
      });

      // Look for dimension patterns
      const dimPatterns = pageText.match(/\b(\d{2,3})\s*[x×]\s*([\d.,]+)\s*(mm)?/gi);
      details.dimensionPatterns = [...new Set(dimPatterns || [])];

      // Look for product attributes
      const attrs = document.querySelectorAll('.product-attribute, [data-role="content"]');
      details.attributes = [];
      attrs.forEach(attr => {
        details.attributes.push(attr.textContent?.replace(/\s+/g, ' ').trim().substring(0, 200));
      });

      return details;
    });

    console.log('📦 Détails du produit:\n');
    console.log('Nom:', productDetails.name);
    console.log('Dimensions trouvées:', productDetails.dimensionPatterns?.join(', '));

    console.log('\n📊 Selects trouvés:', productDetails.selects?.length);
    productDetails.selects?.forEach((s: any) => {
      console.log(`\n  Select ${s.index} (${s.label || 'no label'}):`);
      s.options.slice(0, 10).forEach((o: any) => {
        console.log(`    - ${o.text} (value: ${o.value})`);
      });
    });

    console.log('\n📋 Tables trouvées:', productDetails.tables?.length);
    productDetails.tables?.forEach((t: any) => {
      console.log(`\n  Table ${t.index}:`);
      t.rows.forEach((row: string[]) => {
        console.log(`    ${row.join(' | ')}`);
      });
    });

    console.log('\n📄 Page text sample (first 1000 chars):');
    console.log(productDetails.pageTextSample?.substring(0, 1000));
  }

  await page.close();
  await browser.disconnect();
}

main().catch(console.error);
