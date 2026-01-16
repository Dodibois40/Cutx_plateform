/**
 * Capture le HTML complet d'une page produit pour analyse
 */

import puppeteer from 'puppeteer-core';
import * as fs from 'fs';

async function main() {
  console.log('📸 CAPTURE HTML PAGE PRODUIT');
  console.log('='.repeat(60));

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome non connecté');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0];

  // D'abord naviguer vers une catégorie avec des produits
  console.log('\n1️⃣ Navigation vers la catégorie Stratifiés Unis...');
  await page.goto('https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll pour charger les produits
  console.log('   Scroll pour charger les produits...');
  await page.evaluate(() => {
    window.scrollBy(0, 1000);
  });
  await new Promise(r => setTimeout(r, 2000));

  // Trouver le premier lien produit (format numérique)
  const firstProductLink = await page.evaluate(() => {
    const links = document.querySelectorAll('a');
    for (const link of links) {
      const href = link.href;
      // Chercher les liens format /XXXXX.html (5-6 chiffres)
      if (href && /\/\d{5,6}\.html/.test(href)) {
        return href;
      }
    }
    // Sinon chercher les liens produits
    const productLinks = document.querySelectorAll('a.product-item-link, .product-item a, .product a[href*=".html"]');
    if (productLinks.length > 0) {
      return (productLinks[0] as HTMLAnchorElement).href;
    }
    return null;
  });

  if (!firstProductLink) {
    console.log('❌ Aucun lien produit trouvé');

    // Debug: afficher tous les liens
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(h => h.includes('bcommebois'))
        .slice(0, 30);
    });
    console.log('\nTous les liens trouvés:');
    allLinks.forEach(l => console.log(`   ${l}`));

    await browser.disconnect();
    return;
  }

  console.log(`\n2️⃣ Navigation vers le produit: ${firstProductLink}`);
  await page.goto(firstProductLink, {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  await new Promise(r => setTimeout(r, 3000));

  // Capturer les informations
  const productData = await page.evaluate(() => {
    const result: any = {
      url: window.location.href,
      title: document.title,
      productName: '',
      sku: '',
      price: '',
      dimensions: [],
      tableHTML: '',
      attributesHTML: '',
      allTables: [],
    };

    // Nom du produit
    const nameEl = document.querySelector('h1.page-title span, h1 span.base, .product-info-main h1');
    result.productName = nameEl?.textContent?.trim() || '';

    // SKU
    const skuEl = document.querySelector('.product.attribute.sku .value, [itemprop="sku"]');
    result.sku = skuEl?.textContent?.trim() || '';

    // Prix
    const priceEl = document.querySelector('[data-price-type="finalPrice"] .price, .price-box .price, .product-info-price .price');
    result.price = priceEl?.textContent?.trim() || '';

    // Tous les tableaux
    document.querySelectorAll('table').forEach((table, idx) => {
      const tableInfo = {
        index: idx,
        className: table.className,
        id: table.id,
        html: table.outerHTML.substring(0, 2000),
        headers: [] as string[],
        firstRows: [] as string[][],
      };

      // Headers
      table.querySelectorAll('th').forEach(th => {
        tableInfo.headers.push(th.textContent?.trim() || '');
      });

      // 3 premières lignes
      let rowCount = 0;
      table.querySelectorAll('tr').forEach(tr => {
        if (rowCount >= 3) return;
        const cells: string[] = [];
        tr.querySelectorAll('td, th').forEach(cell => {
          cells.push(cell.textContent?.trim() || '');
        });
        if (cells.length > 0) {
          tableInfo.firstRows.push(cells);
          rowCount++;
        }
      });

      result.allTables.push(tableInfo);
    });

    // Attributs produit
    const attrContainer = document.querySelector('.product-info-main, .product-info, #product-info-main');
    if (attrContainer) {
      result.attributesHTML = attrContainer.innerHTML.substring(0, 5000);
    }

    // Chercher spécifiquement les dimensions dans tout le texte
    const bodyText = document.body.innerText;
    const dimPatterns = [
      /(\d{3,4})\s*[xX×]\s*(\d{3,4})/g,
      /longueur[:\s]*(\d+)/gi,
      /largeur[:\s]*(\d+)/gi,
      /[ée]paisseur[:\s]*(\d+(?:[,\.]\d+)?)/gi,
    ];

    const matches: string[] = [];
    for (const pattern of dimPatterns) {
      let match;
      while ((match = pattern.exec(bodyText)) !== null) {
        matches.push(match[0]);
        if (matches.length >= 10) break;
      }
    }
    result.dimensions = matches;

    return result;
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 DONNÉES PRODUIT CAPTURÉES');
  console.log('='.repeat(60));
  console.log(`URL: ${productData.url}`);
  console.log(`Titre: ${productData.title}`);
  console.log(`Nom produit: ${productData.productName}`);
  console.log(`SKU: ${productData.sku}`);
  console.log(`Prix: ${productData.price}`);
  console.log(`Dimensions trouvées: ${productData.dimensions.join(', ')}`);

  console.log(`\n📋 TABLEAUX TROUVÉS: ${productData.allTables.length}`);
  for (const table of productData.allTables) {
    console.log(`\n   Table #${table.index} (class="${table.className}")`);
    console.log(`   Headers: ${table.headers.join(' | ')}`);
    console.log(`   Lignes:`);
    for (const row of table.firstRows) {
      console.log(`      ${row.join(' | ')}`);
    }
  }

  // Sauvegarder le HTML pour analyse
  const htmlPath = 'scripts/product-page-sample.html';
  const fullHTML = await page.content();
  fs.writeFileSync(htmlPath, fullHTML);
  console.log(`\n💾 HTML complet sauvegardé dans: ${htmlPath}`);

  await browser.disconnect();
  console.log('\n✅ Capture terminée');
}

main().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
