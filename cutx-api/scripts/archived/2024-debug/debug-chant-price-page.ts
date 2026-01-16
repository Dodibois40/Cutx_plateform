/**
 * Debug: analyze price structure on a Bouney product page
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const url = process.argv[2] || 'https://www.bcommebois.fr/chant-abs-23x0-8mm-149-fa-polyrey-gris-paloma-93869.html';

  console.log('🔍 Debug page prix Bouney');
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

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const data = await page.evaluate(() => {
    const results: any = {};

    // Get product name
    const h1 = document.querySelector('h1.page-title span, h1.page-title, h1');
    results.productName = h1?.textContent?.trim();

    // Get all price-related elements
    results.priceElements = [];
    const priceSelectors = [
      '.price',
      '.price-box',
      '.product-info-price',
      '.price-wrapper',
      '.special-price',
      '.regular-price',
      '[data-price-type]',
      '.price-final_price',
      '.price-including-tax',
      '.price-excluding-tax',
    ];

    priceSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        results.priceElements.push({
          selector,
          text: el.textContent?.trim(),
          html: el.outerHTML.substring(0, 200),
        });
      });
    });

    // Get page text and look for price patterns
    const pageText = document.body.innerText || '';
    const priceMatches = pageText.match(/([\d.,]+)\s*€/g);
    results.pricePatterns = [...new Set(priceMatches || [])];

    // Look for "Prix" mentions
    const prixMatches = pageText.match(/Prix[^€]*?([\d.,]+)\s*€/gi);
    results.prixMentions = [...new Set(prixMatches || [])];

    // Look for price per unit (ml, m², etc.)
    const unitPriceMatches = pageText.match(/([\d.,]+)\s*€\s*\/\s*(ml|m²|unité|pièce)/gi);
    results.unitPrices = [...new Set(unitPriceMatches || [])];

    // Get data attributes that might contain prices
    results.dataAttributes = [];
    const allElements = document.querySelectorAll('[data-price], [data-price-amount], [data-product-price]');
    allElements.forEach(el => {
      results.dataAttributes.push({
        price: el.getAttribute('data-price'),
        priceAmount: el.getAttribute('data-price-amount'),
        productPrice: el.getAttribute('data-product-price'),
        text: el.textContent?.trim().substring(0, 100),
      });
    });

    // Get any span/div with € symbol
    results.euroElements = [];
    const allSpans = document.querySelectorAll('span, div, p');
    allSpans.forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.includes('€') && text.length < 50) {
        results.euroElements.push(text);
      }
    });
    results.euroElements = [...new Set(results.euroElements)].slice(0, 20);

    // Check if logged in (price might require login)
    const loginLink = document.querySelector('a[href*="login"], a[href*="customer/account"]');
    results.hasLoginLink = !!loginLink;

    // Check for "prix sur demande" or similar
    const demandeMatch = pageText.match(/prix\s+sur\s+(demande|devis)/i);
    results.prixSurDemande = demandeMatch ? demandeMatch[0] : null;

    return results;
  });

  console.log('📋 Données extraites:\n');
  console.log('Nom produit:', data.productName);
  console.log('Prix sur demande:', data.prixSurDemande);
  console.log('Lien login présent:', data.hasLoginLink);

  console.log('\n💰 Price patterns trouvés:', data.pricePatterns.length);
  data.pricePatterns.forEach((p: string) => console.log(`   ${p}`));

  console.log('\n💵 Mentions "Prix":', data.prixMentions.length);
  data.prixMentions.forEach((p: string) => console.log(`   ${p}`));

  console.log('\n📏 Prix unitaires:', data.unitPrices.length);
  data.unitPrices.forEach((p: string) => console.log(`   ${p}`));

  console.log('\n💲 Éléments avec €:', data.euroElements.length);
  data.euroElements.slice(0, 10).forEach((e: string) => console.log(`   ${e}`));

  console.log('\n🏷️ Price elements:', data.priceElements.length);
  data.priceElements.slice(0, 5).forEach((p: any) => {
    console.log(`   ${p.selector}: ${p.text}`);
  });

  console.log('\n📊 Data attributes:', data.dataAttributes.length);
  data.dataAttributes.forEach((d: any) => {
    console.log(`   price=${d.price}, amount=${d.priceAmount}, productPrice=${d.productPrice}`);
  });

  await page.close();
  await browser.disconnect();
}

main().catch(console.error);
