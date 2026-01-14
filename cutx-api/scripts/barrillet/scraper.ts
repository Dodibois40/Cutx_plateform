/**
 * Scraper Barrillet - Module principal
 *
 * Optimisé pour le site barillet-distribution.fr
 * Utilise les données JSON embarquées dans les pages pour une extraction fiable.
 */

import puppeteer, { Page, Browser } from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import { determineProductType, generateReference, BARRILLET_CONFIG } from './config';

const prisma = new PrismaClient();

export interface BarrilletProduct {
  nom: string;
  marque: string;
  refBarrillet: string;
  refMarque: string | null;
  codeEAN: string | null;
  prixM2: number | null;
  prixHT: number | null;
  prixMl: number | null;
  longueur: number;
  largeur: number;
  epaisseur: number;
  couleur: string | null;
  imageUrl: string | null;
  stockStatus: string | null;
  sourceUrl: string;
  categories: string[];
}

export interface ScrapingStats {
  totalProducts: number;
  created: number;
  updated: number;
  errors: number;
  withImages: number;
  withStock: number;
  byCategory: Map<string, number>;
}

/**
 * Parse les dimensions depuis le nom du produit
 * Ex: "30mm 4150x2070mm" -> { epaisseur: 30, longueur: 4150, largeur: 2070 }
 */
function parseDimensionsFromName(name: string): { epaisseur: number; longueur: number; largeur: number } {
  let epaisseur = 0;
  let longueur = 0;
  let largeur = 0;

  // Pattern pour épaisseur: "30mm" ou "19mm"
  const thicknessMatch = name.match(/\b(\d+(?:[,\.]\d+)?)\s*mm\b/i);
  if (thicknessMatch) {
    epaisseur = parseFloat(thicknessMatch[1].replace(',', '.'));
  }

  // Pattern pour dimensions: "4150x2070mm" ou "2800x2070"
  const dimsMatch = name.match(/(\d+)\s*[xX]\s*(\d+)(?:\s*mm)?/);
  if (dimsMatch) {
    longueur = parseInt(dimsMatch[1]);
    largeur = parseInt(dimsMatch[2]);
  }

  return { epaisseur, longueur, largeur };
}

/**
 * Scroll pour charger tous les produits (lazy loading)
 */
export async function scrollToLoadAll(page: Page): Promise<void> {
  try {
    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);
    let attempts = 0;

    while (previousHeight !== currentHeight && attempts < 20) {
      previousHeight = currentHeight;

      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 600;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });

      await new Promise((r) => setTimeout(r, 1000));
      currentHeight = await page.evaluate(() => document.body.scrollHeight);
      attempts++;
    }
  } catch (error) {
    console.log(`   Scroll interrompu: ${(error as Error).message.substring(0, 30)}`);
  }
}

/**
 * Extrait les produits directement depuis la page de liste (sans naviguer vers chaque fiche)
 * Utilise les données JSON embarquées dans la page
 */
export async function scrapeProductsFromListPage(page: Page, url: string): Promise<BarrilletProduct[]> {
  console.log(`   Chargement: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Attendre que les produits soient chargés
    await page.waitForSelector('.product-item, .grid-row', { timeout: 15000 }).catch(() => {});
  } catch (e) {
    console.log(`   Timeout navigation initiale, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 2000));

  const allProducts: BarrilletProduct[] = [];
  let currentPage = 1;
  let consecutiveEmptyPages = 0;

  while (consecutiveEmptyPages < 2) {
    try {
      // Scroll pour charger tous les produits de la page
      await scrollToLoadAll(page);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (scrollErr) {
      console.log(`   Erreur scroll, on continue...`);
    }

    // Extraire les données produits depuis les JSON embarqués
    let pageProducts: any[] = [];
    try {
      pageProducts = await page.evaluate((baseUrl) => {
      const products: any[] = [];

      // Chercher tous les scripts JSON de données produit
      document.querySelectorAll('script[type="application/json"][id^="product-data-"]').forEach((script) => {
        try {
          const data = JSON.parse(script.textContent || '{}');
          const productId = script.id.replace('product-data-', '');

          // Trouver le lien et l'image associés
          const productRow = document.querySelector(`[data-row-id="${productId}"]`);
          let productUrl = '';
          let imageUrl = '';

          if (productRow) {
            const linkEl = productRow.querySelector('.view-product[itemprop="url"], a.product-item__preview');
            if (linkEl) {
              productUrl = (linkEl as HTMLAnchorElement).href;
            }

            const imgEl = productRow.querySelector('.product-item__preview-image');
            if (imgEl) {
              imageUrl = (imgEl as HTMLImageElement).src;
            }

            // Fallback: chercher dans la source webp
            if (!imageUrl) {
              const sourceEl = productRow.querySelector('source[srcset]');
              if (sourceEl) {
                imageUrl = baseUrl + sourceEl.getAttribute('srcset');
              }
            }
          }

          products.push({
            sku: data.sku,
            name: data.name,
            brands: data.brands || [],
            categories: data.categories || [],
            availability_status: data.availability_status,
            price: data.prices?.price || null,
            price_ht: data.prices?.price_ht || null,
            color: data.color || null,
            productUrl: productUrl || '',
            imageUrl: imageUrl || '',
          });
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      });

      return products;
      }, BARRILLET_CONFIG.baseUrl);
    } catch (evalErr) {
      console.log(`   Erreur extraction: ${(evalErr as Error).message.substring(0, 40)}`);
      break;
    }

    // Convertir en BarrilletProduct
    let newCount = 0;
    for (const p of pageProducts) {
      // Vérifier si déjà extrait (par SKU)
      if (allProducts.some(existing => existing.refBarrillet === p.sku)) {
        continue;
      }

      const dims = parseDimensionsFromName(p.name);

      // Calculer le prix au m² à partir du prix HT du panneau
      const surface = (dims.longueur * dims.largeur) / 1_000_000;
      const calculatedPrixM2 = (p.price_ht && surface > 0)
        ? Math.round((p.price_ht / surface) * 100) / 100
        : null;

      allProducts.push({
        nom: p.name,
        marque: p.brands[0] || 'Barrillet',
        refBarrillet: p.sku,
        refMarque: null,
        codeEAN: null,
        prixM2: calculatedPrixM2,
        prixHT: p.price_ht || null,
        prixMl: null,
        longueur: dims.longueur,
        largeur: dims.largeur,
        epaisseur: dims.epaisseur,
        couleur: p.color || null,
        imageUrl: p.imageUrl || null,
        stockStatus: p.availability_status || null,
        sourceUrl: p.productUrl,
        categories: p.categories,
      });
      newCount++;
    }

    console.log(`   Page ${currentPage}: ${pageProducts.length} produits (nouveaux: ${newCount}, total: ${allProducts.length})`);

    if (newCount === 0) {
      consecutiveEmptyPages++;
    } else {
      consecutiveEmptyPages = 0;
    }

    // Chercher et cliquer sur le bouton "Suivant"
    const hasNextPage = await page.evaluate(() => {
      // Chercher le lien de pagination suivante
      const nextLink = document.querySelector('.pagination .oro-pagination__item--next a, a[rel="next"], a.page-next');
      if (nextLink) {
        const rect = nextLink.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          (nextLink as HTMLElement).click();
          return true;
        }
      }

      // Fallback: chercher par texte
      const links = document.querySelectorAll('a, button');
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || '';
        if (text === 'suivant' || text === 'next' || text === '>' || text === '→') {
          const rect = link.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            (link as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });

    if (!hasNextPage) {
      console.log(`   Plus de page suivante`);
      break;
    }

    await new Promise((r) => setTimeout(r, 2500));
    try {
      await page.waitForNetworkIdle({ timeout: 10000 });
    } catch (e) {
      // Timeout OK
    }

    currentPage++;

    if (currentPage > 100) {
      console.log(`   Limite de 100 pages atteinte`);
      break;
    }
  }

  console.log(`   ${allProducts.length} produits extraits sur ${currentPage} pages`);
  return allProducts;
}

/**
 * Méthode legacy: Récupère les liens produits (pour scraping individuel si nécessaire)
 */
export async function getProductLinks(page: Page, url: string): Promise<string[]> {
  console.log(`   Chargement: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`   Timeout navigation initiale, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 3000));

  const allLinks: string[] = [];
  let currentPage = 1;
  let consecutiveEmptyPages = 0;

  while (consecutiveEmptyPages < 2) {
    await scrollToLoadAll(page);
    await new Promise((r) => setTimeout(r, 1000));

    // Extraire les liens produits depuis les cartes
    const pageLinks = await page.evaluate(() => {
      const productLinks: string[] = [];

      // Sélecteur Barrillet: liens dans les cartes produit
      document.querySelectorAll('.product-item .view-product[itemprop="url"], .product-item a.product-item__preview').forEach((el) => {
        const href = (el as HTMLAnchorElement).href;
        if (href && !productLinks.includes(href)) {
          productLinks.push(href);
        }
      });

      return productLinks;
    });

    let newCount = 0;
    for (const link of pageLinks) {
      if (!allLinks.includes(link)) {
        allLinks.push(link);
        newCount++;
      }
    }

    console.log(`   Page ${currentPage}: ${pageLinks.length} produits (nouveaux: ${newCount}, total: ${allLinks.length})`);

    if (newCount === 0) {
      consecutiveEmptyPages++;
    } else {
      consecutiveEmptyPages = 0;
    }

    // Pagination
    const hasNextPage = await page.evaluate(() => {
      const nextLink = document.querySelector('.pagination .oro-pagination__item--next a, a[rel="next"]');
      if (nextLink) {
        (nextLink as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!hasNextPage) break;

    await new Promise((r) => setTimeout(r, 2500));
    currentPage++;
    if (currentPage > 100) break;
  }

  return allLinks;
}

/**
 * Scrape un produit depuis sa fiche (méthode legacy si le JSON n'est pas disponible)
 */
export async function scrapeProduct(page: Page, url: string): Promise<BarrilletProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      const result: Record<string, any> = {};

      // Essayer d'abord le JSON embarqué
      const jsonScript = document.querySelector('script[type="application/json"][id^="product-data-"]');
      if (jsonScript) {
        try {
          const jsonData = JSON.parse(jsonScript.textContent || '{}');
          result.sku = jsonData.sku;
          result.nom = jsonData.name;
          result.marque = jsonData.brands?.[0] || '';
          result.price_ht = jsonData.prices?.price_ht;
          result.stockStatus = jsonData.availability_status;
          result.color = jsonData.color;
          result.categories = jsonData.categories;
        } catch (e) {
          // Fallback to DOM parsing
        }
      }

      // Fallback: DOM parsing
      if (!result.nom) {
        const titleEl = document.querySelector('h1[itemprop="name"], h1.product-title, h1');
        result.nom = titleEl?.textContent?.trim() || '';
      }

      if (!result.sku) {
        const skuEl = document.querySelector('[itemprop="sku"], .product-sku');
        result.sku = skuEl?.textContent?.trim() || '';
      }

      // Image
      const imgEl = document.querySelector('.product-view__gallery img, [itemprop="image"]');
      result.imageUrl = imgEl ? (imgEl as HTMLImageElement).src : null;

      return result;
    });

    if (!data.nom || !data.sku) {
      return null;
    }

    const dims = parseDimensionsFromName(data.nom);

    // Calculer le prix au m² à partir du prix HT du panneau
    const surface = (dims.longueur * dims.largeur) / 1_000_000;
    const calculatedPrixM2 = (data.price_ht && surface > 0)
      ? Math.round((data.price_ht / surface) * 100) / 100
      : null;

    return {
      nom: data.nom,
      marque: data.marque || 'Barrillet',
      refBarrillet: data.sku,
      refMarque: null,
      codeEAN: null,
      prixM2: calculatedPrixM2,
      prixHT: data.price_ht || null,
      prixMl: null,
      longueur: dims.longueur,
      largeur: dims.largeur,
      epaisseur: dims.epaisseur,
      couleur: data.color || null,
      imageUrl: data.imageUrl || null,
      stockStatus: data.stockStatus || null,
      sourceUrl: url,
      categories: data.categories || [],
    };
  } catch (error) {
    console.log(`      Erreur: ${(error as Error).message.substring(0, 50)}`);
    return null;
  }
}

/**
 * Sauvegarde un produit en base
 */
export async function saveProduct(
  product: BarrilletProduct,
  catalogueId: string,
  categoryId: string,
  categorySlug: string
): Promise<boolean> {
  try {
    const reference = generateReference(product.refBarrillet, categorySlug);
    const productType = determineProductType(product.nom, categorySlug);

    // Métadonnées étendues
    const extendedData: Record<string, any> = {};
    if (product.marque) extendedData.marque = product.marque;
    if (product.couleur) extendedData.couleur = product.couleur;
    if (product.prixHT) extendedData.prixHT = product.prixHT;
    if (product.sourceUrl) extendedData.sourceUrl = product.sourceUrl;
    if (product.categories.length > 0) extendedData.barrilletCategories = product.categories;

    const metadataJson = Object.keys(extendedData).length > 0 ? JSON.stringify(extendedData) : null;

    await prisma.panel.upsert({
      where: {
        catalogueId_reference: { catalogueId, reference },
      },
      update: {
        name: product.nom,
        thickness: product.epaisseur > 0 ? [product.epaisseur] : [],
        defaultLength: product.longueur,
        defaultWidth: product.largeur,
        pricePerM2: product.prixM2,
        pricePerMl: product.prixMl,
        manufacturerRef: product.refMarque,
        productType,
        decor: product.couleur,
        imageUrl: product.imageUrl,
        stockStatus: product.stockStatus,
        categoryId,
        isActive: true,
        metadata: metadataJson,
      },
      create: {
        reference,
        name: product.nom,
        thickness: product.epaisseur > 0 ? [product.epaisseur] : [],
        defaultLength: product.longueur,
        defaultWidth: product.largeur,
        pricePerM2: product.prixM2,
        pricePerMl: product.prixMl,
        manufacturerRef: product.refMarque,
        productType,
        decor: product.couleur,
        imageUrl: product.imageUrl,
        stockStatus: product.stockStatus,
        catalogueId,
        categoryId,
        isActive: true,
        metadata: metadataJson,
      },
    });

    return true;
  } catch (error) {
    console.log(`      DB: ${(error as Error).message.substring(0, 50)}`);
    return false;
  }
}

/**
 * Connecte à Chrome en mode debug
 */
export async function connectToChrome(): Promise<Browser> {
  console.log('Connexion à Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('Connecté!\n');
    return browser;
  } catch (e) {
    console.error("Impossible de se connecter à Chrome.");
    console.error("Lancez d'abord Chrome en mode debug!");
    console.error("  Windows: start chrome --remote-debugging-port=9222");
    console.error("  Mac/Linux: google-chrome --remote-debugging-port=9222");
    process.exit(1);
  }
}

export { prisma };
