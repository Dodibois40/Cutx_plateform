/**
 * Inspection complète du DOM de la page F244 ST76
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'https://www.bcommebois.fr/plan-de-travail-f244-st76-egger-marbre-candela-anthracite-93226.html';

async function inspectDOM() {
  console.log('🔍 INSPECTION DOM - Page F244 ST76\n');

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
  await new Promise(r => setTimeout(r, 8000));  // Attendre 8s pour être sûr

  const result = await page.evaluate(() => {
    const results: string[] = [];

    results.push('📄 STRUCTURE HTML:');
    results.push('─'.repeat(80));

    // 1. Chercher tout texte contenant "3,050" ou "0,650" (dimensions visibles dans la capture)
    results.push('\n🎯 Recherche texte "3,050" et "0,650":');
    const bodyText = document.body.innerText;
    if (bodyText.includes('3,050')) {
      results.push('   ✅ "3,050" trouvé dans le texte');
      const idx = bodyText.indexOf('3,050');
      results.push(`      Contexte: ...${bodyText.substring(Math.max(0, idx-50), idx+100)}...`);
    } else {
      results.push('   ❌ "3,050" NON trouvé');
    }

    if (bodyText.includes('0,650')) {
      results.push('   ✅ "0,650" trouvé dans le texte');
      const idx = bodyText.indexOf('0,650');
      results.push(`      Contexte: ...${bodyText.substring(Math.max(0, idx-50), idx+100)}...`);
    } else {
      results.push('   ❌ "0,650" NON trouvé');
    }

    // 2. Lister TOUS les tableaux HTML
    results.push('\n📋 TABLEAUX HTML (<table>):');
    const tables = document.querySelectorAll('table');
    results.push(`   Nombre: ${tables.length}`);

    tables.forEach((table, idx) => {
      results.push(`\n   Table ${idx + 1}:`);
      const rows = table.querySelectorAll('tr');
      results.push(`      Lignes: ${rows.length}`);

      if (rows.length > 0) {
        results.push(`      Contenu des 5 premières lignes:`);
        Array.from(rows).slice(0, 5).forEach((row, rowIdx) => {
          const cells = row.querySelectorAll('td, th');
          const cellTexts = Array.from(cells).map(c => c?.textContent?.trim() || '');
          results.push(`         Row ${rowIdx + 1}: ${cellTexts.join(' | ')}`);
        });
      }
    });

    // 3. Chercher dans les divs avec classes/attributs spécifiques
    results.push('\n📦 DIVS avec attributs "data-*":');
    const divsWithData = document.querySelectorAll('[data-role], [data-content-type], [data-price-type]');
    results.push(`   Nombre: ${divsWithData.length}`);
    Array.from(divsWithData).slice(0, 10).forEach((div, idx) => {
      const attrs = Array.from(div.attributes).map(a => `${a.name}="${a.value}"`).join(' ');
      const text = div.textContent?.substring(0, 100).trim() || '';
      results.push(`   ${idx + 1}. <${div.tagName.toLowerCase()} ${attrs}>`);
      if (text) results.push(`      Text: ${text}...`);
    });

    // 4. Chercher des listes <dl> (definition lists) souvent utilisées pour les caractéristiques
    results.push('\n📝 DEFINITION LISTS (<dl>):');
    const dls = document.querySelectorAll('dl');
    results.push(`   Nombre: ${dls.length}`);
    dls.forEach((dl, idx) => {
      results.push(`\n   DL ${idx + 1}:`);
      const dts = dl.querySelectorAll('dt');
      const dds = dl.querySelectorAll('dd');
      for (let i = 0; i < Math.min(dts.length, 10); i++) {
        const label = dts[i]?.textContent?.trim() || '';
        const value = dds[i]?.textContent?.trim() || '';
        results.push(`      ${label}: ${value}`);
      }
    });

    // 5. Chercher divs avec classe "additional-attributes", "product-info", etc.
    results.push('\n🏷️  SECTIONS INFO PRODUIT:');
    const selectors = [
      '.additional-attributes',
      '.product-info-main',
      '.product.attribute',
      '.product-info-price',
      '[class*="characteristic"]',
      '[class*="specification"]',
    ];

    selectors.forEach(sel => {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        results.push(`\n   ${sel}: ${els.length} élément(s)`);
        els.forEach((el, idx) => {
          const text = el.textContent?.substring(0, 200).trim() || '';
          results.push(`      ${idx + 1}. ${text}...`);
        });
      }
    });

    return results.join('\n');
  });

  console.log(result);
  console.log('\n✅ Inspection terminée!');
}

inspectDOM().catch(console.error);
