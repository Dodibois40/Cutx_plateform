/**
 * Debug BCB Image Selector
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const url = process.argv[2] || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis/egger-blanc-premium-st9.html';

  console.log('🔍 Debug Image Selector');
  console.log(`📍 URL: ${url}\n`);

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Chrome connecté\n');
  } catch (e) {
    console.error('❌ Chrome non connecté');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const data = await page.evaluate(() => {
    const results: Record<string, any> = {};

    // Try different selectors
    const selectors = [
      '.product-media img',
      '.product-image img',
      '.gallery-main img',
      '.fotorama__img',
      '.fotorama__stage__frame img',
      '[data-gallery-role="gallery-placeholder"] img',
      '.product.media img',
      '.gallery-placeholder img',
      'img[src*="product"]',
      'img[src*="catalog"]',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLImageElement;
      if (el) {
        results[sel] = {
          src: el.src,
          dataSrc: el.getAttribute('data-src'),
          dataMobile: el.getAttribute('data-mobile'),
        };
      }
    }

    // Get all images on the page
    const allImages = document.querySelectorAll('img');
    results['_allImages'] = Array.from(allImages).slice(0, 20).map(img => ({
      src: img.src?.substring(0, 100),
      className: img.className,
    }));

    // Check for fotorama gallery
    const fotorama = document.querySelector('.fotorama');
    if (fotorama) {
      results['_fotorama'] = 'Found fotorama gallery';
      const fotoramaData = fotorama.getAttribute('data-gallery');
      if (fotoramaData) {
        try {
          results['_fotoramaData'] = JSON.parse(fotoramaData);
        } catch (e) {
          results['_fotoramaData'] = fotoramaData;
        }
      }
    }

    return results;
  });

  console.log('📊 Résultats des sélecteurs:\n');
  console.log(JSON.stringify(data, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
