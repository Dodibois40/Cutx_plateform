/**
 * SCRAPING B COMME BOIS V3
 *
 * Basé sur l'analyse réelle de la structure HTML
 *
 * Structure d'un product-wrapper:
 * - <p class="text-primary">005</p> → Ref fabricant
 * - <p>Polyrey noir classique FA</p> → Nom produit
 * - Table avec headers: Long. (m) | Larg. (m) | Haut. (mm) | Qualité/Support | Code | Stock | Prix (HT)
 * - Première cellule de chaque section = type (mélaminé, stratifié, bande de chant)
 * - Spans avec title="En stock chez X" pour les locations
 * - Lien "En savoir +" vers la page détail
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StockLocation {
  location: string;
  inStock: boolean;
}

interface ProductVariant {
  productType: string;        // MELAMINE, STRATIFIE, BANDE_DE_CHANT
  length: number;             // mm
  width: number;              // mm
  thickness: number;          // mm
  supportQuality: string;     // "panneau de particules standard P2"
  supplierCode: string;       // "79133"
  stockStatus: string;        // "EN STOCK" ou "Sur commande"
  stockLocations: StockLocation[];
  price: number | null;
  priceType: 'M2' | 'ML' | 'UNIT';
  isVariableLength: boolean;
}

interface ScrapedProduct {
  wrapperId: string;
  manufacturerRef: string;    // "005"
  name: string;               // "Polyrey noir classique FA"
  imageUrl: string | null;
  detailPageUrl: string | null;
  variants: ProductVariant[];
  // Données de la page détail (si scrappée)
  decor?: string;
  colorChoice?: string;
  finish?: string;
  certification?: string;
}

/**
 * Scrape tous les produits d'une page catégorie
 */
async function scrapeCategoryPage(page: Page, url: string): Promise<ScrapedProduct[]> {
  console.log(`\n📄 Scraping: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  // Scroll pour charger tous les produits (lazy loading)
  console.log('   Chargement complet de la page...');
  await page.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      window.scrollBy(0, 1000);
      await new Promise(r => setTimeout(r, 300));
    }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 2000));

  const products = await page.evaluate(() => {
    const results: ScrapedProduct[] = [];

    // Trouver tous les product-wrapper avec un ID numérique
    const wrappers = document.querySelectorAll('[id^="product-wrapper-"]');

    wrappers.forEach(wrapper => {
      const wrapperId = wrapper.id;
      if (!wrapperId.match(/product-wrapper-\d+/)) return;

      const product: ScrapedProduct = {
        wrapperId,
        manufacturerRef: '',
        name: '',
        imageUrl: null,
        detailPageUrl: null,
        variants: []
      };

      // === HEADER DU PRODUIT ===
      // Ref fabricant: <p class="text-primary...">005</p>
      const refEl = wrapper.querySelector('p.text-primary');
      product.manufacturerRef = refEl?.textContent?.trim() || '';

      // Nom: le <p> suivant ou dans product-info
      const nameEl = wrapper.querySelector('.product-info p:not(.text-primary):not(.text-gray-400)');
      product.name = nameEl?.textContent?.trim() || '';

      // Image
      const imgEl = wrapper.querySelector('img[alt]') as HTMLImageElement;
      if (imgEl) {
        product.imageUrl = imgEl.src || imgEl.getAttribute('data-src') || null;
      }

      // Lien "En savoir +"
      const detailLink = wrapper.querySelector('a[href*=".html"]:not([href*="#"])');
      if (detailLink) {
        product.detailPageUrl = (detailLink as HTMLAnchorElement).href;
      }

      // === TABLEAU DES VARIANTES ===
      const tables = wrapper.querySelectorAll('table');

      tables.forEach(table => {
        // Le type de produit est dans la première cellule de tbody
        let currentType = 'MELAMINE';

        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length === 0) return;

          // Vérifier si c'est une ligne de type (mélaminé, stratifié, etc.)
          const firstCellText = cells[0]?.textContent?.trim().toLowerCase() || '';
          if (firstCellText.includes('mélaminé') || firstCellText === 'mélaminé') {
            currentType = 'MELAMINE';
            return;
          } else if (firstCellText.includes('stratifié') || firstCellText === 'stratifié') {
            currentType = 'STRATIFIE';
            return;
          } else if (firstCellText.includes('chant') || firstCellText === 'bande de chant') {
            currentType = 'BANDE_DE_CHANT';
            return;
          } else if (firstCellText.includes('compact')) {
            currentType = 'COMPACT';
            return;
          }

          // Vérifier si c'est une ligne d'en-tête
          if (row.querySelector('th')) return;

          // C'est une ligne de données
          // Structure: Long | Larg | Haut | Qualité | Code | Stock | Prix | (bouton)
          if (cells.length < 7) return;

          const variant: ProductVariant = {
            productType: currentType,
            length: 0,
            width: 0,
            thickness: 0,
            supportQuality: '',
            supplierCode: '',
            stockStatus: '',
            stockLocations: [],
            price: null,
            priceType: 'M2',
            isVariableLength: false
          };

          // Parser chaque cellule
          cells.forEach((cell, idx) => {
            const text = cell.textContent?.trim() || '';

            switch (idx) {
              case 0: // Longueur (m)
                if (text.toLowerCase() === 'variable') {
                  variant.isVariableLength = true;
                } else {
                  const val = parseFloat(text.replace(',', '.'));
                  // Si < 100, c'est en mètres, sinon en mm
                  variant.length = val < 100 ? Math.round(val * 1000) : Math.round(val);
                }
                break;

              case 1: // Largeur (m)
                const widthVal = parseFloat(text.replace(',', '.'));
                variant.width = widthVal < 100 ? Math.round(widthVal * 1000) : Math.round(widthVal);
                break;

              case 2: // Hauteur/Épaisseur (mm)
                variant.thickness = parseFloat(text.replace(',', '.')) || 0;
                break;

              case 3: // Qualité/Support
                variant.supportQuality = text;
                break;

              case 4: // Code fournisseur
                variant.supplierCode = text;
                break;

              case 5: // Stock
                variant.stockStatus = text.toUpperCase().includes('STOCK') ? 'EN STOCK' : 'Sur commande';

                // Chercher les indicateurs de stock par location
                const stockSpans = cell.querySelectorAll('span[title]');
                stockSpans.forEach(span => {
                  const title = span.getAttribute('title') || '';
                  if (title.includes('stock')) {
                    const location = title.replace('En stock chez ', '').trim();
                    const isHidden = span.classList.contains('hidden') ||
                                    span.classList.contains('opacity-0');
                    variant.stockLocations.push({
                      location,
                      inStock: !isHidden
                    });
                  }
                });
                break;

              case 6: // Prix
                const priceMatch = text.match(/([\d,\.]+)/);
                if (priceMatch) {
                  variant.price = parseFloat(priceMatch[1].replace(',', '.'));
                }
                // Type de prix
                if (text.toLowerCase().includes('/ml')) {
                  variant.priceType = 'ML';
                } else if (text.toLowerCase().includes('/m2') || text.toLowerCase().includes('€/m²')) {
                  variant.priceType = 'M2';
                } else {
                  variant.priceType = 'UNIT';
                }
                break;
            }
          });

          // Ne garder que les variantes avec un code
          if (variant.supplierCode) {
            product.variants.push(variant);
          }
        });
      });

      // Ne garder que les produits avec des variantes
      if (product.variants.length > 0) {
        results.push(product);
      }
    });

    return results;
  });

  console.log(`   ✅ ${products.length} produits trouvés`);
  return products;
}

/**
 * Scrape les détails d'une page produit
 */
async function scrapeProductDetails(page: Page, url: string): Promise<{
  decor?: string;
  colorChoice?: string;
  finish?: string;
  certification?: string;
} | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    return await page.evaluate(() => {
      const result: any = {};

      // Chercher les caractéristiques techniques
      const rows = document.querySelectorAll('table tr, .product-attribute, .additional-attributes tr');
      rows.forEach(row => {
        const label = row.querySelector('th, .label, td:first-child')?.textContent?.toLowerCase().trim() || '';
        const value = row.querySelector('td:last-child, .value, td:nth-child(2)')?.textContent?.trim() || '';

        if (label.includes('décor') || label.includes('essence')) {
          result.decor = value;
        } else if (label.includes('coloris') || label.includes('choix')) {
          result.colorChoice = value;
        } else if (label.includes('finition')) {
          result.finish = value;
        } else if (label.includes('certification')) {
          result.certification = value;
        }
      });

      return result;
    });
  } catch (e) {
    return null;
  }
}

/**
 * Test sur une seule page
 */
async function testSinglePage(categoryUrl: string) {
  console.log('═'.repeat(70));
  console.log('🧪 TEST SCRAPING V3 - UNE PAGE');
  console.log('═'.repeat(70));

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    console.log('✅ Chrome connecté');
  } catch (e) {
    console.error('❌ Chrome non connecté. Lancez: scripts/launch-chrome-debug.bat');
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  const products = await scrapeCategoryPage(page, categoryUrl);

  // Afficher les résultats détaillés
  console.log('\n' + '═'.repeat(70));
  console.log(`📊 RÉSULTATS: ${products.length} produits`);
  console.log('═'.repeat(70));

  // Afficher les 3 premiers produits en détail
  products.slice(0, 3).forEach((p, i) => {
    console.log(`\n[${i + 1}] ${p.manufacturerRef} - ${p.name}`);
    console.log(`    Image: ${p.imageUrl ? '✅' : '❌'}`);
    console.log(`    Détail: ${p.detailPageUrl || '(non trouvé)'}`);
    console.log(`    Variantes: ${p.variants.length}`);

    p.variants.forEach((v, vi) => {
      console.log(`\n    [${vi + 1}] ${v.productType}`);
      console.log(`        Code: ${v.supplierCode}`);
      console.log(`        Dimensions: ${v.length}x${v.width}mm, ép. ${v.thickness}mm`);
      console.log(`        Support: ${v.supportQuality}`);
      console.log(`        Stock: ${v.stockStatus}`);
      if (v.stockLocations.length > 0) {
        console.log(`        Locations: ${v.stockLocations.map(l => `${l.location}(${l.inStock ? '✓' : '✗'})`).join(', ')}`);
      }
      console.log(`        Prix: ${v.price ? v.price + '€/' + v.priceType : '(non trouvé)'}`);
    });
  });

  // Stats globales
  console.log('\n' + '═'.repeat(70));
  console.log('📈 STATISTIQUES');
  console.log('═'.repeat(70));

  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);
  const withPrice = products.reduce((sum, p) => sum + p.variants.filter(v => v.price).length, 0);
  const withStock = products.reduce((sum, p) => sum + p.variants.filter(v => v.stockStatus === 'EN STOCK').length, 0);
  const withDimensions = products.reduce((sum, p) => sum + p.variants.filter(v => v.length > 0 && v.width > 0).length, 0);

  console.log(`   Produits: ${products.length}`);
  console.log(`   Variantes totales: ${totalVariants}`);
  console.log(`   Avec prix: ${withPrice} (${((withPrice/totalVariants)*100).toFixed(1)}%)`);
  console.log(`   En stock: ${withStock} (${((withStock/totalVariants)*100).toFixed(1)}%)`);
  console.log(`   Avec dimensions: ${withDimensions} (${((withDimensions/totalVariants)*100).toFixed(1)}%)`);

  await browser.disconnect();
}

// Exécution
const testUrl = process.argv[2] || 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html';
testSinglePage(testUrl);
