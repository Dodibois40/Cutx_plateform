import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  await page.goto('https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Scroll
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 200));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 1000));

  const links = await page.evaluate(() => {
    const results: string[] = [];
    const wrappers = document.querySelectorAll('[id^="product-wrapper-"]');

    wrappers.forEach(wrapper => {
      const allLinks = wrapper.querySelectorAll('a[href*=".html"]');
      allLinks.forEach(a => {
        const href = (a as HTMLAnchorElement).href;
        if (href && !href.includes('#') && href.includes('bcommebois.fr')) {
          if (!href.includes('/agencement/') && !href.includes('unis.html')) {
            results.push(href);
          }
        }
      });
    });

    return [...new Set(results)];
  });

  console.log(`Total unique links: ${links.length}`);

  // Check for contrebalancement links
  const contrebal = links.filter(l => l.includes('contrebalancement') || /\d{5,6}\.html$/.test(l));
  console.log(`\nLinks with "contrebalancement" or 5-6 digit ref in URL: ${contrebal.length}`);
  contrebal.forEach(l => console.log(`  ${l.split('/').pop()}`));

  // Check specifically for 79155
  const has79155 = links.find(l => l.includes('79155'));
  console.log(`\n79155 link: ${has79155 ? 'FOUND' : 'NOT FOUND'}`);
  if (has79155) console.log(`  ${has79155}`);

  await browser.disconnect();
}
main().catch(console.error);
