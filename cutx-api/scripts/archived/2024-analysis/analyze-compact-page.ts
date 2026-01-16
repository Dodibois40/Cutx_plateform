import puppeteer from 'puppeteer';

async function analyzeCompactPage() {
  console.log('🔍 Analyse de la page compacts Bouney...\n');

  console.log('🔌 Connexion à Chrome Debug...');
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null,
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  console.log('✅ Connecté!\n');

  const url = 'https://www.bcommebois.fr/agencement/plans-de-travail/compacts.html';
  console.log(`📋 Chargement de: ${url}\n`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('⚠️ Timeout navigation, on continue...');
  }
  await new Promise(r => setTimeout(r, 3000));

  // Scroll pour charger tous les produits
  console.log('📜 Scroll pour charger tous les produits...');
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
  await new Promise(r => setTimeout(r, 2000));

  // Analyser sous-catégories et produits
  const analysis = await page.evaluate(() => {
    const results: any = {
      subcategories: [],
      totalProducts: 0,
      productLinks: [],
      sampleProducts: [],
    };

    // Chercher les sous-catégories (Unis, Bois, Matières)
    const subcatSelectors = [
      '.category-list a',
      '.subcategory-list a',
      '.categories-menu a',
      'nav a',
      '.sidebar a'
    ];

    const subcatLinks = new Set<string>();
    for (const sel of subcatSelectors) {
      document.querySelectorAll(sel).forEach(el => {
        const href = (el as HTMLAnchorElement).href;
        const text = el.textContent?.trim();
        if (href && text && href.includes('compacts')) {
          const subcatName = text.toLowerCase();
          if (subcatName.includes('uni') || subcatName.includes('bois') || subcatName.includes('matière') || subcatName.includes('matiere')) {
            subcatLinks.add(JSON.stringify({ name: text, url: href }));
          }
        }
      });
    }

    results.subcategories = Array.from(subcatLinks).map(s => JSON.parse(s));

    // Chercher les vrais produits dans la grille
    const productItems = document.querySelectorAll('.product-item, .item.product');
    results.totalProducts = productItems.length;

    productItems.forEach((item, idx) => {
      if (idx < 10) {
        const nameEl = item.querySelector('.product-item-name a, .product-name a, h2 a, h3 a');
        const linkEl = item.querySelector('a.product-item-link, a.product-item-photo, a[href*=".html"]');
        const priceEl = item.querySelector('.price');
        const imgEl = item.querySelector('img');

        const name = nameEl?.textContent?.trim();
        const link = linkEl?.getAttribute('href') || nameEl?.getAttribute('href');
        const price = priceEl?.textContent?.trim();
        const imgSrc = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src');

        if (name && link) {
          results.sampleProducts.push({ name, link, price, imgSrc });
          if (!results.productLinks.includes(link)) {
            results.productLinks.push(link);
          }
        }
      } else {
        const linkEl = item.querySelector('a.product-item-link, a.product-item-photo, a[href*=".html"]');
        const nameEl = item.querySelector('.product-item-name a, .product-name a, h2 a, h3 a');
        const link = linkEl?.getAttribute('href') || nameEl?.getAttribute('href');
        if (link && !results.productLinks.includes(link)) {
          results.productLinks.push(link);
        }
      }
    });

    return results;
  });

  console.log('📊 ANALYSE DE LA PAGE COMPACTS:');
  console.log('=====================================');
  console.log(`Sous-catégories trouvées: ${analysis.subcategories.length}`);
  if (analysis.subcategories.length > 0) {
    analysis.subcategories.forEach((cat: any) => {
      console.log(`  - ${cat.name}`);
      console.log(`    ${cat.url}`);
    });
  }
  console.log(`\nTotal produits affichés: ${analysis.totalProducts}`);
  console.log(`Liens produits uniques: ${analysis.productLinks.length}\n`);

  if (analysis.sampleProducts.length > 0) {
    console.log('📦 Exemples de produits:\n');
    analysis.sampleProducts.forEach((prod: any, i: number) => {
      console.log(`${i + 1}. ${prod.name}`);
      console.log(`   Prix: ${prod.price || 'N/A'}`);
      console.log(`   Lien: ${prod.link.split('/').pop()}`);
      console.log('');
    });
  }

  // Analyser UN produit en détail pour comprendre la structure
  if (analysis.productLinks.length > 0) {
    const firstProductUrl = analysis.productLinks[0];
    console.log(`\n🔍 ANALYSE DÉTAILLÉE D'UN PRODUIT:`);
    console.log(`${'='.repeat(70)}`);
    console.log(`📋 ${firstProductUrl}\n`);

    try {
      await page.goto(firstProductUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      console.log('⚠️ Timeout, on continue...');
    }
    await new Promise(r => setTimeout(r, 3000));

    const productDetails = await page.evaluate(() => {
      const details: any = {};

      // Titre
      const titleEl = document.querySelector('h1.page-title span, h1.product-name, h1');
      details.title = titleEl?.textContent?.trim();

      // Rechercher les tableaux avec TOUTES les lignes
      const tables = document.querySelectorAll('table');
      details.tablesCount = tables.length;
      details.tables = [];

      tables.forEach((table, idx) => {
        const headers: string[] = [];
        const rows: string[][] = [];

        // Headers
        table.querySelectorAll('thead th, th').forEach(th => {
          headers.push(th.textContent?.trim() || '');
        });

        // TOUTES les lignes
        table.querySelectorAll('tbody tr, tr').forEach(tr => {
          const cells: string[] = [];
          tr.querySelectorAll('td').forEach(td => {
            cells.push(td.textContent?.trim() || '');
          });
          if (cells.length > 0) {
            rows.push(cells);
          }
        });

        if (headers.length > 0 || rows.length > 0) {
          details.tables.push({
            index: idx,
            headers,
            rows: rows
          });
        }
      });

      // Chercher mentions de déclinaisons/coloris
      const bodyText = document.body.innerText;
      details.mentionsDeclinaisons = bodyText.match(/d[ée]clinaison|coloris|variante|finition/gi)?.length || 0;

      return details;
    });

    console.log(`📦 Produit: ${productDetails.title}\n`);
    console.log(`Nombre de tableaux: ${productDetails.tablesCount}`);
    console.log(`Mentions déclinaisons/coloris: ${productDetails.mentionsDeclinaisons}\n`);

    if (productDetails.tables.length > 0) {
      productDetails.tables.forEach((table: any, tableIdx: number) => {
        console.log(`\n📋 TABLEAU ${tableIdx + 1} - ${table.rows.length} LIGNES TOTAL:`);
        console.log(`${'─'.repeat(70)}`);
        if (table.headers.length > 0) {
          console.log(`Headers: ${table.headers.join(' | ')}`);
          console.log(`${'─'.repeat(70)}`);
        }

        // Afficher TOUTES les lignes pour voir les déclinaisons
        table.rows.forEach((row: string[], i: number) => {
          console.log(`${String(i + 1).padStart(2)}. ${row.join(' | ')}`);
        });
      });
    }

    // Chercher les infos de classification
    console.log(`\n\n📊 INFORMATIONS POUR CLASSIFICATION:`);
    console.log(`${'='.repeat(70)}`);

    const classificationInfo = await page.evaluate(() => {
      const info: any = {};
      const bodyText = document.body.innerText;

      // Chercher code coloris pattern (ex: N105, 0720, H1180)
      const colorisMatches = bodyText.match(/\b([A-Z]?\d{3,5})\b/g);
      info.codesColoris = colorisMatches ? Array.from(new Set(colorisMatches)).slice(0, 10) : [];

      // Chercher certification (FSC, PEFC, etc)
      const certifMatch = bodyText.match(/FSC[^,\.\n]{0,20}|PEFC|E1|certification/gi);
      info.certification = certifMatch || [];

      // Chercher finition
      const finitionMatch = bodyText.match(/finition[:\s]+([^\n,\.]{3,30})/gi);
      info.finition = finitionMatch || [];

      return info;
    });

    console.log(`Codes trouvés (coloris potentiels): ${classificationInfo.codesColoris.join(', ')}`);
    console.log(`Certifications: ${classificationInfo.certification.join(', ') || 'N/A'}`);
    console.log(`Finitions: ${classificationInfo.finition.join(', ') || 'N/A'}`);
  }

  console.log('\n\n✅ Analyse terminée!');
  console.log('\n💡 RECOMMANDATION:');
  console.log('Le scraping devra extraire pour CHAQUE déclinaison:');
  console.log('  - Code produit (ex: 80193)');
  console.log('  - Code coloris (ex: 0720, N105)');
  console.log('  - Dimensions (longueur x largeur x épaisseur)');
  console.log('  - Stock');
  console.log('  - Prix');
  console.log('  - Certification');
}

analyzeCompactPage()
  .catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });
