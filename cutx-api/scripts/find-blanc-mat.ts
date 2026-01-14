import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  console.log('URL:', page.url());

  // Search for "blanc" in text
  const results = await page.evaluate(() => {
    const output: string[] = [];
    const body = document.body.innerText.toLowerCase();

    // Search terms
    ['blanc mat', 'blanc 3050', '79155', '5.19', '5,19'].forEach(term => {
      if (body.includes(term)) {
        output.push(`FOUND: "${term}"`);
      } else {
        output.push(`NOT FOUND: "${term}"`);
      }
    });

    // Find all "blanc" products
    const wrappers = document.querySelectorAll('[id^="product-wrapper-"]');
    let blancCount = 0;

    wrappers.forEach(wrapper => {
      const text = wrapper.textContent?.toLowerCase() || '';
      if (text.includes('blanc') && !text.includes('bianco')) {
        blancCount++;
        if (blancCount <= 5) {
          const refEl = wrapper.querySelector('p.text-primary');
          const nameEl = wrapper.querySelector('.product-info p:not(.text-primary)');

          // Get codes from table
          const codes: string[] = [];
          wrapper.querySelectorAll('td').forEach(td => {
            const t = td.textContent?.trim() || '';
            if (/^\d{5}$/.test(t)) codes.push(t);
          });

          output.push(`\n[${blancCount}] ${wrapper.id}`);
          output.push(`    Ref: ${refEl?.textContent?.trim()}`);
          output.push(`    Name: ${nameEl?.textContent?.trim()}`);
          output.push(`    Codes: ${codes.slice(0, 5).join(', ')}`);
        }
      }
    });

    output.push(`\nTotal "blanc" products: ${blancCount}`);
    return output;
  });

  results.forEach(r => console.log(r));

  await browser.disconnect();
}
main().catch(console.error);
