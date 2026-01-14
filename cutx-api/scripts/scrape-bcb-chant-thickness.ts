/**
 * SCRAPE BCB CHANT THICKNESS
 * Récupère l'épaisseur des bandes de chant depuis les pages produits Bouney
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extraire l'épaisseur depuis une page produit
 */
async function extractThickness(page: Page, url: string): Promise<{ codes: string[]; thickness: number | null }> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    const data = await page.evaluate(() => {
      const codes: string[] = [];
      let thickness: number | null = null;

      // Extract reference from URL
      const urlMatch = window.location.href.match(/-(\d{5,6})\.html$/);
      if (urlMatch) codes.push(urlMatch[1]);

      // Get page text for analysis
      const pageText = document.body.innerText || '';

      // Look for thickness in characteristics
      // Pattern: "Hauteur (mm)" followed by value like "0.8" or "1" or "2"
      const hauteurMatch = pageText.match(/Hauteur\s*\(mm\)\s*[\n\r]+\s*([\d.,]+)/i);
      if (hauteurMatch) {
        thickness = parseFloat(hauteurMatch[1].replace(',', '.'));
      }

      // Alternative: look for thickness in format "23x0.8" or "0,8mm"
      if (!thickness) {
        const thicknessMatch = pageText.match(/(\d+)\s*[x×]\s*([\d.,]+)\s*mm/i);
        if (thicknessMatch) {
          thickness = parseFloat(thicknessMatch[2].replace(',', '.'));
        }
      }

      // Alternative: look for "épaisseur" or "ép."
      if (!thickness) {
        const epMatch = pageText.match(/[ée]p(?:aisseur)?\.?\s*[:\s]*([\d.,]+)\s*mm/i);
        if (epMatch) {
          thickness = parseFloat(epMatch[1].replace(',', '.'));
        }
      }

      // Find codes in tables
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          cells.forEach(cell => {
            const text = cell.textContent?.trim() || '';
            const codeMatch = text.match(/^\s*(\d{5,6})\s*$/);
            if (codeMatch) {
              codes.push(codeMatch[1]);
            }
          });

          // Also look for thickness in table cells (often in mm)
          if (!thickness) {
            const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');
            for (const text of cellTexts) {
              // Look for small values that could be thickness (0.4 to 3mm range)
              const numMatch = text.match(/^([\d.,]+)$/);
              if (numMatch) {
                const val = parseFloat(numMatch[1].replace(',', '.'));
                if (val >= 0.4 && val <= 3) {
                  thickness = val;
                  break;
                }
              }
            }
          }
        });
      });

      return { codes: [...new Set(codes)], thickness };
    });

    return data;

  } catch (err) {
    return { codes: [], thickness: null };
  }
}

/**
 * Get product links from category page
 */
async function getProductLinks(page: Page, url: string): Promise<string[]> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to load all
  let previousHeight = 0;
  let passes = 0;
  while (passes < 30) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) {
      passes++;
      if (passes >= 3) break;
    } else {
      passes = 0;
    }
    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollBy(0, 1000));
    await new Promise(r => setTimeout(r, 300));
  }

  return await page.evaluate(() => {
    const links: string[] = [];
    const wrappers = document.querySelectorAll('[id^="product-wrapper-"]');
    wrappers.forEach(wrapper => {
      const link = wrapper.querySelector('a[href*=".html"]') as HTMLAnchorElement;
      if (link && link.href && !link.href.includes('#')) {
        const href = link.href;
        if (href.includes('bcommebois.fr') && !href.includes('/bois.html') && !href.includes('/unis.html')) {
          links.push(href);
        }
      }
    });
    return [...new Set(links)];
  });
}

async function main() {
  const testMode = process.argv.includes('--test');
  const maxProducts = process.argv.includes('--limit') ?
    parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : 0;

  console.log('═'.repeat(60));
  console.log('🔍 SCRAPE BCB CHANT THICKNESS');
  console.log('═'.repeat(60));
  console.log(`🧪 Mode test: ${testMode ? 'OUI' : 'NON'}`);
  if (maxProducts > 0) console.log(`🔢 Limite: ${maxProducts} produits`);
  console.log('');

  // Connect to Chrome
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Chrome connecté');
  } catch (e) {
    console.error('❌ Chrome non connecté');
    process.exit(1);
  }

  const page = await browser.newPage();

  // Get chants without thickness
  const chantsWithoutThickness = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
      defaultThickness: null,
    },
    select: { id: true, reference: true, supplierCode: true },
  });

  const missingCodes = new Set(chantsWithoutThickness.map(c => c.supplierCode || c.reference.replace('BCB-', '')));
  console.log(`📊 ${chantsWithoutThickness.length} chants sans épaisseur\n`);

  // Get product links from Bois category (where most chants are)
  console.log('📄 Chargement de la catégorie Bois...');
  let productLinks = await getProductLinks(page, 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/bois.html');
  console.log(`   ✅ ${productLinks.length} liens produits`);

  // Also get from Unis
  console.log('📄 Chargement de la catégorie Unis...');
  const unisLinks = await getProductLinks(page, 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html');
  console.log(`   ✅ ${unisLinks.length} liens produits`);

  productLinks = [...new Set([...productLinks, ...unisLinks])];
  console.log(`   📌 Total: ${productLinks.length} liens uniques`);

  if (maxProducts > 0) {
    productLinks = productLinks.slice(0, maxProducts);
    console.log(`   📌 Limité à ${productLinks.length} produits`);
  }

  // Disable trigger
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger`);
  } catch (e) {
    console.log('   ⚠️ Could not disable trigger');
  }

  // Visit each page and extract thickness
  console.log('\n🔍 Extraction des épaisseurs...');
  let updated = 0;
  let skipped = 0;
  let foundThickness = 0;

  for (let i = 0; i < productLinks.length; i++) {
    const url = productLinks[i];
    const shortUrl = url.split('/').pop()?.substring(0, 35) || url;

    const { codes, thickness } = await extractThickness(page, url);

    if (thickness !== null) {
      foundThickness++;

      // Update all matching chants
      for (const code of codes) {
        if (missingCodes.has(code)) {
          const ref = `BCB-${code}`;

          if (!testMode) {
            try {
              await prisma.panel.updateMany({
                where: { reference: ref, defaultThickness: null },
                data: {
                  defaultThickness: thickness,
                  thickness: [thickness],
                },
              });
              updated++;
              missingCodes.delete(code);
              console.log(`   [${i + 1}/${productLinks.length}] ${shortUrl} → ${thickness}mm`);
            } catch (e) {
              // Ignore
            }
          } else {
            console.log(`   [${i + 1}/${productLinks.length}] ${shortUrl} → ${thickness}mm (test)`);
            updated++;
          }
        }
      }
    }

    if ((i + 1) % 50 === 0) {
      console.log(`   ... ${i + 1}/${productLinks.length} pages, ${foundThickness} épaisseurs trouvées`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  // Re-enable trigger
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger`);
  } catch (e) {
    // Ignore
  }

  // Stats
  console.log('\n' + '═'.repeat(60));
  console.log('📈 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Pages visitées: ${productLinks.length}`);
  console.log(`   Épaisseurs trouvées: ${foundThickness}`);
  console.log(`   Chants mis à jour: ${updated}`);
  console.log(`   Chants toujours sans épaisseur: ${missingCodes.size}`);

  await page.close();
  await browser.disconnect();
  await prisma.$disconnect();

  console.log('\n✅ Terminé!');
}

main().catch(console.error);
