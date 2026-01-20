/**
 * Debug - voir ce que Puppeteer voit sur une page BCB
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

    // Toutes les images
    result.push('=== IMAGES ===');
    document.querySelectorAll('img').forEach((img, i) => {
      if (i < 10) {
        result.push('img[' + i + ']: src=' + img.src?.substring(0, 80) + ' class=' + img.className);
      }
    });

    // Fotorama
    result.push('\n=== FOTORAMA ===');
    const fotorama = document.querySelector('.fotorama');
    if (fotorama) {
      result.push('Fotorama trouvé: ' + fotorama.innerHTML.substring(0, 200));
    } else {
      result.push('Fotorama: NON TROUVÉ');
    }

    // Tableau
    result.push('\n=== TABLEAU ===');
    const table = document.querySelector('table');
    if (table) {
      const headers = table.querySelectorAll('thead th');
      result.push('Headers: ' + Array.from(headers).map(h => h.textContent?.trim()).join(' | '));

      const rows = table.querySelectorAll('tbody tr');
      result.push('Nombre de lignes: ' + rows.length);

      // Première ligne en détail
      if (rows.length > 0) {
        const cells = rows[0].querySelectorAll('td');
        result.push('Première ligne (' + cells.length + ' cellules):');
        cells.forEach((cell, i) => {
          result.push('  [' + i + ']: ' + cell.textContent?.trim().substring(0, 50));
        });
      }
    }

    return result.join('\n');
  });

  console.log(debug);

  await page.close();
}

main().catch(console.error);
