/**
 * Chercher où se trouve F244 ST76 sur le site
 */

import puppeteer from 'puppeteer';

const CATEGORY_URLS = [
  { name: 'Plans de travail (général)', url: 'https://www.bcommebois.fr/agencement/plans-de-travail.html' },
  { name: 'Plans de travail > Bois', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/bois.html' },
  { name: 'Plans de travail > Stratifiés', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/stratifies.html' },
  { name: 'Plans de travail > Compacts', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/compacts.html' },
  { name: 'Plans de travail > Résines', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/resines.html' },
];

async function searchF244() {
  console.log('🔍 Recherche du produit F244 ST76 sur le site\n');

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

  for (const category of CATEGORY_URLS) {
    console.log(`\n📂 ${category.name}`);
    console.log(`   URL: ${category.url}`);

    try {
      await page.goto(category.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      // Chercher F244 dans le texte de la page
      const found = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const hasF244 = bodyText.includes('F244');
        const hasST76 = bodyText.includes('ST76');
        const hasCandela = bodyText.toLowerCase().includes('candela');
        const hasAnthracite = bodyText.toLowerCase().includes('anthracite');

        // Chercher dans les liens de produits
        const productLinks = Array.from(document.querySelectorAll('a[href*="plan-de-travail"], a[href*="compact"]'));
        const f244Link = productLinks.find(a =>
          a.textContent?.includes('F244') ||
          a.getAttribute('href')?.includes('f244') ||
          a.getAttribute('href')?.includes('93226')
        );

        // Compter combien de produits sont listés
        const tables = document.querySelectorAll('table');
        let productCount = 0;
        tables.forEach(table => {
          productCount += table.querySelectorAll('tbody tr, tr').length;
        });

        return {
          hasF244,
          hasST76,
          hasCandela,
          hasAnthracite,
          f244LinkHref: f244Link ? f244Link.getAttribute('href') : null,
          f244LinkText: f244Link ? f244Link.textContent?.trim().substring(0, 80) : null,
          productCount
        };
      });

      console.log(`   Produits listés: ${found.productCount}`);
      console.log(`   Contient "F244": ${found.hasF244 ? '✅' : '❌'}`);
      console.log(`   Contient "ST76": ${found.hasST76 ? '✅' : '❌'}`);
      console.log(`   Contient "Candela": ${found.hasCandela ? '✅' : '❌'}`);
      console.log(`   Contient "anthracite": ${found.hasAnthracite ? '✅' : '❌'}`);

      if (found.f244LinkHref) {
        console.log(`   🎯 LIEN F244 TROUVÉ !`);
        console.log(`      Href: ${found.f244LinkHref}`);
        console.log(`      Texte: ${found.f244LinkText}`);
      }

    } catch (e: any) {
      console.log(`   ❌ Erreur: ${e.message}`);
    }
  }

  console.log('\n✅ Recherche terminée');
}

searchF244().catch(console.error);
