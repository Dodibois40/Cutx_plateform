/**
 * Scraper Dispano - Module principal
 *
 * Extraction complète:
 * - Données produit (nom, réf, prix, dimensions)
 * - Images (haute qualité)
 * - Stock (statut + quantités)
 * - Métadonnées étendues
 */

import puppeteer, { Page, Browser } from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import { Category, SubCategory, determineProductType, generateReference, DISPANO_CONFIG } from './config';

const prisma = new PrismaClient();

export interface DispanoProduct {
  nom: string;
  marque: string;
  refDispano: string;
  refMarque: string | null;
  codeEAN: string | null;
  prixM2: number | null;
  prixPublic: number | null;
  longueur: number;
  largeur: number;
  epaisseur: number;
  poids: number | null;
  classeFeu: string | null;
  co2: number | null;
  typeProduit: string | null;
  decor: string | null;
  refDecor: string | null;
  teinte: string | null;
  finition: string | null;
  support: string | null;
  gamme: string | null;
  formaldehyde: string | null;
  classementParticules: string | null;
  ignifuge: string | null;
  deuxFacesIdentiques: boolean | null;
  // Images
  imageUrl: string | null;
  imageUrls: string[];
  // Stock
  stockStatus: string | null;
  stockQuantity: number | null;
  stockLocations: { location: string; inStock: boolean; quantity?: number }[];
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
 * Scroll pour charger tous les produits (lazy loading)
 */
export async function scrollToLoadAll(page: Page): Promise<void> {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let attempts = 0;

  while (previousHeight !== currentHeight && attempts < 30) {
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
        }, 80);
      });
    });

    await new Promise((r) => setTimeout(r, 1500));
    currentHeight = await page.evaluate(() => document.body.scrollHeight);
    attempts++;
  }
}

/**
 * Récupère tous les liens produits d'une page catégorie
 * Navigue en cliquant sur "Suivant" pour éviter la détection anti-bot
 */
export async function getProductLinks(page: Page, url: string): Promise<string[]> {
  console.log(`   📋 Chargement: ${url}`);

  // Charger la première page
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (e) {
    console.log(`   ⚠️ Timeout navigation initiale, on continue...`);
  }
  await new Promise((r) => setTimeout(r, 3000));

  const allLinks: string[] = [];
  let currentPage = 1;
  let consecutiveEmptyPages = 0;

  while (consecutiveEmptyPages < 2) {
    // Scroll pour charger tous les produits de la page
    await scrollToLoadAll(page);
    await new Promise((r) => setTimeout(r, 1000));

    // Extraire les liens produits de cette page
    const pageLinks = await page.evaluate(() => {
      const productLinks: string[] = [];
      document.querySelectorAll('a').forEach((el) => {
        const href = el.href;
        if (!href) return;
        // Format Dispano: /p/xxx-AXXXXXXX
        if (href.includes('/p/') && href.match(/-A\d{6,8}$/)) {
          if (!productLinks.includes(href)) {
            productLinks.push(href);
          }
        }
      });
      return productLinks;
    });

    // Compter les nouveaux liens
    let newCount = 0;
    for (const link of pageLinks) {
      if (!allLinks.includes(link)) {
        allLinks.push(link);
        newCount++;
      }
    }

    console.log(`   📄 Page ${currentPage}: ${pageLinks.length} produits (nouveaux: ${newCount}, total: ${allLinks.length})`);

    if (newCount === 0) {
      consecutiveEmptyPages++;
    } else {
      consecutiveEmptyPages = 0;
    }

    // Chercher et cliquer sur le bouton "Suivant"
    const hasNextPage = await page.evaluate(() => {
      // Chercher le lien "Suivant" dans la pagination
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || '';
        if (text === 'suivant' || text === 'next' || text === '›' || text === '»') {
          // Vérifier qu'il est visible et cliquable
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
      console.log(`   ℹ️ Plus de bouton "Suivant" trouvé`);
      break;
    }

    // Attendre le chargement de la nouvelle page
    await new Promise((r) => setTimeout(r, 2500));
    try {
      await page.waitForNetworkIdle({ timeout: 10000 });
    } catch (e) {
      // Timeout OK, on continue
    }

    currentPage++;

    // Sécurité: max 60 pages
    if (currentPage > 60) {
      console.log(`   ⚠️ Limite de 60 pages atteinte`);
      break;
    }
  }

  console.log(`   ✅ ${allLinks.length} produits trouvés au total sur ${currentPage} pages`);
  return allLinks;
}

/**
 * Scrape les données complètes d'un produit
 */
export async function scrapeProduct(page: Page, url: string): Promise<DispanoProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Scroll pour charger toutes les specs et images
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 400);
          totalHeight += 400;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 80);
      });
    });
    await new Promise((r) => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      const result: Record<string, any> = {};
      const pageText = document.body.innerText;

      // === NOM ===
      const titleEl = document.querySelector('[data-testid="article-header/article-name"], h1');
      result.nom = titleEl?.textContent?.trim() || '';

      // === MARQUE ===
      const pageTitle = document.title;
      const titleBrandMatch = pageTitle.match(/^([A-Z][A-Z\s]+)\s*-\s*/);
      if (titleBrandMatch && titleBrandMatch[1].length < 30) {
        result.marque = titleBrandMatch[1].trim();
      }

      // Chercher marque dans le texte
      if (!result.marque || result.marque === 'Marques') {
        const brands = [
          'SWISS KRONO', 'EGGER PANNEAUX', 'EGGER', 'KRONOSPAN', 'FINSA', 'PFLEIDERER',
          'UNILIN PANELS', 'UNILIN', 'POLYREY', 'ABET LAMINATI', 'FORMICA', 'RESOPAL',
          'ARPA', 'FENIX', 'HOMAPAL', 'FUNDERMAX', 'TRESPA', 'DECOSPAN', 'REHAU',
          'OSTERMANN', 'DUROPAL', 'CLEAF', 'KAINDL', 'LG HI', 'DURASEIN'
        ];
        for (const brand of brands) {
          if (pageText.toUpperCase().includes(brand)) {
            result.marque = brand;
            break;
          }
        }
      }

      // === RÉFÉRENCES ===
      const refDispanoMatch = pageText.match(/R[ée]f\.?\s*Dispano\s*:?\s*(\d+)/i);
      result.refDispano = refDispanoMatch ? refDispanoMatch[1] : null;

      // Si pas trouvé, chercher dans l'URL
      if (!result.refDispano) {
        const urlMatch = window.location.href.match(/-A(\d+)$/);
        result.refDispano = urlMatch ? urlMatch[1] : null;
      }

      const eanMatch = pageText.match(/Code\s*EAN\s*:?\s*(\d{13})/i);
      result.codeEAN = eanMatch ? eanMatch[1] : null;

      // Références fabricant
      const refFabricantPatterns = [
        /R[ée]f\.?\s*SWISS\s*KRONO\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*EGGER\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*KRONOSPAN\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*FINSA\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*POLYREY\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*fabricant\s*:?\s*([A-Z0-9-]+)/i,
      ];
      for (const pattern of refFabricantPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          result.refMarque = match[1];
          break;
        }
      }

      // === PRIX ===
      const prixPatterns = [
        /([\d,]+)\s*€\s*HT\s*\/\s*[Mm][èe]tre\s*carr[ée]/,
        /([\d,]+)\s*€\s*\/\s*m[²2]/i,
        /Prix\s*:?\s*([\d,]+)\s*€/i,
      ];
      for (const pattern of prixPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          result.prixM2 = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }

      const prixPublicMatch = pageText.match(/Prix\s*public\s*:?\s*([\d,]+)\s*€/i);
      result.prixPublic = prixPublicMatch ? parseFloat(prixPublicMatch[1].replace(',', '.')) : null;

      // === DIMENSIONS ===
      const longueurMatch = pageText.match(/Longueur\s*:?\s*(\d+)\s*mm/i);
      result.longueur = longueurMatch ? parseInt(longueurMatch[1]) : 0;

      const largeurMatch = pageText.match(/Largeur\s*:?\s*(\d+)\s*mm/i);
      result.largeur = largeurMatch ? parseInt(largeurMatch[1]) : 0;

      const epaisseurMatch = pageText.match(/[EÉ]paisseur\s*:?\s*([\d,\.]+)\s*mm/i);
      result.epaisseur = epaisseurMatch ? parseFloat(epaisseurMatch[1].replace(',', '.')) : 0;

      // === POIDS ===
      const poidsMatch = pageText.match(/Poids\s*(?:net)?\s*:?\s*([\d,\.]+)\s*kg/i);
      result.poids = poidsMatch ? parseFloat(poidsMatch[1].replace(',', '.')) : null;

      // === CARACTÉRISTIQUES TECHNIQUES ===
      const classeFeuMatch = pageText.match(/Classe\s*(?:de\s*)?feu\s*:?\s*([^\n]+)/i);
      result.classeFeu = classeFeuMatch ? classeFeuMatch[1].trim().substring(0, 50) : null;

      const co2Match = pageText.match(/R[ée]chauffement\s*climatique[^:]*:\s*([\d,\.]+)/i) ||
                       pageText.match(/[ée]quiv\.?\s*CO2[^:]*:\s*([\d,\.]+)/i);
      result.co2 = co2Match ? parseFloat(co2Match[1].replace(',', '.')) : null;

      const typeProduitMatch = pageText.match(/Type\s*de\s*produit\s*:?\s*([^\n]+)/i);
      result.typeProduit = typeProduitMatch ? typeProduitMatch[1].trim().substring(0, 100) : null;

      const nomDecorMatch = pageText.match(/Nom\s*D[ée]cor\s*:?\s*([^\n]+)/i);
      result.decor = nomDecorMatch ? nomDecorMatch[1].trim().substring(0, 50) : null;

      const refDecorMatch = pageText.match(/R[ée]f[ée]rence\s*D[ée]cor\s*:?\s*([A-Z0-9]+)/i);
      result.refDecor = refDecorMatch ? refDecorMatch[1].trim() : null;

      const teinteMatch = pageText.match(/Teinte\s*:?\s*([^\n]+)/i);
      result.teinte = teinteMatch ? teinteMatch[1].trim().substring(0, 50) : null;

      const finitionMatch = pageText.match(/Finition[\/]?(?:Structure)?\s*:?\s*([^\n]+)/i);
      result.finition = finitionMatch ? finitionMatch[1].trim().substring(0, 50) : null;

      const supportMatch = pageText.match(/Support\s*:?\s*([^\n]+)/i);
      result.support = supportMatch ? supportMatch[1].trim().substring(0, 100) : null;

      const gammeMatch = pageText.match(/Gamme\s*:?\s*([^\n]+)/i);
      result.gamme = gammeMatch ? gammeMatch[1].trim().substring(0, 50) : null;

      const formalMatch = pageText.match(/[EÉ]mission\s*formald[ée]hyde\s*:?\s*([^\n]+)/i);
      result.formaldehyde = formalMatch ? formalMatch[1].trim().substring(0, 20) : null;

      const classementMatch = pageText.match(/Classement\s*particules\s*:?\s*([^\n]+)/i);
      result.classementParticules = classementMatch ? classementMatch[1].trim().substring(0, 20) : null;

      const ignifugeMatch = pageText.match(/Ignifuge\s*\([^\)]*\)\s*:?\s*([^\n]+)/i);
      result.ignifuge = ignifugeMatch ? ignifugeMatch[1].trim().substring(0, 20) : null;

      const deuxFacesMatch = pageText.match(/2\s*Faces\s*d[ée]cor\s*identique\s*:?\s*([^\n]+)/i);
      result.deuxFacesIdentiques = deuxFacesMatch ? deuxFacesMatch[1].toLowerCase().includes('oui') : null;

      // === IMAGES ===
      result.imageUrls = [];
      const seenAstCodes = new Set<string>();

      // Pattern Dispano: /asset/XX/XX/ASTXXXXXXX-XL.jpg
      // Chercher uniquement dans la zone produit principale (header)
      const productHeader = document.querySelector('[data-testid="article-header"]') || document.body;

      productHeader.querySelectorAll('img[src*="/asset/"]').forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src && src.includes('/asset/')) {
          // Extraire le code AST unique (ex: AST8702389)
          const astMatch = src.match(/(AST\d+)/);
          if (astMatch && !seenAstCodes.has(astMatch[1])) {
            seenAstCodes.add(astMatch[1]);
            // Convertir en version XL
            const xlSrc = src.replace(/-[MSL]\.jpg/, '-XL.jpg');
            result.imageUrls.push(xlSrc);
          }
        }
      });

      // Fallback: chercher dans les sliders/galleries
      if (result.imageUrls.length === 0) {
        document.querySelectorAll('[class*="slider"] img, [class*="carousel"] img, [class*="swiper"] img').forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src && !src.includes('.svg') && !src.includes('logo') && !result.imageUrls.includes(src)) {
            result.imageUrls.push(src);
          }
        });
      }

      // Fallback: toutes les images produit
      if (result.imageUrls.length === 0) {
        document.querySelectorAll('img').forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src &&
              !src.includes('.svg') &&
              !src.includes('logo') &&
              !src.includes('icon') &&
              !src.includes('data:image') &&
              src.includes('dispano.fr') &&
              !result.imageUrls.includes(src)) {
            result.imageUrls.push(src);
          }
        });
      }

      // Image OG en fallback
      if (result.imageUrls.length === 0) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          const ogSrc = ogImage.getAttribute('content');
          if (ogSrc && !ogSrc.includes('logo')) {
            result.imageUrls.push(ogSrc);
          }
        }
      }

      result.imageUrl = result.imageUrls[0] || null;

      // === STOCK ===
      result.stockStatus = null;
      result.stockQuantity = null;
      result.stockLocations = [];

      // Chercher les indicateurs de stock via data-testid (plus fiable)
      const availabilityEl = document.querySelector('[data-testid*="availability"]');
      if (availabilityEl) {
        const text = availabilityEl.textContent || '';
        // Pattern: "28 Panneau plaque disponible(s) dans votre agence"
        // ou "15 disponible(s)"
        const qtyMatch = text.match(/(\d+)\s+(?:[A-Za-zÀ-ÿ\s]+\s+)?disponible/i);
        if (qtyMatch) {
          result.stockQuantity = parseInt(qtyMatch[1]);
          result.stockStatus = 'EN STOCK';
        } else if (text.toLowerCase().includes('disponible') || text.toLowerCase().includes('stock')) {
          result.stockStatus = 'EN STOCK';
        }
      }

      // Chercher dans les autres indicateurs
      if (!result.stockStatus) {
        const stockIndicators = document.querySelectorAll(
          '[class*="stock"], [class*="availability"], [class*="disponib"]'
        );

        stockIndicators.forEach((el) => {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('en stock') || text.includes('disponible')) {
            result.stockStatus = 'EN STOCK';
            // Quantité: chercher pattern "X disponible" ou "X en stock"
            const qtyMatch = text.match(/(\d+)\s*(?:panneau|plaque|unité|pièce)?\s*(?:disponible|en stock)/i);
            if (qtyMatch && !result.stockQuantity) {
              result.stockQuantity = parseInt(qtyMatch[1]);
            }
          } else if (text.includes('sur commande')) {
            result.stockStatus = 'Sur commande';
          } else if (text.includes('rupture') || text.includes('indisponible')) {
            result.stockStatus = 'Rupture';
          }
        });
      }

      // Fallback: chercher dans le texte de la page (mais éviter les faux positifs avec les refs)
      if (!result.stockStatus) {
        // Pattern plus strict pour éviter de confondre avec les numéros de ref
        const stockMatch = pageText.match(/(\d{1,4})\s*(?:panneau|plaque|unité|pièce)?\s*disponible/i);
        if (stockMatch) {
          result.stockStatus = 'EN STOCK';
          result.stockQuantity = parseInt(stockMatch[1]);
        } else if (pageText.match(/sur\s*commande/i)) {
          result.stockStatus = 'Sur commande';
        }
      }

      return result;
    });

    if (!data.nom || !data.refDispano) {
      return null;
    }

    return {
      nom: data.nom,
      marque: data.marque || 'Dispano',
      refDispano: data.refDispano,
      refMarque: data.refMarque || null,
      codeEAN: data.codeEAN || null,
      prixM2: data.prixM2 || null,
      prixPublic: data.prixPublic || null,
      longueur: data.longueur || 0,
      largeur: data.largeur || 0,
      epaisseur: data.epaisseur || 0,
      poids: data.poids || null,
      classeFeu: data.classeFeu || null,
      co2: data.co2 || null,
      typeProduit: data.typeProduit || null,
      decor: data.decor || null,
      refDecor: data.refDecor || null,
      teinte: data.teinte || null,
      finition: data.finition || null,
      support: data.support || null,
      gamme: data.gamme || null,
      formaldehyde: data.formaldehyde || null,
      classementParticules: data.classementParticules || null,
      ignifuge: data.ignifuge || null,
      deuxFacesIdentiques: data.deuxFacesIdentiques || null,
      imageUrl: data.imageUrl || null,
      imageUrls: data.imageUrls || [],
      stockStatus: data.stockStatus || null,
      stockQuantity: data.stockQuantity || null,
      stockLocations: data.stockLocations || [],
    };
  } catch (error) {
    console.log(`      ❌ Erreur: ${(error as Error).message.substring(0, 50)}`);
    return null;
  }
}

/**
 * Sauvegarde un produit en base
 */
export async function saveProduct(
  product: DispanoProduct,
  catalogueId: string,
  categoryId: string,
  categorySlug: string
): Promise<boolean> {
  try {
    const reference = generateReference(product.refDispano, categorySlug);
    const productType = determineProductType(product.nom, categorySlug);

    // Métadonnées étendues
    const extendedData: Record<string, any> = {};
    if (product.marque) extendedData.marque = product.marque;
    if (product.refMarque) extendedData.refMarque = product.refMarque;
    if (product.codeEAN) extendedData.codeEAN = product.codeEAN;
    if (product.prixPublic) extendedData.prixPublic = product.prixPublic;
    if (product.poids) extendedData.poids = product.poids;
    if (product.classeFeu) extendedData.classeFeu = product.classeFeu;
    if (product.co2) extendedData.co2 = product.co2;
    if (product.teinte) extendedData.teinte = product.teinte;
    if (product.gamme) extendedData.gamme = product.gamme;
    if (product.formaldehyde) extendedData.formaldehyde = product.formaldehyde;
    if (product.classementParticules) extendedData.classementParticules = product.classementParticules;
    if (product.ignifuge) extendedData.ignifuge = product.ignifuge;
    if (product.deuxFacesIdentiques !== null) extendedData.deuxFacesIdentiques = product.deuxFacesIdentiques;
    if (product.support) extendedData.support = product.support;
    if (product.stockQuantity) extendedData.stockQuantity = product.stockQuantity;
    if (product.imageUrls.length > 1) extendedData.additionalImages = product.imageUrls.slice(1);

    const metadataJson = Object.keys(extendedData).length > 0 ? JSON.stringify(extendedData) : null;
    const stockLocationsJson = product.stockLocations.length > 0 ? JSON.stringify(product.stockLocations) : null;

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
        manufacturerRef: product.refMarque,
        material: product.support || null,
        finish: product.finition,
        productType,
        decor: product.decor,
        colorCode: product.refDecor,
        imageUrl: product.imageUrl,
        stockStatus: product.stockStatus,
        stockLocations: stockLocationsJson,
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
        manufacturerRef: product.refMarque,
        material: product.support || null,
        finish: product.finition,
        productType,
        decor: product.decor,
        colorCode: product.refDecor,
        imageUrl: product.imageUrl,
        stockStatus: product.stockStatus,
        stockLocations: stockLocationsJson,
        catalogueId,
        categoryId,
        isActive: true,
        metadata: metadataJson,
      },
    });

    return true;
  } catch (error) {
    console.log(`      ⚠️ DB: ${(error as Error).message.substring(0, 50)}`);
    return false;
  }
}

/**
 * Connecte à Chrome en mode debug
 */
export async function connectToChrome(): Promise<Browser> {
  console.log('🔌 Connexion à Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('✅ Connecté!\n');
    return browser;
  } catch (e) {
    console.error("❌ Impossible de se connecter à Chrome.");
    console.error("   Lancez d'abord Chrome en mode debug!");
    process.exit(1);
  }
}

export { prisma };
