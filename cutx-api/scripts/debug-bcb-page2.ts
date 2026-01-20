/**
 * Debug BCB page structure v2
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.goto('https://www.bcommebois.fr/chant-bois-chene.html', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await new Promise(r => setTimeout(r, 5000));

  const debug = await page.evaluate(() => {
    const result: string[] = [];

    // Image produit
    result.push('=== IMAGE PRODUIT ===');
    document.querySelectorAll('img').forEach((img) => {
      if (img.src && img.src.includes('media/catalog/product')) {
        result.push('Catalog img: ' + img.src);
      }
    });

    // Recherche des lignes avec codes et prix
    result.push('\n=== LIGNES AVEC CODES ET PRIX ===');
    const bodyText = document.body.innerText;
    const lines = bodyText.split('\n').filter(l => l.trim());

    let count = 0;
    lines.forEach((line) => {
      if (/\b\d{5}\b/.test(line) && line.includes('€') && count < 5) {
        result.push(line.substring(0, 150));
        count++;
      }
    });

    // Structure tableau
    result.push('\n=== STRUCTURE TABLEAU ===');
    const tables = document.querySelectorAll('table');
    result.push('Nb tables: ' + tables.length);

    if (tables.length > 0) {
      const table = tables[0];
      const rows = table.querySelectorAll('tr');
      result.push('Rows: ' + rows.length);

      // Première ligne avec prix
      for (let i = 0; i < rows.length && i < 3; i++) {
        const row = rows[i];
        const text = row.textContent || '';
        if (text.includes('€') || text.includes('STOCK') || text.includes('Variable')) {
          const cells = row.querySelectorAll('td, th');
          result.push('\nRow ' + i + ' (' + cells.length + ' cells):');
          cells.forEach((c, ci) => {
            const cellText = c.textContent?.trim().substring(0, 25) || '';
            result.push('  [' + ci + ']: ' + cellText);
          });
        }
      }
    }

    return result.join('\n');
  });

  console.log(debug);

  await page.close();
}

main().catch(console.error);
