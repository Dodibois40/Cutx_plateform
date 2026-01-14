import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  console.log('URL:', page.url());

  // Get all links
  const links = await page.evaluate(() => {
    const results: string[] = [];
    const allLinks = document.querySelectorAll('a[href*=".html"]');

    allLinks.forEach(a => {
      const href = (a as HTMLAnchorElement).href;
      if (href.includes('bcommebois.fr') && !href.includes('#')) {
        results.push(href);
      }
    });

    return [...new Set(results)];
  });

  console.log(`\nTotal unique links: ${links.length}`);

  // Search for 79155 link
  const link79155 = links.find(l => l.includes('79155'));
  console.log('\nLink containing 79155:', link79155 || 'NOT FOUND');

  // Show some sample links
  console.log('\nSample links (first 10):');
  links.slice(0, 10).forEach((l, i) => {
    const shortUrl = l.split('/').pop();
    console.log(`  [${i + 1}] ${shortUrl}`);
  });

  // Show links containing numbers
  console.log('\nLinks with reference numbers in URL:');
  const withRefs = links.filter(l => {
    const filename = l.split('/').pop() || '';
    return /\d{5}/.test(filename);
  });
  console.log(`  Found: ${withRefs.length}`);
  withRefs.slice(0, 10).forEach((l, i) => {
    console.log(`  [${i + 1}] ${l.split('/').pop()}`);
  });

  await browser.disconnect();
}
main().catch(console.error);
