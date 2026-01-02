/**
 * Debug script to check product extraction
 */

import puppeteer from 'puppeteer-core';

async function debug() {
  console.log('🔍 Debug extraction produit...\n');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // Aller sur la page catégorie
  const categoryUrl = 'https://www.dispano.fr/c/contreplaques-resineux/x3visu_dig_onv3_2027935R5';
  console.log('📄 Catégorie:', categoryUrl);

  await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Récupérer les liens produits
  const productLinks = await page.evaluate(() => {
    const links: string[] = [];
    document.querySelectorAll('a').forEach(el => {
      const href = el.href;
      if (href && href.includes('/p/') && !links.includes(href)) {
        links.push(href);
      }
    });
    return links.slice(0, 3); // Prendre les 3 premiers
  });

  console.log(`\n📋 ${productLinks.length} liens trouvés:`);
  productLinks.forEach((l, i) => console.log(`   ${i + 1}. ${l}`));

  if (productLinks.length > 0) {
    const testUrl = productLinks[0];
    console.log(`\n🔄 Test sur: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const data = await page.evaluate(() => {
      const result: Record<string, any> = {};
      const pageText = document.body.innerText;
      const url = window.location.href;

      // URL finale
      result.finalUrl = url;

      // H1
      const h1 = document.querySelector('h1');
      result.h1 = h1 ? h1.textContent?.trim() : null;

      // data-testid article-name
      const articleName = document.querySelector('[data-testid="article-header/article-name"]');
      result.articleName = articleName ? articleName.textContent?.trim() : null;

      // Ref dans URL
      const urlMatch = url.match(/-A(\d+)/);
      result.refFromUrl = urlMatch ? urlMatch[1] : null;

      // Ref Dispano dans texte
      const refMatch = pageText.match(/Réf\.?\s*Dispano\s*:?\s*(\d+)/i);
      result.refFromText = refMatch ? refMatch[1] : null;

      // Prix
      const prixMatch = pageText.match(/([\d,]+)\s*€/);
      result.prix = prixMatch ? prixMatch[1] : null;

      // Dimensions
      const dimMatch = pageText.match(/(\d+)\s*x\s*(\d+)\s*(?:cm|mm)/i);
      result.dimensions = dimMatch ? `${dimMatch[1]}x${dimMatch[2]}` : null;

      return result;
    });

    console.log('\n📊 Données extraites:');
    console.log(JSON.stringify(data, null, 2));

    // Vérifier si le problème est nom ou ref
    if (!data.h1 && !data.articleName) {
      console.log('\n⚠️ PROBLÈME: Pas de nom trouvé (ni h1, ni article-name)');
    }
    if (!data.refFromUrl && !data.refFromText) {
      console.log('\n⚠️ PROBLÈME: Pas de référence trouvée');
    }
  }

  await page.close();
  console.log('\n✅ Debug terminé');
}

debug().catch(e => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
