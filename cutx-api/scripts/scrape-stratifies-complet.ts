/**
 * SCRAPING COMPLET - Stratifiés Mélaminés Compacts Chants
 *
 * Scrape toutes les sous-catégories et sauvegarde en base
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sous-catégories à scraper
const SUBCATEGORIES = [
  { name: 'Unis', slug: 'unis', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/unis.html' },
  { name: 'Bois', slug: 'bois', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/bois.html' },
  { name: 'Fantaisies', slug: 'fantaisies', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/fantaisies.html' },
  { name: 'Pierres', slug: 'pierres', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/pierres.html' },
  { name: 'Métaux', slug: 'metaux', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/metaux.html' },
  { name: 'Matières', slug: 'matieres', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/matieres.html' },
  { name: 'Fenix', slug: 'fenix', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/fenix.html' },
  { name: 'Panneaux polymère et acrylique', slug: 'panneaux-polymere-acrylique', url: 'https://www.bcommebois.fr/agencement/stratifies-melamines-compacts-chants/panneaux-polymere-acrylique.html' },
];

interface StockLocation {
  location: string;
  inStock: boolean;
}

interface ProductVariant {
  productType: string;
  length: number;
  width: number;
  thickness: number;
  supportQuality: string;
  supplierCode: string;
  stockStatus: string;
  stockLocations: StockLocation[];
  price: number | null;
  priceType: 'M2' | 'ML' | 'UNIT';
  isVariableLength: boolean;
}

interface ScrapedProduct {
  wrapperId: string;
  manufacturerRef: string;
  name: string;
  imageUrl: string | null;
  detailPageUrl: string | null;
  variants: ProductVariant[];
}

/**
 * Scrape tous les produits d'une page catégorie
 */
async function scrapeCategoryPage(page: Page, url: string): Promise<ScrapedProduct[]> {
  console.log(`   📄 ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`   ❌ Timeout ou erreur de chargement`);
    return [];
  }

  await new Promise(r => setTimeout(r, 2000));

  // Scroll pour charger tous les produits
  await page.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      window.scrollBy(0, 800);
      await new Promise(r => setTimeout(r, 200));
    }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 1500));

  const products = await page.evaluate(() => {
    const results: ScrapedProduct[] = [];
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

      // Ref fabricant
      const refEl = wrapper.querySelector('p.text-primary');
      product.manufacturerRef = refEl?.textContent?.trim() || '';

      // Nom
      const nameEl = wrapper.querySelector('.product-info p:not(.text-primary):not(.text-gray-400)');
      product.name = nameEl?.textContent?.trim() || '';

      // Image
      const imgEl = wrapper.querySelector('img[alt]') as HTMLImageElement;
      if (imgEl) {
        product.imageUrl = imgEl.src || imgEl.getAttribute('data-src') || null;
      }

      // Lien détail
      const detailLink = wrapper.querySelector('a[href$=".html"]:not([href*="#"])');
      if (detailLink) {
        product.detailPageUrl = (detailLink as HTMLAnchorElement).href;
      }

      // Tableau des variantes
      const tables = wrapper.querySelectorAll('table');
      let currentType = 'MELAMINE';

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length === 0) return;

          const firstCellText = cells[0]?.textContent?.trim().toLowerCase() || '';

          // Détecter le type de produit
          if (firstCellText.includes('mélaminé')) {
            currentType = 'MELAMINE';
            return;
          } else if (firstCellText.includes('stratifié')) {
            currentType = 'STRATIFIE';
            return;
          } else if (firstCellText.includes('chant')) {
            currentType = 'BANDE_DE_CHANT';
            return;
          } else if (firstCellText.includes('compact')) {
            currentType = 'COMPACT';
            return;
          }

          // Ignorer les headers
          if (row.querySelector('th')) return;
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

          cells.forEach((cell, idx) => {
            const text = cell.textContent?.trim() || '';

            switch (idx) {
              case 0:
                if (text.toLowerCase() === 'variable') {
                  variant.isVariableLength = true;
                } else {
                  const val = parseFloat(text.replace(',', '.'));
                  variant.length = val < 100 ? Math.round(val * 1000) : Math.round(val);
                }
                break;
              case 1:
                const widthVal = parseFloat(text.replace(',', '.'));
                variant.width = widthVal < 100 ? Math.round(widthVal * 1000) : Math.round(widthVal);
                break;
              case 2:
                variant.thickness = parseFloat(text.replace(',', '.')) || 0;
                break;
              case 3:
                variant.supportQuality = text;
                break;
              case 4:
                variant.supplierCode = text;
                break;
              case 5:
                variant.stockStatus = text.toUpperCase().includes('STOCK') ? 'EN STOCK' : 'Sur commande';
                const stockSpans = cell.querySelectorAll('span[title]');
                stockSpans.forEach(span => {
                  const title = span.getAttribute('title') || '';
                  if (title.includes('stock')) {
                    const location = title.replace('En stock chez ', '').trim();
                    const isHidden = span.classList.contains('hidden') || span.classList.contains('opacity-0');
                    variant.stockLocations.push({ location, inStock: !isHidden });
                  }
                });
                break;
              case 6:
                const priceMatch = text.match(/([\d,\.]+)/);
                if (priceMatch) {
                  variant.price = parseFloat(priceMatch[1].replace(',', '.'));
                }
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

          if (variant.supplierCode) {
            product.variants.push(variant);
          }
        });
      });

      if (product.variants.length > 0) {
        results.push(product);
      }
    });

    return results;
  });

  console.log(`      ✅ ${products.length} produits, ${products.reduce((s, p) => s + p.variants.length, 0)} variantes`);
  return products;
}

/**
 * Sauvegarde un produit et ses variantes en base
 */
async function saveProduct(
  product: ScrapedProduct,
  catalogueId: string,
  categoryId: string,
  subcategorySlug: string
): Promise<number> {
  let saved = 0;

  for (const variant of product.variants) {
    const reference = `BCB-${variant.supplierCode}`;

    try {
      await prisma.panel.upsert({
        where: {
          catalogueId_reference: {
            catalogueId,
            reference
          }
        },
        update: {
          name: `${product.name} ${variant.thickness}mm ${variant.productType}`,
          manufacturerRef: product.manufacturerRef,
          supplierCode: variant.supplierCode,
          defaultLength: variant.length,
          defaultWidth: variant.width,
          thickness: variant.thickness > 0 ? [variant.thickness] : [],
          defaultThickness: variant.thickness,
          supportQuality: variant.supportQuality,
          productType: variant.productType,
          pricePerM2: variant.priceType === 'M2' ? variant.price : null,
          pricePerMl: variant.priceType === 'ML' ? variant.price : null,
          pricePerUnit: variant.priceType === 'UNIT' ? variant.price : null,
          stockStatus: variant.stockStatus,
          stockLocations: JSON.stringify(variant.stockLocations),
          imageUrl: product.imageUrl,
          isVariableLength: variant.isVariableLength,
          decor: subcategorySlug,
          isActive: true,
          categoryId
        },
        create: {
          reference,
          name: `${product.name} ${variant.thickness}mm ${variant.productType}`,
          manufacturerRef: product.manufacturerRef,
          supplierCode: variant.supplierCode,
          defaultLength: variant.length,
          defaultWidth: variant.width,
          thickness: variant.thickness > 0 ? [variant.thickness] : [],
          defaultThickness: variant.thickness,
          supportQuality: variant.supportQuality,
          productType: variant.productType,
          pricePerM2: variant.priceType === 'M2' ? variant.price : null,
          pricePerMl: variant.priceType === 'ML' ? variant.price : null,
          pricePerUnit: variant.priceType === 'UNIT' ? variant.price : null,
          stockStatus: variant.stockStatus,
          stockLocations: JSON.stringify(variant.stockLocations),
          imageUrl: product.imageUrl,
          isVariableLength: variant.isVariableLength,
          decor: subcategorySlug,
          isActive: true,
          catalogueId,
          categoryId
        }
      });
      saved++;
    } catch (e) {
      // Ignorer les erreurs de doublon
    }
  }

  return saved;
}

async function main() {
  console.log('═'.repeat(70));
  console.log('🚀 SCRAPING COMPLET - STRATIFIÉS MÉLAMINÉS COMPACTS CHANTS');
  console.log('═'.repeat(70));

  // Connexion Chrome
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    console.log('✅ Chrome connecté\n');
  } catch (e) {
    console.error('❌ Chrome non connecté. Lancez: scripts/launch-chrome-debug.bat');
    return;
  }

  // Récupérer le catalogue
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.error('❌ Catalogue Bouney non trouvé');
    await browser.disconnect();
    return;
  }

  // Récupérer la catégorie parente
  const parentCategory = await prisma.category.findFirst({
    where: {
      catalogueId: catalogue.id,
      slug: 'stratifies-melamines-compacts-chants'
    }
  });

  if (!parentCategory) {
    console.error('❌ Catégorie parente non trouvée');
    await browser.disconnect();
    return;
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  const stats = {
    totalProducts: 0,
    totalVariants: 0,
    savedPanels: 0,
    errors: 0
  };

  // Parcourir chaque sous-catégorie
  for (const subcat of SUBCATEGORIES) {
    console.log(`\n📂 ${subcat.name}`);

    // Trouver ou créer la sous-catégorie
    let category = await prisma.category.findFirst({
      where: {
        catalogueId: catalogue.id,
        slug: subcat.slug,
        parentId: parentCategory.id
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: subcat.name,
          slug: subcat.slug,
          catalogueId: catalogue.id,
          parentId: parentCategory.id
        }
      });
      console.log(`   ✨ Catégorie créée: ${subcat.name}`);
    }

    // Scraper la page
    const products = await scrapeCategoryPage(page, subcat.url);
    stats.totalProducts += products.length;
    stats.totalVariants += products.reduce((s, p) => s + p.variants.length, 0);

    // Sauvegarder les produits
    for (const product of products) {
      const saved = await saveProduct(product, catalogue.id, category.id, subcat.slug);
      stats.savedPanels += saved;
    }

    console.log(`   💾 ${stats.savedPanels} panneaux sauvegardés au total`);

    // Pause entre les pages
    await new Promise(r => setTimeout(r, 1000));
  }

  // Stats finales
  console.log('\n' + '═'.repeat(70));
  console.log('📊 RÉSULTAT FINAL');
  console.log('═'.repeat(70));
  console.log(`   Catégories scrapées: ${SUBCATEGORIES.length}`);
  console.log(`   Produits trouvés: ${stats.totalProducts}`);
  console.log(`   Variantes totales: ${stats.totalVariants}`);
  console.log(`   Panneaux sauvegardés: ${stats.savedPanels}`);

  // Vérification en base
  const dbCount = await prisma.panel.count({
    where: { catalogueId: catalogue.id }
  });
  console.log(`   Panneaux en base: ${dbCount}`);

  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Erreur:', e);
  process.exit(1);
});
