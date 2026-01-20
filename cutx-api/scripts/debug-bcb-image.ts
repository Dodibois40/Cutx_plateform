/**
 * Debug: voir comment récupérer les images sur BCB
 */

import puppeteer from 'puppeteer';

async function main() {
  console.log('Connexion à Chrome...');
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
  });
  console.log('Connecté!');

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Aller sur une page produit connue (REF 72943 = Mediland LP 19mm)
  const ref = '72943';
  const searchUrl = `https://www.bcommebois.fr/catalogsearch/result/?q=${ref}`;

  console.log(`\nRecherche: ${searchUrl}`);
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Trouver le lien produit
  const productLink = await page.evaluate((ref) => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    for (const link of links) {
      const href = (link as HTMLAnchorElement).href;
      if (href.includes(`-${ref}.html`)) {
        return href;
      }
    }
    return null;
  }, ref);

  console.log(`Lien produit: ${productLink}`);

  if (!productLink) {
    console.log('Produit non trouvé!');
    await page.close();
    return;
  }

  // Aller sur la page produit
  console.log(`\nNavigation vers: ${productLink}`);
  await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000)); // Attendre le lazy loading

  // Scroll pour déclencher le lazy loading
  await page.evaluate(() => window.scrollTo(0, 500));
  await new Promise(r => setTimeout(r, 1000));

  // Analyser toutes les images
  const images = await page.evaluate(() => {
    const result: { src: string; selector: string }[] = [];

    // Tous les img
    document.querySelectorAll('img').forEach((img, i) => {
      if (img.src && img.src.startsWith('http')) {
        result.push({
          src: img.src,
          selector: `img[${i}]: ${img.className || 'no-class'}`
        });
      }
    });

    // Images dans data-src (lazy loading)
    document.querySelectorAll('[data-src]').forEach((el) => {
      const dataSrc = el.getAttribute('data-src');
      if (dataSrc) {
        result.push({
          src: dataSrc,
          selector: `data-src: ${el.className || 'no-class'}`
        });
      }
    });

    // Background images CSS
    document.querySelectorAll('[style*="background"]').forEach((el) => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match) {
        result.push({
          src: match[1],
          selector: `bg-style: ${el.className || 'no-class'}`
        });
      }
    });

    return result;
  });

  console.log(`\n=== ${images.length} IMAGES TROUVÉES ===\n`);

  // Filtrer les images pertinentes (produits, pas logos/icônes)
  const productImages = images.filter(img =>
    img.src.includes('mediland') ||
    img.src.includes('product') ||
    img.src.includes('catalog') ||
    img.src.includes('/mdf') ||
    (img.src.includes('bcommebois') && !img.src.includes('logo') && !img.src.includes('icon'))
  );

  console.log('Images produit potentielles:');
  for (const img of productImages) {
    console.log(`  ${img.selector}`);
    console.log(`    ${img.src}\n`);
  }

  if (productImages.length === 0) {
    console.log('Toutes les images:');
    for (const img of images.slice(0, 20)) {
      console.log(`  ${img.selector}: ${img.src.substring(0, 80)}...`);
    }
  }

  // Essayer les sélecteurs spécifiques
  console.log('\n=== TEST SÉLECTEURS ===\n');
  const selectors = [
    '.fotorama__stage img',
    '.product-image-photo',
    '.gallery-placeholder img',
    'img[itemprop="image"]',
    '.product.media img',
    '.fotorama__img',
    '.fotorama img',
    '[data-gallery-role="gallery-placeholder"] img'
  ];

  for (const sel of selectors) {
    const found = await page.evaluate((selector) => {
      const el = document.querySelector(selector) as HTMLImageElement;
      return el ? el.src || el.getAttribute('data-src') : null;
    }, sel);
    console.log(`${sel.padEnd(45)} → ${found || 'NOT FOUND'}`);
  }

  await page.close();
}

main().catch(console.error);
