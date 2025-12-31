/**
 * Analyse la structure HTML d'une page B comme Bois
 * pour comprendre comment scraper les données
 */

import puppeteer from 'puppeteer-core';

async function main() {
  const url = process.argv[2] || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html';

  console.log('═'.repeat(70));
  console.log('🔍 ANALYSE STRUCTURE PAGE B COMME BOIS');
  console.log('═'.repeat(70));
  console.log(`\n📍 URL: ${url}\n`);

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    console.log('✅ Chrome connecté\n');
  } catch (e) {
    console.error('❌ Chrome non connecté');
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll pour charger le contenu lazy
  await page.evaluate(async () => {
    for (let i = 0; i < 5; i++) {
      window.scrollBy(0, 2000);
      await new Promise(r => setTimeout(r, 500));
    }
    window.scrollTo(0, 0);
  });

  await new Promise(r => setTimeout(r, 2000));

  const analysis = await page.evaluate(() => {
    const result: any = {
      pageTitle: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      productWrappers: [],
      tables: [],
      allClasses: new Set<string>()
    };

    // Chercher les product-wrapper (comme #product-wrapper-13381)
    const wrappers = document.querySelectorAll('[id^="product-wrapper"]');
    console.log('Found wrappers:', wrappers.length);

    wrappers.forEach((wrapper, idx) => {
      if (idx > 3) return; // Limiter à 4 exemples

      const wrapperData: any = {
        id: wrapper.id,
        classes: wrapper.className,
        children: []
      };

      // Analyser la structure interne
      const productName = wrapper.querySelector('.product-item-name, .product-name, h2, h3, .title');
      wrapperData.productName = productName?.textContent?.trim();

      // Chercher le numéro/code
      const codeEl = wrapper.querySelector('.product-sku, .sku, .code, .reference');
      wrapperData.code = codeEl?.textContent?.trim();

      // Chercher les tableaux
      const tables = wrapper.querySelectorAll('table');
      tables.forEach(table => {
        const tableData: any = {
          headers: [],
          rows: []
        };

        // Headers
        table.querySelectorAll('thead th').forEach(th => {
          tableData.headers.push(th.textContent?.trim());
        });

        // Rows (max 2)
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, rowIdx) => {
          if (rowIdx > 1) return;
          const rowData: string[] = [];
          row.querySelectorAll('td').forEach(td => {
            // Inclure le HTML pour voir la structure du stock
            rowData.push(td.innerHTML.substring(0, 200));
          });
          tableData.rows.push(rowData);
        });

        wrapperData.tables = wrapperData.tables || [];
        wrapperData.tables.push(tableData);
      });

      // Chercher les sections (MÉLAMINÉ, STRATIFIÉ, etc.)
      const sections = wrapper.querySelectorAll('.product-section, .variant-section, h4, h5');
      wrapperData.sections = [];
      sections.forEach(s => {
        wrapperData.sections.push(s.textContent?.trim());
      });

      result.productWrappers.push(wrapperData);
    });

    // Chercher TOUS les tableaux de la page
    document.querySelectorAll('table').forEach((table, idx) => {
      if (idx > 5) return;

      const tableInfo: any = {
        parent: table.parentElement?.className,
        headers: [],
        sampleRow: []
      };

      table.querySelectorAll('thead th').forEach(th => {
        tableInfo.headers.push(th.textContent?.trim());
      });

      const firstRow = table.querySelector('tbody tr');
      if (firstRow) {
        firstRow.querySelectorAll('td').forEach(td => {
          tableInfo.sampleRow.push({
            text: td.textContent?.trim().substring(0, 50),
            html: td.innerHTML.substring(0, 150)
          });
        });
      }

      result.tables.push(tableInfo);
    });

    // Chercher les éléments avec "stock" dans la classe ou l'ID
    const stockElements = document.querySelectorAll('[class*="stock"], [id*="stock"]');
    result.stockElements = [];
    stockElements.forEach((el, idx) => {
      if (idx > 5) return;
      result.stockElements.push({
        tag: el.tagName,
        class: el.className,
        id: el.id,
        html: el.innerHTML.substring(0, 200)
      });
    });

    return result;
  });

  console.log('📄 PAGE:');
  console.log(`   Titre: ${analysis.pageTitle}`);
  console.log(`   H1: ${analysis.h1}`);

  console.log(`\n📦 PRODUCT WRAPPERS (${analysis.productWrappers.length} trouvés):`);
  analysis.productWrappers.forEach((w: any, i: number) => {
    console.log(`\n   [${i + 1}] ID: ${w.id}`);
    console.log(`       Nom: ${w.productName || '(non trouvé)'}`);
    console.log(`       Code: ${w.code || '(non trouvé)'}`);
    console.log(`       Sections: ${w.sections?.join(', ') || '(aucune)'}`);

    if (w.tables && w.tables.length > 0) {
      console.log(`       Tables: ${w.tables.length}`);
      w.tables.forEach((t: any, ti: number) => {
        console.log(`         Table ${ti + 1} headers: ${t.headers.join(' | ')}`);
        if (t.rows[0]) {
          console.log(`         Exemple ligne: ${t.rows[0].map((c: string) => c.substring(0, 30)).join(' | ')}`);
        }
      });
    }
  });

  console.log(`\n📊 TABLES GLOBALES (${analysis.tables.length}):`);
  analysis.tables.forEach((t: any, i: number) => {
    console.log(`\n   [${i + 1}] Parent: ${t.parent}`);
    console.log(`       Headers: ${t.headers.join(' | ')}`);
    if (t.sampleRow.length > 0) {
      console.log(`       Exemple:`);
      t.sampleRow.forEach((cell: any, ci: number) => {
        console.log(`         Col ${ci}: ${cell.text}`);
      });
    }
  });

  console.log(`\n🏷️ ÉLÉMENTS STOCK (${analysis.stockElements?.length || 0}):`);
  analysis.stockElements?.forEach((el: any, i: number) => {
    console.log(`   [${i + 1}] <${el.tag}> class="${el.class}"`);
    console.log(`       HTML: ${el.html.substring(0, 100)}...`);
  });

  console.log('\n' + '═'.repeat(70));

  await browser.disconnect();
}

main();
