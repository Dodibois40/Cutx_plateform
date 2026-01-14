import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  // Go to category page first
  console.log('📄 Loading category page...');
  await page.goto('https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to load all
  console.log('📜 Scrolling...');
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 200));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 1000));

  // Search for product wrapper containing "contrebalancement" or specific links
  console.log('\n🔍 Searching for product with 79155...');

  const productInfo = await page.evaluate(() => {
    const results: any[] = [];

    // Find all product wrappers
    const wrappers = document.querySelectorAll('[id^="product-wrapper-"]');

    wrappers.forEach(wrapper => {
      const text = wrapper.textContent?.toLowerCase() || '';

      // Look for contrebalancement products
      if (text.includes('contrebalancement') || text.includes('79155') || text.includes('76818')) {
        const nameEl = wrapper.querySelector('.product-info p:not(.text-primary)');
        const refEl = wrapper.querySelector('p.text-primary');
        const link = wrapper.querySelector('a[href*=".html"]') as HTMLAnchorElement;

        // Get all links in this wrapper
        const links = Array.from(wrapper.querySelectorAll('a[href*=".html"]'))
          .map(a => (a as HTMLAnchorElement).href)
          .filter(h => !h.includes('#'));

        // Get table codes
        const codes: string[] = [];
        wrapper.querySelectorAll('td').forEach(td => {
          const t = td.textContent?.trim() || '';
          if (/^\d{5,6}$/.test(t)) codes.push(t);
        });

        results.push({
          wrapperId: wrapper.id,
          name: nameEl?.textContent?.trim(),
          ref: refEl?.textContent?.trim(),
          mainLink: link?.href,
          allLinks: [...new Set(links)],
          codes: codes,
        });
      }
    });

    return results;
  });

  console.log(`\nFound ${productInfo.length} matching products:`);
  productInfo.forEach((p, i) => {
    console.log(`\n[${i + 1}] ${p.wrapperId}`);
    console.log(`    Name: ${p.name}`);
    console.log(`    Ref: ${p.ref}`);
    console.log(`    Codes: ${p.codes.join(', ')}`);
    console.log(`    Links: ${p.allLinks.length}`);
    p.allLinks.forEach((l: string) => console.log(`      - ${l.split('/').pop()}`));
  });

  await browser.disconnect();
}
main().catch(console.error);
