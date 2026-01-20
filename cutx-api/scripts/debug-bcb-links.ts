import puppeteer from 'puppeteer-core';

async function main() {
  console.log('Connexion à Chrome...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0];

  console.log('Navigation vers MDF standards...');
  await page.goto('https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf/standards.html', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Scroll pour charger
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 300));
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  console.log('\nAnalyse des liens...');

  const analysis = await page.evaluate(() => {
    const results: any = {
      allLinks: [],
      productWrappers: [],
      withNumericCode: []
    };

    // Tous les liens
    document.querySelectorAll('a[href*="bcommebois"]').forEach(el => {
      const href = (el as HTMLAnchorElement).href;
      if (href.endsWith('.html') && !href.includes('#')) {
        results.allLinks.push(href);
      }
    });

    // Liens dans product-wrapper
    document.querySelectorAll('[class*="product"]').forEach(wrapper => {
      const link = wrapper.querySelector('a[href*=".html"]') as HTMLAnchorElement;
      if (link?.href) {
        results.productWrappers.push({
          href: link.href,
          text: link.textContent?.trim().substring(0, 50)
        });
      }
    });

    // Liens avec code numérique
    document.querySelectorAll('a[href]').forEach(el => {
      const href = (el as HTMLAnchorElement).href;
      if (href.match(/-\d{5,6}\.html$/)) {
        results.withNumericCode.push(href);
      }
    });

    return results;
  });

  console.log('\n=== Liens dans product wrappers ===');
  analysis.productWrappers.slice(0, 15).forEach((l: any) => {
    console.log(`  ${l.href}`);
    console.log(`    "${l.text}"`);
  });

  console.log('\n=== Liens avec code numérique (-XXXXX.html) ===');
  [...new Set(analysis.withNumericCode)].slice(0, 15).forEach((l: string) => {
    console.log(`  ${l}`);
  });

  console.log(`\nTotal liens uniques: ${new Set(analysis.allLinks).size}`);
  console.log(`Liens product wrappers: ${analysis.productWrappers.length}`);
  console.log(`Liens avec code: ${new Set(analysis.withNumericCode).size}`);
}

main().catch(console.error);
