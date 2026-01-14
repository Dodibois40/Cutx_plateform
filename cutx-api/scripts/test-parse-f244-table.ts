/**
 * Test du parsing du tableau des caractéristiques pour F244 ST76
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'https://www.bcommebois.fr/plan-de-travail-f244-st76-egger-marbre-candela-anthracite-93226.html';

async function testParsing() {
  console.log('🧪 TEST PARSING - Tableau caractéristiques F244 ST76\n');

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome debug non accessible');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  const result = await page.evaluate(() => {
    // Nom du produit
    const nomEl = document.querySelector('h1.page-title span, h1');
    const nom = nomEl?.textContent?.trim() || '';

    // Prix
    const priceEl = document.querySelector('[data-price-type="finalPrice"] .price, .price-box .price, .product-info-price .price');
    const prix = priceEl?.textContent?.trim() || '';

    // Image
    const imgEl = document.querySelector('.fotorama__stage__frame img, .product-image-container img, .product-media img') as HTMLImageElement;
    const imageUrl = imgEl?.src || '';

    // SKU/Code produit
    const skuEl = document.querySelector('.product.attribute.sku .value, [itemprop="sku"]');
    const sku = skuEl?.textContent?.trim() || '';

    // Parser TOUS les tableaux pour trouver les caractéristiques
    console.log('📋 PARSING DES TABLEAUX:');
    const tables = document.querySelectorAll('table');
    let dimensions: any = { longueur: 0, largeur: 0, epaisseur: 0 };
    let code = '';
    let decor = '';
    let finition = '';

    tables.forEach((table, idx) => {
      const rows = table.querySelectorAll('tr');

      rows.forEach((row, rowIdx) => {
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          const label = cells[0].textContent?.trim().toLowerCase() || '';
          const value = cells[1].textContent?.trim() || '';

          console.log(`   [Table ${idx+1} Row ${rowIdx+1}] ${label}: ${value}`);

          // Longueur
          if (label.includes('longueur')) {
            const numMatch = value.match(/[\d.,]+/);
            if (numMatch) {
              const val = parseFloat(numMatch[0].replace(',', '.'));
              dimensions.longueur = val < 10 ? Math.round(val * 1000) : Math.round(val);
              console.log(`      → Longueur extraite: ${dimensions.longueur} mm`);
            }
          }

          // Largeur
          if (label.includes('largeur')) {
            const numMatch = value.match(/[\d.,]+/);
            if (numMatch) {
              const val = parseFloat(numMatch[0].replace(',', '.'));
              dimensions.largeur = val < 10 ? Math.round(val * 1000) : Math.round(val);
              console.log(`      → Largeur extraite: ${dimensions.largeur} mm`);
            }
          }

          // Épaisseur
          if (label.includes('épaisseur') || label.includes('epaisseur') || label.includes('haut')) {
            const numMatch = value.match(/[\d.,]+/);
            if (numMatch) {
              dimensions.epaisseur = parseFloat(numMatch[0].replace(',', '.'));
              console.log(`      → Épaisseur extraite: ${dimensions.epaisseur} mm`);
            }
          }

          // Code
          if (label.includes('code')) {
            code = value;
          }

          // Décor
          if (label.includes('décor') || label.includes('decor')) {
            decor = value;
          }

          // Finition
          if (label.includes('finition')) {
            finition = value;
          }
        }
      });
    });

    return {
      nom,
      prix,
      imageUrl: imageUrl ? 'TROUVÉE' : 'NON TROUVÉE',
      sku,
      dimensions,
      code,
      decor,
      finition,
    };
  });

  console.log('\n\n📊 RÉSULTAT DU PARSING:');
  console.log('═'.repeat(80));
  console.log(`Nom: ${result.nom}`);
  console.log(`Prix: ${result.prix}`);
  console.log(`SKU: ${result.sku}`);
  console.log(`Code: ${result.code}`);
  console.log(`Décor: ${result.decor}`);
  console.log(`Finition: ${result.finition}`);
  console.log(`Image: ${result.imageUrl}`);
  console.log('\nDimensions:');
  console.log(`  Longueur: ${result.dimensions.longueur} mm`);
  console.log(`  Largeur: ${result.dimensions.largeur} mm`);
  console.log(`  Épaisseur: ${result.dimensions.epaisseur} mm`);
  console.log('═'.repeat(80));

  // Vérifier si les données sont complètes
  const isComplete =
    result.nom &&
    result.prix &&
    result.dimensions.longueur > 0 &&
    result.dimensions.largeur > 0 &&
    result.dimensions.epaisseur > 0;

  console.log(`\n${isComplete ? '✅' : '❌'} Données ${isComplete ? 'COMPLÈTES' : 'INCOMPLÈTES'}`);

  if (!isComplete) {
    console.log('\n⚠️  Données manquantes:');
    if (!result.nom) console.log('   - Nom');
    if (!result.prix) console.log('   - Prix');
    if (result.dimensions.longueur === 0) console.log('   - Longueur');
    if (result.dimensions.largeur === 0) console.log('   - Largeur');
    if (result.dimensions.epaisseur === 0) console.log('   - Épaisseur');
  }
}

testParsing().catch(console.error);
