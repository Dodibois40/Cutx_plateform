/**
 * Test Dispano pagination
 */
import puppeteer from 'puppeteer-core';

const URL = 'https://www.dispano.fr/c/stratifies-hpl/x2visu_dig_onv2_2027920R5';

async function main() {
  console.log('🔍 Test Dispano Pagination');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
  const pages = await browser.pages();
  const page = pages[0];

  console.log(`📍 Chargement: ${URL}`);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Check pagination info
  const paginationInfo = await page.evaluate(() => {
    const pageText = document.body.innerText;

    // Look for pagination indicators
    const pageMatch = pageText.match(/Page\s*(\d+)\s*(?:sur|\/|of)\s*(\d+)/i);
    const productCountMatch = pageText.match(/(\d+)\s*(?:produits?|articles?|résultats?)/i);

    // Look for pagination buttons/links
    const paginationLinks: string[] = [];
    document.querySelectorAll('a, button').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (/^\d+$/.test(text) || text.includes('Suivant') || text.includes('Next') || text === '>') {
        paginationLinks.push(text);
      }
    });

    // Look for "55 pages" in text
    const pagesMatch = pageText.match(/(\d+)\s*pages?/i);

    return {
      pageMatch: pageMatch ? `Page ${pageMatch[1]} sur ${pageMatch[2]}` : null,
      productCount: productCountMatch ? productCountMatch[1] : null,
      paginationLinks: [...new Set(paginationLinks)].slice(0, 20),
      pagesMatch: pagesMatch ? pagesMatch[0] : null,
    };
  });

  console.log('\n📊 Pagination Analysis:');
  console.log(`   Page info: ${paginationInfo.pageMatch || 'Not found'}`);
  console.log(`   Product count: ${paginationInfo.productCount || 'Not found'}`);
  console.log(`   Pages mention: ${paginationInfo.pagesMatch || 'Not found'}`);
  console.log(`   Pagination links: ${paginationInfo.paginationLinks.join(', ') || 'None'}`);

  // Try scrolling to load more products
  console.log('\n📜 Scrolling to load all products...');
  let previousLinks = 0;
  for (let i = 0; i < 100; i++) {
    await page.evaluate(() => window.scrollBy(0, 2000));
    await new Promise(r => setTimeout(r, 800));

    const currentLinks = await page.evaluate(() => {
      const links: string[] = [];
      document.querySelectorAll('a').forEach(el => {
        if (el.href && el.href.includes('/p/') && el.href.match(/-A\d{6,8}$/)) {
          if (!links.includes(el.href)) links.push(el.href);
        }
      });
      return links.length;
    });

    if (currentLinks > previousLinks) {
      console.log(`   Scroll ${i + 1}: ${currentLinks} links`);
      previousLinks = currentLinks;
    }

    // Check if at bottom
    const atBottom = await page.evaluate(() =>
      (window.innerHeight + window.scrollY) >= document.body.scrollHeight - 100
    );
    if (atBottom && i > 10) break;
  }

  console.log(`\n✅ Total product links after scroll: ${previousLinks}`);

  await browser.disconnect();
}

main().catch(console.error);
