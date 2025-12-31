/**
 * Analyse la structure d'une page produit B comme Bois
 * pour comprendre comment récupérer toutes les dimensions
 */

import puppeteer from 'puppeteer-core';

async function main() {
  console.log('🔍 ANALYSE STRUCTURE PAGES PRODUITS B COMME BOIS');
  console.log('='.repeat(60));

  // Connexion Chrome
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Chrome non connecté. Lancez: scripts/launch-chrome-debug.bat');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  // D'abord, aller sur la page agencement pour trouver les vrais liens produits
  console.log('\n📂 Navigation vers /agencement/stratifies-melamines-compacts-chants.html...');
  await page.goto('https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants.html', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  await new Promise(r => setTimeout(r, 3000));

  // Récupérer quelques liens produits de la page
  const productUrls = await page.evaluate(() => {
    const links: string[] = [];
    document.querySelectorAll('a.product-item-link, a[href*=".html"]').forEach(el => {
      const href = (el as HTMLAnchorElement).href;
      if (href && href.includes('bcommebois.fr') && !href.includes('/agencement') && href.endsWith('.html')) {
        // C'est probablement un lien produit
        if (!links.includes(href)) {
          links.push(href);
        }
      }
    });
    return links.slice(0, 5); // Prendre 5 premiers liens
  });

  console.log(`\n📋 ${productUrls.length} liens produits trouvés:`);
  productUrls.forEach(u => console.log(`   - ${u}`));

  if (productUrls.length === 0) {
    console.log('\n⚠️ Aucun lien produit trouvé. Vérifions la page actuelle...');

    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyLength: document.body.innerText.length,
        hasProducts: document.querySelectorAll('.product-item, .product-items').length,
        allLinks: Array.from(document.querySelectorAll('a')).slice(0, 20).map(a => a.href)
      };
    });

    console.log(`   URL: ${pageInfo.url}`);
    console.log(`   Titre: ${pageInfo.title}`);
    console.log(`   Longueur body: ${pageInfo.bodyLength}`);
    console.log(`   Éléments produits: ${pageInfo.hasProducts}`);
    console.log(`   Premiers liens:`);
    pageInfo.allLinks.forEach(l => console.log(`      ${l}`));

    await browser.disconnect();
    return;
  }

  for (const url of productUrls) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 Analyse: ${url}`);
    console.log(`${'─'.repeat(60)}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const analysis = await page.evaluate(() => {
        const result: any = {
          title: '',
          tables: [],
          specifications: [],
          attributes: [],
          allText: '',
        };

        // Titre
        const titleEl = document.querySelector('h1.page-title span, h1.product-name, .product-info-main h1 span');
        result.title = titleEl?.textContent?.trim() || '';

        // Trouver tous les tableaux
        document.querySelectorAll('table').forEach((table, idx) => {
          const tableData: any = {
            index: idx,
            headers: [],
            rows: [],
            classes: table.className,
          };

          // Headers
          table.querySelectorAll('thead th, thead td').forEach(th => {
            tableData.headers.push(th.textContent?.trim());
          });

          // Si pas de thead, prendre la première ligne
          if (tableData.headers.length === 0) {
            const firstRow = table.querySelector('tr');
            if (firstRow) {
              firstRow.querySelectorAll('th, td').forEach(cell => {
                const text = cell.textContent?.trim();
                if (text && (
                  text.toLowerCase().includes('longueur') ||
                  text.toLowerCase().includes('largeur') ||
                  text.toLowerCase().includes('épaisseur') ||
                  text.toLowerCase().includes('epaisseur') ||
                  text.toLowerCase().includes('code') ||
                  text.toLowerCase().includes('réf') ||
                  text.toLowerCase().includes('prix') ||
                  text.toLowerCase().includes('stock')
                )) {
                  tableData.headers.push(text);
                }
              });
            }
          }

          // Rows (limiter à 3 pour l'analyse)
          let rowCount = 0;
          table.querySelectorAll('tbody tr, tr').forEach(row => {
            if (rowCount >= 3) return;
            const cells: string[] = [];
            row.querySelectorAll('td').forEach(cell => {
              cells.push(cell.textContent?.trim() || '');
            });
            if (cells.length > 0 && cells.some(c => c)) {
              tableData.rows.push(cells);
              rowCount++;
            }
          });

          if (tableData.rows.length > 0) {
            result.tables.push(tableData);
          }
        });

        // Chercher les spécifications/attributs du produit
        const specSelectors = [
          '.product-attributes',
          '.additional-attributes',
          '.product-info-main .product-attributes',
          '.product.attribute',
          '[class*="specification"]',
          '[class*="attribute"]',
          '.data.item.content',
        ];

        for (const sel of specSelectors) {
          document.querySelectorAll(sel).forEach(el => {
            const label = el.querySelector('.label, .type, dt')?.textContent?.trim();
            const value = el.querySelector('.value, .data, dd')?.textContent?.trim();
            if (label && value) {
              result.specifications.push({ label, value });
            }
          });
        }

        // Chercher les dimensions dans le texte
        const bodyText = document.body.innerText;

        // Patterns pour dimensions
        const patterns = [
          /longueur\s*:?\s*(\d+)\s*(?:mm|cm|m)?/gi,
          /largeur\s*:?\s*(\d+)\s*(?:mm|cm|m)?/gi,
          /[ée]paisseur\s*:?\s*(\d+(?:[,\.]\d+)?)\s*(?:mm)?/gi,
          /(\d{3,4})\s*x\s*(\d{3,4})\s*(?:x\s*(\d+(?:[,\.]\d+)?))?\s*mm/gi,
          /dimensions?\s*:?\s*(\d+)\s*x\s*(\d+)/gi,
        ];

        const matches: string[] = [];
        for (const pattern of patterns) {
          const m = bodyText.match(pattern);
          if (m) matches.push(...m.slice(0, 3));
        }
        result.dimensionMatches = matches;

        // Chercher un sélecteur de variantes (dropdown)
        const variantSelectors = document.querySelectorAll('select[id*="attribute"], select[id*="super"], .swatch-attribute');
        result.variantSelectors = [];
        variantSelectors.forEach(sel => {
          const options: string[] = [];
          sel.querySelectorAll('option').forEach(opt => {
            const text = opt.textContent?.trim();
            if (text && text !== 'Choisir une option') {
              options.push(text);
            }
          });
          if (options.length > 0) {
            result.variantSelectors.push({
              id: (sel as HTMLElement).id,
              className: (sel as HTMLElement).className,
              options: options.slice(0, 5),
            });
          }
        });

        return result;
      });

      console.log(`\n📋 Titre: ${analysis.title}`);

      console.log(`\n📊 Tableaux trouvés: ${analysis.tables.length}`);
      for (const table of analysis.tables) {
        console.log(`   Table #${table.index}:`);
        console.log(`      Classes: ${table.classes}`);
        console.log(`      Headers: ${JSON.stringify(table.headers)}`);
        console.log(`      Exemple lignes:`);
        for (const row of table.rows) {
          console.log(`         ${JSON.stringify(row)}`);
        }
      }

      console.log(`\n📝 Spécifications: ${analysis.specifications.length}`);
      for (const spec of analysis.specifications.slice(0, 10)) {
        console.log(`   - ${spec.label}: ${spec.value}`);
      }

      console.log(`\n🔍 Dimensions trouvées dans le texte:`);
      for (const match of analysis.dimensionMatches || []) {
        console.log(`   - ${match}`);
      }

      console.log(`\n🎛️ Sélecteurs de variantes: ${analysis.variantSelectors?.length || 0}`);
      for (const vs of analysis.variantSelectors || []) {
        console.log(`   - ID: ${vs.id}, Class: ${vs.className}`);
        console.log(`     Options: ${vs.options.join(', ')}`);
      }

    } catch (err) {
      console.error(`   ❌ Erreur: ${(err as Error).message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Analyse terminée');
  await browser.disconnect();
}

main();
