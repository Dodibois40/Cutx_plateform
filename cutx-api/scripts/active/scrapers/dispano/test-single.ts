/**
 * Test scraping d'un seul produit Dispano
 * Usage: npx tsx scripts/dispano/test-single.ts <url>
 */

import puppeteer from 'puppeteer';

const TEST_URL = process.argv[2] || 'https://www.dispano.fr/c/panneau-melamine-blanc/x2visu_dig_onv2_2027892R5';

async function main() {
  console.log('🧪 TEST SCRAPING DISPANO');
  console.log('='.repeat(60));
  console.log(`URL: ${TEST_URL}\n`);

  // Connexion Chrome
  console.log('🔌 Connexion à Chrome...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });
  console.log('✅ Connecté!\n');

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // Navigation
  console.log('📄 Chargement de la page...');
  await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll pour charger tout
  await page.evaluate(async () => {
    await new Promise<void>(resolve => {
      let totalHeight = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, 400);
        totalHeight += 400;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  await new Promise(r => setTimeout(r, 2000));

  // Extraction
  console.log('🔍 Extraction des données...\n');

  const data = await page.evaluate(() => {
    const result: Record<string, any> = {};
    const pageText = document.body.innerText;

    // === NOM ===
    const titleEl = document.querySelector('[data-testid="article-header/article-name"], h1');
    result.nom = titleEl?.textContent?.trim() || 'NON TROUVÉ';

    // === MARQUE ===
    const pageTitle = document.title;
    result.pageTitle = pageTitle;
    const titleBrandMatch = pageTitle.match(/^([A-Z][A-Z\s]+)\s*-\s*/);
    if (titleBrandMatch && titleBrandMatch[1].length < 30) {
      result.marque = titleBrandMatch[1].trim();
    }

    const brands = [
      'SWISS KRONO', 'EGGER PANNEAUX', 'EGGER', 'KRONOSPAN', 'FINSA', 'PFLEIDERER',
      'UNILIN PANELS', 'UNILIN', 'POLYREY'
    ];
    for (const brand of brands) {
      if (pageText.toUpperCase().includes(brand)) {
        result.marqueTrouvee = brand;
        break;
      }
    }

    // === RÉFÉRENCES ===
    const refDispanoMatch = pageText.match(/R[ée]f\.?\s*Dispano\s*:?\s*(\d+)/i);
    result.refDispano = refDispanoMatch ? refDispanoMatch[1] : 'NON TROUVÉ';

    const urlMatch = window.location.href.match(/-A(\d+)$/) || window.location.href.match(/(\d{7,8})/);
    result.refFromUrl = urlMatch ? urlMatch[1] : null;

    const eanMatch = pageText.match(/Code\s*EAN\s*:?\s*(\d{13})/i);
    result.codeEAN = eanMatch ? eanMatch[1] : null;

    // === PRIX ===
    const prixPatterns = [
      /([\d,]+)\s*€\s*HT\s*\/\s*[Mm][èe]tre\s*carr[ée]/,
      /([\d,]+)\s*€\s*\/\s*m[²2]/i,
      /Prix\s*HT\s*:?\s*([\d,]+)\s*€/i,
      /([\d,]+)\s*€\s*HT/i,
    ];
    for (const pattern of prixPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        result.prixM2 = parseFloat(match[1].replace(',', '.'));
        result.prixPattern = pattern.source;
        break;
      }
    }

    // === DIMENSIONS ===
    const longueurMatch = pageText.match(/Longueur\s*:?\s*(\d+)\s*mm/i);
    result.longueur = longueurMatch ? parseInt(longueurMatch[1]) : 0;

    const largeurMatch = pageText.match(/Largeur\s*:?\s*(\d+)\s*mm/i);
    result.largeur = largeurMatch ? parseInt(largeurMatch[1]) : 0;

    const epaisseurMatch = pageText.match(/[EÉ]paisseur\s*:?\s*([\d,\.]+)\s*mm/i);
    result.epaisseur = epaisseurMatch ? parseFloat(epaisseurMatch[1].replace(',', '.')) : 0;

    // === IMAGES ===
    result.images = [];

    // Toutes les images de la page (excluant SVG et icônes)
    document.querySelectorAll('img').forEach(img => {
      const src = img.src || img.getAttribute('data-src') || '';
      if (src &&
          !src.includes('logo') &&
          !src.includes('icon') &&
          !src.includes('data:image') &&
          !src.includes('placeholder') &&
          !src.includes('.svg') &&
          !src.includes('svg_custom') &&
          src.length > 30) {
        result.images.push({
          src: src.substring(0, 100) + '...',
          alt: img.alt?.substring(0, 50) || '',
          class: img.className?.substring(0, 50) || '',
          width: img.width || 0,
          height: img.height || 0,
        });
      }
    });

    // Chercher spécifiquement les images cloudinary (hébergeur Dispano)
    result.cloudinaryImages = [];
    document.querySelectorAll('img[src*="cloudinary"], img[data-src*="cloudinary"]').forEach(img => {
      const src = (img as HTMLImageElement).src || img.getAttribute('data-src') || '';
      if (src) {
        result.cloudinaryImages.push(src);
      }
    });

    // Chercher les images dans les éléments de slider/carousel
    result.sliderImages = [];
    document.querySelectorAll('[class*="slider"] img, [class*="carousel"] img, [class*="swiper"] img').forEach(img => {
      const src = (img as HTMLImageElement).src || img.getAttribute('data-src') || '';
      if (src && !src.includes('.svg')) {
        result.sliderImages.push(src);
      }
    });

    // Chercher les background-image
    result.bgImages = [];
    document.querySelectorAll('[style*="background-image"]').forEach(el => {
      const style = (el as HTMLElement).style.backgroundImage;
      const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match && match[1] && !match[1].includes('.svg')) {
        result.bgImages.push(match[1]);
      }
    });

    // Image principale via selectors spécifiques
    const mainImgSelectors = [
      '[data-testid*="product-image"] img',
      '[data-testid*="gallery"] img',
      '[data-testid*="image"] img',
      '[data-testid="article-header/photo-slider"] img',
      '.product-image img',
      'picture img',
      '[class*="gallery"] img',
      '[class*="ProductImage"] img',
      '[class*="slider"] img',
      'img[src*="cloudinary"]',
      'img[src*="res.cloudinary"]',
    ];

    result.mainImageSelectors = [];
    for (const sel of mainImgSelectors) {
      const img = document.querySelector(sel) as HTMLImageElement;
      if (img) {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && !src.includes('logo') && !src.includes('icon') && src.length > 50) {
          result.mainImageSelectors.push({
            selector: sel,
            src: src.substring(0, 120) + '...',
          });
        }
      }
    }

    // OG Image
    const ogImage = document.querySelector('meta[property="og:image"]');
    result.ogImage = ogImage?.getAttribute('content') || null;

    // Chercher image dans srcset
    const pictures = document.querySelectorAll('picture source[srcset]');
    result.pictureSourceSets = [];
    pictures.forEach(src => {
      const srcset = (src as HTMLSourceElement).srcset;
      if (srcset && !srcset.includes('logo') && srcset.includes('http')) {
        result.pictureSourceSets.push(srcset.split(' ')[0]?.substring(0, 100));
      }
    });

    // === STOCK ===
    result.stockElements = [];

    // Chercher tous les éléments liés au stock
    const stockSelectors = [
      '[data-testid*="stock"]',
      '[data-testid*="availability"]',
      '[class*="stock"]',
      '[class*="availability"]',
      '[class*="disponib"]',
    ];

    for (const sel of stockSelectors) {
      document.querySelectorAll(sel).forEach(el => {
        const text = el.textContent?.trim() || '';
        if (text.length > 0 && text.length < 200) {
          result.stockElements.push({
            selector: sel,
            text: text.substring(0, 100),
            class: (el as HTMLElement).className?.substring(0, 50) || '',
          });
        }
      });
    }

    // Stock via data-testid (plus fiable)
    const availabilityEl = document.querySelector('[data-testid*="availability"]');
    if (availabilityEl) {
      const text = availabilityEl.textContent || '';
      // Pattern: "28 Panneau plaque disponible(s) dans votre agence"
      // ou "15 disponible(s)"
      const qtyMatch = text.match(/(\d+)\s+(?:[A-Za-zÀ-ÿ\s]+\s+)?disponible/i);
      if (qtyMatch) {
        result.stockQuantity = parseInt(qtyMatch[1]);
        result.stockStatus = 'EN STOCK';
      } else if (text.toLowerCase().includes('disponible')) {
        result.stockStatus = 'EN STOCK';
      }
    }

    // Fallback dans le texte
    if (!result.stockStatus) {
      if (pageText.match(/sur\s*commande/i)) {
        result.stockStatus = 'Sur commande';
      } else if (pageText.match(/disponible/i)) {
        result.stockStatus = 'Disponible';
      }
    }

    // === AUTRES SPECS ===
    const supportMatch = pageText.match(/Support\s*:?\s*([^\n]+)/i);
    result.support = supportMatch ? supportMatch[1].trim().substring(0, 100) : null;

    const finitionMatch = pageText.match(/Finition[\/]?(?:Structure)?\s*:?\s*([^\n]+)/i);
    result.finition = finitionMatch ? finitionMatch[1].trim().substring(0, 50) : null;

    const decorMatch = pageText.match(/Nom\s*D[ée]cor\s*:?\s*([^\n]+)/i);
    result.decor = decorMatch ? decorMatch[1].trim().substring(0, 50) : null;

    return result;
  });

  // Affichage des résultats
  console.log('📦 RÉSULTATS:');
  console.log('='.repeat(60));

  console.log('\n📝 IDENTIFICATION:');
  console.log(`   Nom: ${data.nom}`);
  console.log(`   Marque: ${data.marque || data.marqueTrouvee || 'NON TROUVÉ'}`);
  console.log(`   Réf Dispano: ${data.refDispano}`);
  console.log(`   Réf URL: ${data.refFromUrl}`);
  console.log(`   Code EAN: ${data.codeEAN || 'Non trouvé'}`);

  console.log('\n💰 PRIX:');
  console.log(`   Prix/m²: ${data.prixM2 ? data.prixM2 + ' €' : 'NON TROUVÉ'}`);

  console.log('\n📐 DIMENSIONS:');
  console.log(`   Longueur: ${data.longueur} mm`);
  console.log(`   Largeur: ${data.largeur} mm`);
  console.log(`   Épaisseur: ${data.epaisseur} mm`);

  console.log('\n🖼️  IMAGES:');
  console.log(`   OG Image: ${data.ogImage ? '✅ Trouvée' : '❌ Non trouvée'}`);
  if (data.ogImage) {
    console.log(`   ${data.ogImage.substring(0, 80)}...`);
  }
  console.log(`   Images trouvées: ${data.images?.length || 0}`);
  if (data.images?.length > 0) {
    console.log('   Premières images trouvées:');
    data.images.slice(0, 5).forEach((img: any) => {
      console.log(`     - src: ${img.src}`);
      console.log(`       class: ${img.class || 'N/A'}`);
    });
  }
  if (data.mainImageSelectors?.length > 0) {
    console.log('   Via selectors:');
    data.mainImageSelectors.slice(0, 5).forEach((img: any) => {
      console.log(`     - ${img.selector}`);
      console.log(`       ${img.src}`);
    });
  }
  if (data.pictureSourceSets?.length > 0) {
    console.log('   Picture srcsets:');
    data.pictureSourceSets.slice(0, 3).forEach((src: string) => {
      console.log(`     - ${src}...`);
    });
  }
  if (data.cloudinaryImages?.length > 0) {
    console.log('   Cloudinary images:');
    data.cloudinaryImages.slice(0, 3).forEach((src: string) => {
      console.log(`     - ${src.substring(0, 80)}...`);
    });
  }
  if (data.sliderImages?.length > 0) {
    console.log('   Slider images:');
    data.sliderImages.slice(0, 3).forEach((src: string) => {
      console.log(`     - ${src.substring(0, 80)}...`);
    });
  }
  if (data.bgImages?.length > 0) {
    console.log('   Background images:');
    data.bgImages.slice(0, 3).forEach((src: string) => {
      console.log(`     - ${src.substring(0, 80)}...`);
    });
  }

  console.log('\n📦 STOCK:');
  console.log(`   Status: ${data.stockStatus || 'NON TROUVÉ'}`);
  console.log(`   Quantité: ${data.stockQuantity || 'Non trouvée'}`);
  if (data.stockElements?.length > 0) {
    console.log('   Éléments stock trouvés:');
    data.stockElements.slice(0, 5).forEach((el: any) => {
      console.log(`     - [${el.selector}] "${el.text}"`);
    });
  }

  console.log('\n🔧 SPECS:');
  console.log(`   Support: ${data.support || 'Non trouvé'}`);
  console.log(`   Finition: ${data.finition || 'Non trouvé'}`);
  console.log(`   Décor: ${data.decor || 'Non trouvé'}`);

  console.log('\n' + '='.repeat(60));

  // Résumé
  const issues: string[] = [];
  if (!data.nom || data.nom === 'NON TROUVÉ') issues.push('❌ Nom');
  if (!data.refDispano || data.refDispano === 'NON TROUVÉ') issues.push('❌ Réf Dispano');
  if (!data.prixM2) issues.push('⚠️ Prix');
  if (!data.ogImage && (!data.images || data.images.length === 0)) issues.push('❌ Image');
  if (!data.stockStatus) issues.push('⚠️ Stock');

  if (issues.length === 0) {
    console.log('✅ TOUT EST BON! Prêt pour le scraping.');
  } else {
    console.log('⚠️  PROBLÈMES DÉTECTÉS:');
    issues.forEach(i => console.log(`   ${i}`));
  }

  await browser.disconnect();
}

main().catch(e => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
