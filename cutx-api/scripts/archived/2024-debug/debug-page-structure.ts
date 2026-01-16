/**
 * Debug: Analyze page structure to understand HTML
 */
import puppeteer from 'puppeteer-core';

async function main() {
  const url = process.argv[2] || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html';

  console.log('🔍 Analyzing page structure:', url);

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll to load all
  await page.evaluate(async () => {
    for (let i = 0; i < 10; i++) {
      window.scrollBy(0, 1000);
      await new Promise(r => setTimeout(r, 200));
    }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 2000));

  const analysis = await page.evaluate(() => {
    const results: Record<string, any> = {};

    // Check for product wrappers
    results.productWrappers = document.querySelectorAll('[id^="product-wrapper-"]').length;
    results.productWrapper = document.querySelectorAll('[class*="product-wrapper"]').length;

    // Check for tables
    results.tables = document.querySelectorAll('table').length;
    results.resultsTable = document.querySelectorAll('table.results-table').length;

    // Check for product items
    results.productItems = document.querySelectorAll('.product-item').length;
    results.productCard = document.querySelectorAll('.product-card').length;

    // Check for any element with "product" in class
    const allWithProduct = document.querySelectorAll('[class*="product"]');
    results.anyProductClass = allWithProduct.length;
    if (allWithProduct.length > 0) {
      results.productClassSamples = Array.from(allWithProduct).slice(0, 5).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id || null,
      }));
    }

    // Check for tables with tr
    const allTables = document.querySelectorAll('table');
    results.tableDetails = Array.from(allTables).slice(0, 3).map(table => ({
      className: table.className,
      rows: table.querySelectorAll('tr').length,
      firstRowCells: table.querySelector('tr')?.querySelectorAll('td, th').length || 0,
    }));

    // Check for any reference-like content (5-digit numbers)
    const bodyText = document.body.innerText;
    const refMatches = bodyText.match(/\b\d{5}\b/g);
    results.possibleRefs = refMatches ? refMatches.slice(0, 10) : [];

    // Check for price-like content
    const priceMatches = bodyText.match(/\d+[.,]\d{2}\s*€/g);
    results.possiblePrices = priceMatches ? priceMatches.slice(0, 5) : [];

    // Get page title
    results.pageTitle = document.title;

    // Check main content area
    const mainContent = document.querySelector('main, #main, .main-content, [role="main"]');
    results.mainContentExists = !!mainContent;
    if (mainContent) {
      results.mainContentChildren = mainContent.children.length;
    }

    // Look for any data attributes
    const elementsWithData = document.querySelectorAll('[data-product-id], [data-sku], [data-code]');
    results.dataAttributes = elementsWithData.length;

    return results;
  });

  console.log('\n📊 Page Analysis:');
  console.log(JSON.stringify(analysis, null, 2));

  // Get a sample of the HTML structure
  const htmlSample = await page.evaluate(() => {
    const firstProduct = document.querySelector('[id^="product-wrapper-"], [class*="product-wrapper"], .product-item, .product-card');
    if (firstProduct) {
      return firstProduct.outerHTML.substring(0, 2000);
    }

    // If no product found, get some of the main content
    const main = document.querySelector('main, .main-content, #content');
    if (main) {
      return main.innerHTML.substring(0, 3000);
    }

    return document.body.innerHTML.substring(0, 2000);
  });

  console.log('\n📝 HTML Sample:');
  console.log(htmlSample.substring(0, 1500) + '...');

  await browser.disconnect();
}

main().catch(console.error);
