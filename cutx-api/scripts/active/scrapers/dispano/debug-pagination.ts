/**
 * Script de debug pour analyser la pagination Dispano
 */
import puppeteer from 'puppeteer-core';

async function main() {
  const url = process.argv[2] || 'https://www.dispano.fr/c/panneau-melamine-decor/x2visu_dig_onv2_2027897R5';
  
  console.log('🔌 Connexion à Chrome...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });
  
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  console.log(`📋 Chargement: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Analyser la page
  const analysis = await page.evaluate(() => {
    const result: any = {
      productCount: 0,
      paginationElements: [],
      loadMoreButtons: [],
      totalProductsText: null,
    };
    
    // Compter les produits visibles
    const productLinks = document.querySelectorAll('a[href*="/p/"]');
    result.productCount = productLinks.length;
    
    // Chercher le texte indiquant le total de produits
    const allText = document.body.innerText;
    const totalMatch = allText.match(/(\d+)\s*produit/i);
    if (totalMatch) {
      result.totalProductsText = totalMatch[0];
    }
    
    // Chercher la pagination
    document.querySelectorAll('[class*="pagination"], nav, [class*="pager"]').forEach(el => {
      result.paginationElements.push({
        tag: el.tagName,
        class: el.className,
        text: el.textContent?.substring(0, 200),
        children: el.children.length,
      });
    });
    
    // Chercher les boutons "voir plus" / "load more"
    document.querySelectorAll('button, a').forEach(el => {
      const text = el.textContent?.toLowerCase() || '';
      if (text.includes('voir plus') || text.includes('charger') || text.includes('more') || 
          text.includes('suivant') || text.includes('next')) {
        result.loadMoreButtons.push({
          tag: el.tagName,
          text: el.textContent?.trim().substring(0, 50),
          class: (el as HTMLElement).className,
          visible: (el as HTMLElement).offsetParent !== null,
        });
      }
    });
    
    // Chercher si l'URL actuelle a une pagination
    result.currentUrl = window.location.href;
    
    // Chercher des liens de pagination dans les hrefs
    const pageLinks: string[] = [];
    document.querySelectorAll('a[href*="page"]').forEach(a => {
      pageLinks.push(a.getAttribute('href') || '');
    });
    result.pageLinks = pageLinks.slice(0, 10);
    
    return result;
  });
  
  console.log('\n📊 ANALYSE DE LA PAGE:');
  console.log(`   URL: ${analysis.currentUrl}`);
  console.log(`   Produits visibles: ${analysis.productCount}`);
  console.log(`   Total produits (texte): ${analysis.totalProductsText || 'Non trouvé'}`);
  
  console.log('\n📑 ÉLÉMENTS DE PAGINATION:');
  if (analysis.paginationElements.length === 0) {
    console.log('   Aucun élément de pagination trouvé');
  } else {
    analysis.paginationElements.forEach((el: any, i: number) => {
      console.log(`   ${i + 1}. <${el.tag}> class="${el.class?.substring(0, 60)}"`);
      console.log(`      Texte: ${el.text?.substring(0, 100)}`);
    });
  }
  
  console.log('\n🔘 BOUTONS "VOIR PLUS" / "SUIVANT":');
  if (analysis.loadMoreButtons.length === 0) {
    console.log('   Aucun bouton trouvé');
  } else {
    analysis.loadMoreButtons.forEach((btn: any, i: number) => {
      console.log(`   ${i + 1}. <${btn.tag}> "${btn.text}" - visible: ${btn.visible}`);
      console.log(`      class: ${btn.class?.substring(0, 80)}`);
    });
  }
  
  console.log('\n🔗 LIENS DE PAGINATION:');
  if (analysis.pageLinks.length === 0) {
    console.log('   Aucun lien de pagination trouvé');
  } else {
    analysis.pageLinks.forEach((link: string) => {
      console.log(`   - ${link}`);
    });
  }
  
  await browser.disconnect();
}

main().catch(e => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
