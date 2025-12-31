/**
 * Analyse détaillée d'un seul product-wrapper
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const url = 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html';

  console.log('🔍 ANALYSE DÉTAILLÉE D\'UN PRODUCT-WRAPPER\n');

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
  } catch (e) {
    console.error('❌ Chrome non connecté');
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Chercher le product-wrapper-13381 ou le premier disponible
  const analysis = await page.evaluate(() => {
    // Trouver un product-wrapper spécifique ou le premier
    const targetId = 'product-wrapper-13381';
    let wrapper = document.getElementById(targetId);

    if (!wrapper) {
      // Prendre le premier product-wrapper avec un ID numérique
      const allWrappers = document.querySelectorAll('[id^="product-wrapper-"]');
      wrapper = allWrappers[0] as HTMLElement;
    }

    if (!wrapper) {
      return { error: 'Aucun product-wrapper trouvé' };
    }

    const result: any = {
      wrapperId: wrapper.id,
      outerHTML: wrapper.outerHTML.substring(0, 5000), // Les premiers 5000 chars pour voir la structure
      textContent: wrapper.textContent?.substring(0, 2000)
    };

    // Chercher des éléments spécifiques
    const allElements = wrapper.querySelectorAll('*');
    result.elementCounts = {
      total: allElements.length,
      tables: wrapper.querySelectorAll('table').length,
      divs: wrapper.querySelectorAll('div').length,
      spans: wrapper.querySelectorAll('span').length,
      tds: wrapper.querySelectorAll('td').length,
      trs: wrapper.querySelectorAll('tr').length
    };

    // Examiner le contenu textuel des cellules
    result.cellContents = [];
    wrapper.querySelectorAll('td, th').forEach((cell, idx) => {
      if (idx < 30) { // Limiter
        result.cellContents.push({
          tag: cell.tagName,
          text: cell.textContent?.trim().substring(0, 100),
          classes: cell.className
        });
      }
    });

    // Chercher les liens "En savoir +"
    const links = wrapper.querySelectorAll('a');
    result.links = [];
    links.forEach(a => {
      const href = a.getAttribute('href');
      const text = a.textContent?.trim();
      if (href && text) {
        result.links.push({ href, text: text.substring(0, 50) });
      }
    });

    // Examiner les éléments avec classes qui contiennent des infos produit
    result.productInfo = [];
    wrapper.querySelectorAll('[class*="product"], [class*="title"], [class*="name"], [class*="prix"], [class*="price"]').forEach((el, idx) => {
      if (idx < 10) {
        result.productInfo.push({
          tag: el.tagName,
          class: el.className,
          text: el.textContent?.trim().substring(0, 100)
        });
      }
    });

    // Examiner les éléments de stock
    result.stockInfo = [];
    wrapper.querySelectorAll('[class*="stock"]').forEach(el => {
      result.stockInfo.push({
        class: el.className,
        title: el.getAttribute('title'),
        parent: el.parentElement?.textContent?.trim().substring(0, 50)
      });
    });

    return result;
  });

  if (analysis.error) {
    console.log('❌', analysis.error);
    await browser.disconnect();
    return;
  }

  console.log(`📦 Wrapper ID: ${analysis.wrapperId}`);
  console.log(`\n📊 Éléments trouvés:`);
  console.log(`   Tables: ${analysis.elementCounts.tables}`);
  console.log(`   Lignes (tr): ${analysis.elementCounts.trs}`);
  console.log(`   Cellules (td): ${analysis.elementCounts.tds}`);

  console.log(`\n📝 Contenu des cellules (${analysis.cellContents.length}):`);
  analysis.cellContents.forEach((cell: any, i: number) => {
    console.log(`   [${i}] <${cell.tag}> "${cell.text}"`);
  });

  console.log(`\n🔗 Liens (${analysis.links.length}):`);
  analysis.links.forEach((link: any) => {
    console.log(`   "${link.text}" → ${link.href}`);
  });

  console.log(`\n🏷️ Éléments produit (${analysis.productInfo.length}):`);
  analysis.productInfo.forEach((info: any) => {
    console.log(`   <${info.tag}> class="${info.class.substring(0, 50)}..."`);
    console.log(`      → "${info.text}"`);
  });

  console.log(`\n📦 Éléments stock (${analysis.stockInfo.length}):`);
  analysis.stockInfo.forEach((info: any) => {
    console.log(`   class: ${info.class.substring(0, 60)}`);
    console.log(`   title: ${info.title || '(none)'}`);
  });

  // Afficher le HTML brut pour analyse
  console.log('\n' + '═'.repeat(70));
  console.log('📄 HTML BRUT (premiers 3000 chars):');
  console.log('═'.repeat(70));
  console.log(analysis.outerHTML.substring(0, 3000));

  await browser.disconnect();
}

main();
