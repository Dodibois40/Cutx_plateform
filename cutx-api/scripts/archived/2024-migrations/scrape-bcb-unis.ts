/**
 * SCRAPER BCB - Page Unis (Nouvelle structure 2025)
 *
 * Scrape la page: https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html
 *
 * Structure HTML détectée:
 * - Product wrappers: [id^="product-wrapper-"]
 * - Manufacturer ref: p.text-primary
 * - Name: .product-info p (second p)
 * - Variants in tables with columns: Type | Long. | Larg. | Ep. | Support | Code | Stock | Prix
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductVariant {
  reference: string;
  manufacturerRef: string;
  name: string;
  productType: string;
  length: number;
  width: number;
  thickness: number;
  supportQuality: string;
  pricePerM2: number | null;
  pricePerMl: number | null;
  stockStatus: string;
  imageUrl: string | null;
}

interface ScrapingResult {
  total: number;
  saved: number;
  errors: number;
  products: ProductVariant[];
}

/**
 * Scroll pour charger tous les produits (lazy loading)
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  console.log('   📜 Scroll pour charger tous les produits...');

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

  // Retour en haut
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 1000));

  console.log('   ✅ Scroll terminé');
}

/**
 * Extraire tous les produits de la page
 */
async function extractProducts(page: Page): Promise<ProductVariant[]> {
  return await page.evaluate(() => {
    const results: ProductVariant[] = [];

    // Trouver tous les product-wrapper avec ID numérique
    const wrappers = document.querySelectorAll('[id^="product-wrapper-"]');

    wrappers.forEach(wrapper => {
      const wrapperId = wrapper.id;
      if (!wrapperId.match(/product-wrapper-\d+/)) return;

      // === HEADER DU PRODUIT ===
      // Ref fabricant: <p class="text-primary...">0029</p>
      const refEl = wrapper.querySelector('p.text-primary');
      const manufacturerRef = refEl?.textContent?.trim() || '';

      // Nom: le <p> suivant dans product-info
      const nameEl = wrapper.querySelector('.product-info p:not(.text-primary):not(.text-gray-400)');
      const productName = nameEl?.textContent?.trim() || '';

      // Image
      const imgEl = wrapper.querySelector('img[alt]') as HTMLImageElement;
      let imageUrl: string | null = null;
      if (imgEl) {
        const src = imgEl.src || imgEl.getAttribute('data-src');
        if (src && src.includes('bcommebois') && !src.includes('placeholder')) {
          imageUrl = src;
        }
      }

      // === TABLEAU DES VARIANTES ===
      const tables = wrapper.querySelectorAll('table');

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');

        rows.forEach(row => {
          // Ignorer les headers
          if (row.querySelector('th')) return;

          const cells = row.querySelectorAll('td');
          if (cells.length < 5) return;

          const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

          // Parser les données
          // Format typique: Type | Long. (m) | Larg. (m) | Haut. (mm) | Support | Code | Stock | Prix
          let productType = '';
          let length = 0;
          let width = 0;
          let thickness = 0;
          let supportQuality = '';
          let code = '';
          let stockStatus = 'Sur commande';
          let pricePerM2: number | null = null;
          let pricePerMl: number | null = null;

          // Déterminer le type à partir de la première cellule
          const firstCell = cellTexts[0].toLowerCase();
          if (firstCell.includes('stratifi')) productType = 'STRATIFIE';
          else if (firstCell.includes('mélamin') || firstCell.includes('melamin')) productType = 'MELAMINE';
          else if (firstCell.includes('compact')) productType = 'COMPACT';
          else if (firstCell.includes('chant')) productType = 'BANDE_DE_CHANT';

          // Parser chaque cellule
          for (let i = 0; i < cellTexts.length; i++) {
            const text = cellTexts[i];
            const numMatch = text.match(/[\d.,]+/);

            // Dimensions (généralement colonnes 1, 2, 3 après le type)
            if (i === 1 && numMatch) {
              const val = parseFloat(numMatch[0].replace(',', '.'));
              // Si < 10, c'est en mètres, convertir en mm
              length = val < 10 ? Math.round(val * 1000) : Math.round(val);
            } else if (i === 2 && numMatch) {
              const val = parseFloat(numMatch[0].replace(',', '.'));
              width = val < 10 ? Math.round(val * 1000) : Math.round(val);
            } else if (i === 3 && numMatch) {
              thickness = parseFloat(numMatch[0].replace(',', '.'));
            }

            // Support/Qualité (contient généralement "panneau", "hpl", etc.)
            if (text.toLowerCase().includes('panneau') ||
                text.toLowerCase().includes('hpl') ||
                text.toLowerCase().includes('support') ||
                text.toLowerCase().includes('particule')) {
              supportQuality = text;
            }

            // Code (5-6 chiffres)
            const codeMatch = text.match(/^\s*(\d{5,6})\s*$/);
            if (codeMatch) {
              code = codeMatch[1];
            }

            // Stock
            if (text.toUpperCase().includes('EN STOCK')) {
              stockStatus = 'EN STOCK';
            } else if (text.toLowerCase().includes('commande')) {
              stockStatus = 'Sur commande';
            }

            // Prix (€)
            if (text.includes('€')) {
              const priceMatch = text.match(/([\d.,]+)\s*€/);
              if (priceMatch) {
                const price = parseFloat(priceMatch[1].replace(',', '.'));
                // Déterminer si c'est m² ou ml
                if (productType === 'BANDE_DE_CHANT') {
                  pricePerMl = price;
                } else {
                  pricePerM2 = price;
                }
              }
            }
          }

          // Sauvegarder si on a un code et des dimensions valides
          if (code && (length > 0 || width > 0)) {
            results.push({
              reference: `BCB-${code}`,
              manufacturerRef,
              name: productName || `${productType} ${code}`,
              productType: productType || 'STRATIFIE',
              length,
              width,
              thickness,
              supportQuality,
              pricePerM2,
              pricePerMl,
              stockStatus,
              imageUrl,
            });
          }
        });
      });
    });

    return results;
  });
}

/**
 * Sauvegarder les produits en base
 */
async function saveProducts(products: ProductVariant[], catalogueId: string): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;

  // Désactiver les triggers
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" DISABLE TRIGGER ALL`);
  } catch (e) {
    console.log('   ⚠️ Could not disable triggers');
  }

  for (const product of products) {
    try {
      await prisma.panel.upsert({
        where: {
          catalogueId_reference: {
            catalogueId,
            reference: product.reference,
          },
        },
        update: {
          name: product.name,
          manufacturerRef: product.manufacturerRef || null,
          productType: product.productType,
          material: product.productType === 'STRATIFIE' ? 'Stratifié' :
                    product.productType === 'MELAMINE' ? 'Mélaminé' :
                    product.productType === 'COMPACT' ? 'Compact' :
                    product.productType === 'BANDE_DE_CHANT' ? 'Chant' : 'Panneau',
          thickness: product.thickness > 0 ? [product.thickness] : [],
          defaultThickness: product.thickness > 0 ? product.thickness : null,
          defaultLength: product.length,
          defaultWidth: product.width,
          pricePerM2: product.pricePerM2,
          pricePerMl: product.pricePerMl,
          stockStatus: product.stockStatus,
          supportQuality: product.supportQuality || null,
          imageUrl: product.imageUrl,
          isActive: true,
        },
        create: {
          reference: product.reference,
          name: product.name,
          manufacturerRef: product.manufacturerRef || null,
          productType: product.productType,
          material: product.productType === 'STRATIFIE' ? 'Stratifié' :
                    product.productType === 'MELAMINE' ? 'Mélaminé' :
                    product.productType === 'COMPACT' ? 'Compact' :
                    product.productType === 'BANDE_DE_CHANT' ? 'Chant' : 'Panneau',
          thickness: product.thickness > 0 ? [product.thickness] : [],
          defaultThickness: product.thickness > 0 ? product.thickness : null,
          defaultLength: product.length,
          defaultWidth: product.width,
          pricePerM2: product.pricePerM2,
          pricePerMl: product.pricePerMl,
          stockStatus: product.stockStatus,
          supportQuality: product.supportQuality || null,
          imageUrl: product.imageUrl,
          isActive: true,
          catalogueId,
        },
      });
      saved++;
    } catch (err) {
      errors++;
      if (errors <= 3) {
        console.log(`   ❌ Error saving ${product.reference}:`, (err as Error).message.substring(0, 100));
      }
    }
  }

  // Réactiver les triggers
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" ENABLE TRIGGER ALL`);
  } catch (e) {
    // Ignore
  }

  return { saved, errors };
}

/**
 * Main
 */
async function main() {
  const url = process.argv[2] || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html';
  const testMode = process.argv.includes('--test');

  console.log('═'.repeat(60));
  console.log('🔄 SCRAPER BCB - Page Unis');
  console.log('═'.repeat(60));
  console.log(`📍 URL: ${url}`);
  console.log(`🧪 Mode test: ${testMode ? 'OUI' : 'NON'}`);
  console.log('');

  // Connexion Chrome
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Chrome connecté');
  } catch (e) {
    console.error('❌ Chrome non connecté. Lancez le fichier launch-chrome-debug.bat');
    process.exit(1);
  }

  // Utiliser l'onglet existant ou en créer un nouveau
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  // Récupérer le catalogue Bouney
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' },
  });

  if (!catalogue) {
    console.error('❌ Catalogue Bouney non trouvé');
    process.exit(1);
  }
  console.log(`📦 Catalogue: ${catalogue.name} (${catalogue.id})`);

  // Naviguer vers la page
  console.log('\n📄 Chargement de la page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll pour charger tous les produits
  await scrollToLoadAll(page);

  // Extraire les produits
  console.log('\n📊 Extraction des produits...');
  const products = await extractProducts(page);
  console.log(`   ✅ ${products.length} variantes extraites`);

  // Afficher quelques exemples
  console.log('\n🔎 Exemples (5 premiers):');
  products.slice(0, 5).forEach((p, i) => {
    console.log(`   [${i + 1}] ${p.reference} - ${p.name.substring(0, 40)}...`);
    console.log(`       Type: ${p.productType} | ${p.length}x${p.width}x${p.thickness}mm`);
    console.log(`       Prix: ${p.pricePerM2 || p.pricePerMl || 'N/A'}€ | Stock: ${p.stockStatus}`);
  });

  // Chercher 79155
  console.log('\n🔍 Recherche de 79155...');
  const found79155 = products.find(p => p.reference.includes('79155'));
  if (found79155) {
    console.log('   ✅ Trouvé:', found79155.reference, '-', found79155.name);
  } else {
    console.log('   ⚠️ Non trouvé dans les variantes extraites');
  }

  // En mode test, ne pas sauvegarder
  if (testMode) {
    console.log('\n🧪 Mode test - pas de sauvegarde');
    console.log(`   Total: ${products.length} variantes prêtes à sauvegarder`);
  } else {
    // Sauvegarder en base
    console.log('\n💾 Sauvegarde en base de données...');
    const result = await saveProducts(products, catalogue.id);
    console.log(`   ✅ ${result.saved} sauvegardées`);
    if (result.errors > 0) {
      console.log(`   ❌ ${result.errors} erreurs`);
    }
  }

  // Stats finales
  console.log('\n' + '═'.repeat(60));
  console.log('📈 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Variantes extraites: ${products.length}`);
  console.log(`   Types: ${[...new Set(products.map(p => p.productType))].join(', ')}`);
  console.log(`   Avec prix: ${products.filter(p => p.pricePerM2 || p.pricePerMl).length}`);
  console.log(`   En stock: ${products.filter(p => p.stockStatus === 'EN STOCK').length}`);

  await browser.disconnect();
  await prisma.$disconnect();

  console.log('\n✅ Terminé!');
}

main().catch(console.error);
