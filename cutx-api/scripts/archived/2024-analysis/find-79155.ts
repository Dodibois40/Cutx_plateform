import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  console.log('URL:', page.url());

  // Get all TDs and search for 79155
  const found = await page.evaluate(() => {
    const results: string[] = [];

    // Search in all text content
    const allText = document.body.innerText;
    if (allText.includes('79155')) {
      results.push('FOUND 79155 in body text!');
    } else {
      results.push('NOT FOUND 79155 in body text');
    }

    // Get all table cells with 5-digit numbers
    const tds = document.querySelectorAll('td');
    const codes: string[] = [];
    tds.forEach(td => {
      const text = td.textContent?.trim() || '';
      if (/^\d{5}$/.test(text)) {
        codes.push(text);
      }
    });

    results.push(`Total 5-digit codes found: ${codes.length}`);

    // Filter codes starting with 79
    const codes79 = codes.filter(c => c.startsWith('79'));
    results.push(`Codes starting with 79: ${codes79.join(', ')}`);

    // Search for "contrebalancement"
    if (allText.toLowerCase().includes('contrebalancement')) {
      results.push('FOUND "contrebalancement" in body!');
    } else {
      results.push('NOT FOUND "contrebalancement" in body');
    }

    return results;
  });

  found.forEach(r => console.log(r));

  await browser.disconnect();
}
main().catch(console.error);
