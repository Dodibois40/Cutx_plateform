import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  console.log('Current URL:', page.url());
  await page.screenshot({ path: 'c:/CutX_plateform/cutx-api/current-page.png', fullPage: false });
  console.log('Screenshot saved');

  await browser.disconnect();
}
main().catch(console.error);
