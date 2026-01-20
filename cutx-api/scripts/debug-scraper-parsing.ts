/**
 * Debug - tester le parsing exactement comme le fait le scraper
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto('https://www.bcommebois.fr/chant-bois-chene.html', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  await new Promise((r) => setTimeout(r, 3000));

  const variants = await page.evaluate(() => {
    const results: any[] = [];
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');

      // Debug: log row info
      if (cells.length >= 7) {
        const codeText = cells[4]?.textContent?.trim() || '';
        const priceText = cells[6]?.textContent?.trim() || '';

        // Parse price
        const priceMatch = priceText.match(/([\d,]+)\s*€/);
        let price: number | null = null;
        let priceType: string | null = null;

        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(',', '.'));
          if (priceText.toLowerCase().includes('/ml')) {
            priceType = 'ML';
          } else if (priceText.toLowerCase().includes('/lk') || priceText.toLowerCase().includes('/un')) {
            priceType = 'UN';
          }
        }

        results.push({
          rowIndex,
          cells: cells.length,
          codeText,
          codeValid: /^\d{4,6}$/.test(codeText),
          priceText,
          priceParsed: price,
          priceType,
        });
      }
    });

    return results;
  });

  console.log('=== PARSING RESULTS ===\n');
  variants.forEach((v) => {
    console.log(`Row ${v.rowIndex}:`);
    console.log(`  code: "${v.codeText}" (valid: ${v.codeValid})`);
    console.log(`  price: "${v.priceText}" → ${v.priceParsed} €/${v.priceType}`);
    console.log('');
  });

  console.log(`Total variantes valides: ${variants.filter((v) => v.codeValid).length}`);

  await page.close();
}

main().catch(console.error);
