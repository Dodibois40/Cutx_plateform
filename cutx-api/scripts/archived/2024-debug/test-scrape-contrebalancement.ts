/**
 * Test scraping on specific contrebalancement products
 */
import puppeteer from 'puppeteer-core';

// URLs with reference codes in them
const testUrls = [
  'https://www.bcommebois.fr/stratifie-contrebalancement-12-10-blanc-mi-mat-3050-76818.html',
  'https://www.bcommebois.fr/stratifie-contrebalancement-8-10-blanc-mat-3050-79155.html',
  'https://www.bcommebois.fr/stratifie-contrebalancement-8-10-blanc-4200-80250.html',
  'https://www.bcommebois.fr/strat-contrebalancement-noir-8-10-noir-42c-3050x1300-105399.html',
];

function extractRefFromUrl(url: string): string | null {
  const match = url.match(/-(\d{5,6})\.html$/);
  return match ? match[1] : null;
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];

  console.log('🧪 Testing contrebalancement product extraction\n');

  for (const url of testUrls) {
    const urlRef = extractRefFromUrl(url);
    console.log(`\n📄 ${url.split('/').pop()}`);
    console.log(`   URL Ref: ${urlRef}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    const data = await page.evaluate(() => {
      const pageText = document.body.innerText || '';
      const h1 = document.querySelector('h1');

      // Extract characteristics
      const lengthMatch = pageText.match(/Longueur\s*\(m\)\s*[\n\r]+\s*([\d.,]+)/i);
      const widthMatch = pageText.match(/Largeur\s*\(m\)\s*[\n\r]+\s*([\d.,]+)/i);
      const thicknessMatch = pageText.match(/Hauteur\s*\(mm\)\s*[\n\r]+\s*([\d.,]+)/i);
      const supportMatch = pageText.match(/Qualité\/Support\s*[\n\r]+\s*([^\n\r]+)/i);
      const colorMatch = pageText.match(/Coloris\/Choix\s*[\n\r]+\s*([^\n\r]+)/i);
      const finishMatch = pageText.match(/Finition\s*[\n\r]+\s*([^\n\r]+)/i);
      const priceMatch = pageText.match(/([\d.,]+)\s*€\s*\(unité de vente:\s*M2\)/i);

      return {
        name: h1?.textContent?.trim(),
        length: lengthMatch ? Math.round(parseFloat(lengthMatch[1].replace(',', '.')) * 1000) : 0,
        width: widthMatch ? Math.round(parseFloat(widthMatch[1].replace(',', '.')) * 1000) : 0,
        thickness: thicknessMatch ? parseFloat(thicknessMatch[1].replace(',', '.')) : 0,
        support: supportMatch ? supportMatch[1].trim() : '',
        color: colorMatch ? colorMatch[1].trim() : '',
        finish: finishMatch ? finishMatch[1].trim() : '',
        price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null,
        inStock: pageText.includes('EN STOCK'),
      };
    });

    console.log(`   Name: ${data.name}`);
    console.log(`   Dimensions: ${data.length}x${data.width}x${data.thickness}mm`);
    console.log(`   Support: ${data.support}`);
    console.log(`   Color: ${data.color}`);
    console.log(`   Finish: ${data.finish}`);
    console.log(`   Price: ${data.price}€/m²`);
    console.log(`   Stock: ${data.inStock ? 'EN STOCK' : 'Sur commande'}`);
  }

  await browser.disconnect();
  console.log('\n✅ Done!');
}

main().catch(console.error);
