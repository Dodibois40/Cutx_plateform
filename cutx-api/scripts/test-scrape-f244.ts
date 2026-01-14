/**
 * Test du scraping sur le produit F244 ST76 spécifique
 * URL: https://www.bcommebois.fr/plan-de-travail-f244-st76-egger-marbre-candela-anthracite-93226.html
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'https://www.bcommebois.fr/plan-de-travail-f244-st76-egger-marbre-candela-anthracite-93226.html';

async function testScraping() {
  console.log('🧪 TEST SCRAPING - Produit F244 ST76');
  console.log('=====================================\n');
  console.log(`URL: ${TEST_URL}\n`);

  console.log('🔌 Connexion à Chrome...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome debug non accessible');
    console.error('   Lance: scripts/launch-chrome-debug.bat');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  console.log('✅ Connecté!\n');

  // Vérifier d'abord si connecté
  console.log('🔐 Vérification connexion...');
  const isConnected = await page.evaluate(() => {
    const monCompte = document.body.innerText.includes('Mon compte');
    const loginBtn = document.querySelector('a[href*="login"], a[href*="connexion"]');
    return monCompte && !loginBtn;
  });
  console.log(isConnected ? '✅ Connecté' : '⚠️  NON CONNECTÉ - Le contenu peut être restreint\n');

  await page.goto(TEST_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));  // Attendre 5s pour le JS

  const data = await page.evaluate(() => {
    // Nom du produit
    const nomEl = document.querySelector('h1.page-title span, h1.product-name, .product-info-main h1 span, h1');
    const nom = nomEl?.textContent?.trim() || '';

    console.log('📌 Nom du produit:', nom);

    // Chercher dimensions dans le nom (logique actuelle du script)
    let dimMatch = nom.match(/(\d{3,4})\s*x\s*(\d{3,4})\s*x\s*(\d+)/i);
    console.log('🔍 Dimensions trouvées dans nom (3050x650x38):', dimMatch ? 'OUI' : 'NON');

    if (!dimMatch) {
      const epMatch = nom.match(/(\d+)\s*mm\b/);
      const lwMatch = nom.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
      console.log('🔍 Épaisseur trouvée dans nom (XXmm):', epMatch ? 'OUI' : 'NON');
      console.log('🔍 L×W trouvées dans nom (3050x650):', lwMatch ? 'OUI' : 'NON');
    }

    // Chercher dans TOUT le texte de la page
    const bodyText = document.body.innerText;
    const dimensionPatterns = [
      /(\d{3,5})\s*x\s*(\d{3,4})\s*x\s*(\d+)\s*mm/gi,
      /(\d{1,2}[.,]\d{3})\s*x\s*0[.,](\d{3})\s*x\s*(\d+)\s*mm/gi,  // Format: 4.100 x 0.650 x 12 mm
      /longueur[:\s]*(\d+)\s*mm/gi,
      /largeur[:\s]*(\d+)\s*mm/gi,
      /épaisseur[:\s]*(\d+)\s*mm/gi,
    ];

    console.log('\n📊 Recherche dimensions dans TOUTE la page:');
    dimensionPatterns.forEach((pattern, idx) => {
      const matches = bodyText.match(pattern);
      if (matches) {
        console.log(`   Pattern ${idx + 1}:`, matches.slice(0, 3));
      }
    });

    // Chercher dans les tableaux (logique actuelle)
    console.log('\n📋 Tableaux HTML trouvés:');
    const tables = document.querySelectorAll('table');
    console.log(`   Nombre de tableaux: ${tables.length}`);

    tables.forEach((table, idx) => {
      const rows = table.querySelectorAll('tbody tr, tr');
      console.log(`   Table ${idx + 1}: ${rows.length} lignes`);

      if (rows.length > 0) {
        const firstRow = rows[0];
        const cells = firstRow.querySelectorAll('td, th');
        const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');
        console.log(`      Première ligne:`, cellTexts.slice(0, 5));
      }
    });

    // Chercher dans les divs de description/caractéristiques
    console.log('\n📝 Sections Description/Caractéristiques:');
    const descSelectors = [
      '.product.attribute.description',
      '.product-info-description',
      '.additional-attributes',
      '[data-content-type="description"]',
      '.product-attributes',
      '.product-specifications'
    ];

    descSelectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent?.substring(0, 200) || '';
        console.log(`   ${sel}:`, text.substring(0, 100) + '...');
      }
    });

    // Chercher code produit
    console.log('\n🏷️  Code produit:');
    const refEl = document.querySelector('.product.attribute.sku .value, [itemprop="sku"], .sku .value');
    console.log('   SKU:', refEl?.textContent?.trim() || 'NON TROUVÉ');

    // Prix
    console.log('\n💰 Prix:');
    const priceEl = document.querySelector('[data-price-type="finalPrice"] .price, .price-box .price');
    console.log('   Prix:', priceEl?.textContent?.trim() || 'NON TROUVÉ');

    // Image
    console.log('\n🖼️  Image:');
    const imgEl = document.querySelector('.fotorama__stage__frame img, .product-image-container img') as HTMLImageElement;
    console.log('   Image URL:', imgEl?.src ? 'TROUVÉE' : 'NON TROUVÉE');

    return {
      nom,
      bodyText: bodyText.substring(0, 1000) // Premier 1000 chars pour inspection
    };
  });

  console.log('\n\n📄 EXTRAIT DU CONTENU DE LA PAGE:');
  console.log('─'.repeat(80));
  console.log(data.bodyText);
  console.log('─'.repeat(80));

  // Faire une capture d'écran
  console.log('\n📸 Capture d\'écran...');
  await page.screenshot({ path: 'test-f244-page.png', fullPage: true });
  console.log('   Sauvegardée: test-f244-page.png');

  console.log('\n✅ Test terminé!');
  console.log('\n💡 Si le contenu est vide:');
  console.log('   1. Ouvre Chrome sur http://127.0.0.1:9222');
  console.log('   2. Connecte-toi sur bcommebois.fr');
  console.log('   3. Relance ce script');
}

testScraping().catch(console.error);
