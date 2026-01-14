/**
 * Debug Dispano page structure
 */
import puppeteer from 'puppeteer-core';

const URL = 'https://www.dispano.fr/c/stratifies-hpl/x2visu_dig_onv2_2027920R5';

async function main() {
  console.log('🔍 Debug Dispano Page Structure');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
  const pages = await browser.pages();
  const page = pages[0];

  console.log(`📍 Navigating to: ${URL}`);

  try {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log('⚠️ Timeout, continuing...');
  }
  await new Promise(r => setTimeout(r, 5000));

  // Take screenshot for debugging
  await page.screenshot({ path: 'c:/CutX_plateform/cutx-api/dispano-debug.png', fullPage: false });
  console.log('📸 Screenshot saved');

  // Check current URL (maybe redirect?)
  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);

  // Check page title
  const title = await page.title();
  console.log(`📄 Title: ${title}`);

  // Check if we need to login
  const pageContent = await page.evaluate(() => {
    const body = document.body.innerText.substring(0, 1000);
    const hasLogin = body.includes('Connexion') || body.includes('Se connecter');
    const hasProducts = body.includes('€') || body.includes('Ajouter');

    // Check all links
    const allLinks: string[] = [];
    document.querySelectorAll('a').forEach(a => {
      if (a.href) allLinks.push(a.href);
    });

    // Product links specifically
    const productLinks = allLinks.filter(href =>
      href.includes('/p/') && href.match(/-A\d{6,8}$/)
    );

    // Alternative patterns
    const altPatterns = allLinks.filter(href =>
      href.includes('stratifi') || href.includes('hpl') || href.includes('/p/')
    );

    return {
      bodyPreview: body.substring(0, 500),
      hasLogin,
      hasProducts,
      totalLinks: allLinks.length,
      productLinks: productLinks.slice(0, 10),
      altPatterns: altPatterns.slice(0, 10),
    };
  });

  console.log(`\n📊 Page Analysis:`);
  console.log(`   Login required: ${pageContent.hasLogin}`);
  console.log(`   Has products: ${pageContent.hasProducts}`);
  console.log(`   Total links: ${pageContent.totalLinks}`);
  console.log(`   Product links (pattern -AXXXXXX): ${pageContent.productLinks.length}`);

  if (pageContent.productLinks.length > 0) {
    console.log('\n   Sample product links:');
    pageContent.productLinks.forEach((l, i) => console.log(`      [${i + 1}] ${l.split('/').pop()}`));
  }

  if (pageContent.altPatterns.length > 0) {
    console.log('\n   Alternative patterns found:');
    pageContent.altPatterns.forEach((l, i) => console.log(`      [${i + 1}] ${l}`));
  }

  console.log('\n📄 Body preview:');
  console.log(pageContent.bodyPreview);

  await browser.disconnect();
}

main().catch(console.error);
