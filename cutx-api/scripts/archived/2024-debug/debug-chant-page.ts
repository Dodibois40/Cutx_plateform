/**
 * Debug: analyser la structure d'une page produit Bouney avec chant
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const url = process.argv[2] || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/bois/egger-chene-halifax-naturel-st37.html';

  console.log('🔍 Debug page produit Bouney');
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
  await new Promise(r => setTimeout(r, 2000));

  const data = await page.evaluate(() => {
    const results: any = {};

    // Get product name from multiple possible selectors
    const h1 = document.querySelector('h1.page-title span, h1.page-title, h1');
    results.productName = h1?.textContent?.trim();

    // Get full page text
    const pageText = document.body.innerText || '';
    results.pageTextSnippet = pageText.substring(0, 2000);

    // Get all tables and their contents
    results.tables = [];
    const tables = document.querySelectorAll('table');
    tables.forEach((table, idx) => {
      const tableData: any = { index: idx, rows: [] };
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
        if (cells.length > 0) {
          tableData.rows.push(cells);
        }
      });
      results.tables.push(tableData);
    });

    // Find all data-product divs (contain product info)
    results.productDivs = [];
    const productDivs = document.querySelectorAll('[data-product-sku], .product-item-info, .product.info');
    productDivs.forEach(div => {
      results.productDivs.push({
        sku: div.getAttribute('data-product-sku'),
        text: div.textContent?.replace(/\s+/g, ' ').trim().substring(0, 300),
      });
    });

    // Find all select options (chant sizes often in selects)
    results.selectOptions = [];
    const selects = document.querySelectorAll('select');
    selects.forEach((select, idx) => {
      const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent?.trim());
      results.selectOptions.push({ selectIndex: idx, options });
    });

    // Look for product grid items (multiple chant variants)
    results.gridItems = [];
    const gridItems = document.querySelectorAll('.product-items .product-item, .products-grid .item');
    gridItems.forEach(item => {
      const name = item.querySelector('.product-item-name, .product-name')?.textContent?.trim();
      const sku = item.getAttribute('data-product-sku') || item.querySelector('[data-product-sku]')?.getAttribute('data-product-sku');
      results.gridItems.push({ name, sku });
    });

    // Find dimensions patterns in text (23x0.8, 43x1, etc.)
    const dimMatches = pageText.match(/\b(\d{2,3})\s*[x×]\s*([\d.,]+)\s*(mm)?/gi);
    results.dimensionPatterns = [...new Set(dimMatches || [])];

    // Find ABS mentions
    const absMatches = pageText.match(/ABS[^.]{0,50}/gi);
    results.absInfo = [...new Set(absMatches || [])];

    // Find all references (5-6 digit codes)
    const refMatches = pageText.match(/\b(\d{5,6})\b/g);
    results.references = [...new Set(refMatches || [])];

    // Get attributes section
    const attrSection = document.querySelector('.product-attributes, .additional-attributes, .data.table');
    if (attrSection) {
      results.attributesHtml = attrSection.innerHTML.substring(0, 1000);
    }

    return results;
  });

  console.log('📋 Données extraites:\n');
  console.log('Nom produit:', data.productName);
  console.log('Références:', data.references?.join(', ') || 'aucune');
  console.log('Dimension patterns:', data.dimensionPatterns?.join(', ') || 'aucun');
  console.log('ABS info:', data.absInfo?.join(', ') || 'aucun');

  console.log('\n📊 Tables trouvées:', data.tables?.length || 0);
  data.tables?.forEach((table: any) => {
    console.log(`\n  Table ${table.index}:`);
    table.rows.slice(0, 10).forEach((row: string[], i: number) => {
      console.log(`    Row ${i}: ${row.join(' | ')}`);
    });
    if (table.rows.length > 10) {
      console.log(`    ... (${table.rows.length - 10} more rows)`);
    }
  });

  console.log('\n📝 Select options:', data.selectOptions?.length || 0);
  data.selectOptions?.forEach((s: any) => {
    console.log(`  Select ${s.selectIndex}: ${s.options.join(', ')}`);
  });

  console.log('\n📦 Product divs:', data.productDivs?.length || 0);
  data.productDivs?.slice(0, 5).forEach((p: any) => {
    console.log(`  SKU: ${p.sku}`);
    console.log(`  Text: ${p.text?.substring(0, 150)}...`);
  });

  console.log('\n🔲 Grid items:', data.gridItems?.length || 0);
  data.gridItems?.slice(0, 10).forEach((g: any) => {
    console.log(`  - ${g.name} (SKU: ${g.sku})`);
  });

  console.log('\n📄 Page text snippet:\n', data.pageTextSnippet?.substring(0, 500));

  await page.close();
  await browser.disconnect();
}

main().catch(console.error);
