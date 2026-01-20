/**
 * Debug - voir exactement ce que le scraper récupère sur la page chêne
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

  const debug = await page.evaluate(() => {
    const results: string[] = [];
    const rows = document.querySelectorAll('table tbody tr');

    results.push(`Total rows: ${rows.length}`);

    rows.forEach((row, i) => {
      if (i >= 3) return; // Seulement les 3 premières lignes

      const cells = row.querySelectorAll('td');
      results.push(`\n--- Row ${i} (${cells.length} cells) ---`);

      cells.forEach((cell, ci) => {
        const text = cell.textContent?.trim() || '';
        results.push(`  [${ci}]: "${text.substring(0, 40)}"`);
      });
    });

    return results.join('\n');
  });

  console.log(debug);

  await page.close();
}

main().catch(console.error);
