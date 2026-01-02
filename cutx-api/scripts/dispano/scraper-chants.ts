/**
 * Scraper Dispano - Module Chants (Bandes de chant)
 *
 * Spécificités des chants:
 * - Prix unitaire par rouleau (pas au m²)
 * - Longueur du rouleau en mètres
 * - Largeur en mm (23, 43, 48, etc.)
 * - Épaisseur en mm (0.4, 1, 2, etc.)
 * - Type: ABS, Mélaminé, Bois naturel
 * - Pré-encollé ou non
 */

import puppeteer, { Page, Browser } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import {
  generateReferenceChant,
  determineChantType,
  DISPANO_CHANTS_CONFIG,
  type ChantSubCategory,
} from './config-chants';

const prisma = new PrismaClient();

export interface DispanoChant {
  nom: string;
  marque: string;
  refDispano: string;
  refMarque: string | null;
  codeEAN: string | null;
  // Prix
  prixRouleau: number | null; // Prix unitaire du rouleau
  prixMl: number | null; // Prix au mètre linéaire (calculé)
  // Dimensions
  longueurRouleau: number; // Longueur en mètres
  largeur: number; // Largeur en mm
  epaisseur: number; // Épaisseur en mm
  // Caractéristiques
  chantType: string; // ABS_STANDARD, ABS_LASER, MELAMINE, BOIS_NATUREL
  decor: string | null;
  refDecor: string | null;
  couleur: string | null;
  finition: string | null;
  preEncolle: boolean | null;
  // Images & Stock
  imageUrl: string | null;
  imageUrls: string[];
  stockStatus: string | null;
  stockQuantity: number | null;
}

export interface ChantScrapingStats {
  totalProducts: number;
  created: number;
  updated: number;
  errors: number;
  withImages: number;
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
 * Récupère tous les liens produits d'une page catégorie chants
 */
export async function getChantProductLinks(page: Page, url: string): Promise<string[]> {
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

    // Extraire les liens produits
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

    let newCount = 0;
    for (const link of pageLinks) {
      if (!allLinks.includes(link)) {
        allLinks.push(link);
        newCount++;
      }
    }

    console.log(
      `   Page ${currentPage}: ${pageLinks.length} produits (nouveaux: ${newCount}, total: ${allLinks.length})`
    );

    if (newCount === 0) {
      consecutiveEmptyPages++;
    } else {
      consecutiveEmptyPages = 0;
    }

    // Chercher et cliquer sur le bouton "Suivant"
    const hasNextPage = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = link.textContent?.trim().toLowerCase() || '';
        if (text === 'suivant' || text === 'next' || text === '>' || text === '>>') {
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
      console.log(`   Plus de bouton "Suivant" trouve`);
      break;
    }

    await new Promise((r) => setTimeout(r, 2500));
    try {
      await page.waitForNetworkIdle({ timeout: 10000 });
    } catch (e) {
      // Timeout OK
    }

    currentPage++;

    if (currentPage > 50) {
      console.log(`   Limite de 50 pages atteinte`);
      break;
    }
  }

  console.log(`   ${allLinks.length} produits trouves au total sur ${currentPage} pages`);
  return allLinks;
}

/**
 * Scrape les données d'un chant
 */
export async function scrapeChant(
  page: Page,
  url: string,
  categorySlug: string
): Promise<DispanoChant | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Scroll pour charger les specs
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
          'REHAU',
          'OSTERMANN',
          'EGGER',
          'SWISS KRONO',
          'KRONOSPAN',
          'FINSA',
          'PFLEIDERER',
          'DECOSPAN',
          'POLYREY',
          'LOSAN',
          'DUROPAL',
          'CLEAF',
          'KAINDL',
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

      // Fallback URL
      if (!result.refDispano) {
        const urlMatch = window.location.href.match(/-A(\d+)$/);
        result.refDispano = urlMatch ? urlMatch[1] : null;
      }

      const eanMatch = pageText.match(/Code\s*EAN\s*:?\s*(\d{13})/i);
      result.codeEAN = eanMatch ? eanMatch[1] : null;

      // Références fabricant
      const refFabPatterns = [
        /R[ée]f\.?\s*REHAU\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*OSTERMANN\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*EGGER\s*:?\s*([A-Z0-9-]+)/i,
        /R[ée]f\.?\s*fabricant\s*:?\s*([A-Z0-9-]+)/i,
      ];
      for (const pattern of refFabPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          result.refMarque = match[1];
          break;
        }
      }

      // === PRIX ===
      // Chants: prix unitaire (par rouleau)
      // Pattern: XX,XX € HT ou XX,XX €
      const prixPatterns = [
        /([\d,]+)\s*€\s*(?:HT)?\s*(?:\/\s*(?:rouleau|unit[ée]|pi[eè]ce))?/i,
        /Prix\s*:?\s*([\d,]+)\s*€/i,
      ];
      for (const pattern of prixPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          result.prixRouleau = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }

      // === DIMENSIONS CHANT ===
      // Longueur du rouleau (en mètres)
      const longueurPatterns = [
        /(?:longueur|long\.?)\s*(?:rouleau)?\s*:?\s*(\d+)\s*m(?:[eè]tres?)?/i,
        /(\d+)\s*m(?:[eè]tres?)?\s*(?:\/\s*rouleau)?/i,
        /Rouleau\s*(?:de\s*)?(\d+)\s*m/i,
      ];
      result.longueurRouleau = 0;
      for (const pattern of longueurPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          const val = parseInt(match[1]);
          // Longueur rouleau typique: 25m, 50m, 75m, 100m, 200m
          if (val >= 10 && val <= 500) {
            result.longueurRouleau = val;
            break;
          }
        }
      }

      // Largeur (en mm)
      const largeurPatterns = [
        /(?:largeur|larg\.?)\s*:?\s*(\d+(?:[,\.]\d+)?)\s*mm/i,
        /(\d+(?:[,\.]\d+)?)\s*mm\s*(?:de\s*)?(?:largeur|large)/i,
      ];
      result.largeur = 0;
      for (const pattern of largeurPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          result.largeur = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }

      // Épaisseur (en mm)
      const epaisseurPatterns = [
        /[EÉée]paisseur\s*:?\s*([\d,\.]+)\s*mm/i,
        /[EÉée]p\.?\s*:?\s*([\d,\.]+)\s*mm/i,
        /([\d,\.]+)\s*mm\s*(?:d'[ée]paisseur|[ée]p\.?)/i,
      ];
      result.epaisseur = 0;
      for (const pattern of epaisseurPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          result.epaisseur = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }

      // === CARACTÉRISTIQUES ===
      // Décor / Couleur
      const decorMatch = pageText.match(/(?:D[ée]cor|Nom\s*D[ée]cor)\s*:?\s*([^\n]+)/i);
      result.decor = decorMatch ? decorMatch[1].trim().substring(0, 50) : null;

      const refDecorMatch = pageText.match(/R[ée]f[ée]rence\s*D[ée]cor\s*:?\s*([A-Z0-9]+)/i);
      result.refDecor = refDecorMatch ? refDecorMatch[1].trim() : null;

      const couleurMatch = pageText.match(/(?:couleur|teinte)\s*:?\s*([^\n]+)/i);
      result.couleur = couleurMatch ? couleurMatch[1].trim().substring(0, 50) : null;

      const finitionMatch = pageText.match(/Finition[\/]?(?:Structure)?\s*:?\s*([^\n]+)/i);
      result.finition = finitionMatch ? finitionMatch[1].trim().substring(0, 50) : null;

      // Pré-encollé
      const preEncolleMatch = pageText.match(
        /(?:pr[ée]-?encoll[ée]|avec\s*colle|encollage|hotmelt)/i
      );
      const nonEncolleMatch = pageText.match(/(?:non-?encoll[ée]|sans\s*colle)/i);
      if (preEncolleMatch) {
        result.preEncolle = true;
      } else if (nonEncolleMatch) {
        result.preEncolle = false;
      } else {
        result.preEncolle = null;
      }

      // === IMAGES ===
      result.imageUrls = [];
      const seenAstCodes = new Set<string>();

      const productHeader = document.querySelector('[data-testid="article-header"]') || document.body;

      productHeader.querySelectorAll('img[src*="/asset/"]').forEach((img) => {
        const src = (img as HTMLImageElement).src;
        if (src && src.includes('/asset/')) {
          const astMatch = src.match(/(AST\d+)/);
          if (astMatch && !seenAstCodes.has(astMatch[1])) {
            seenAstCodes.add(astMatch[1]);
            const xlSrc = src.replace(/-[MSL]\.jpg/, '-XL.jpg');
            result.imageUrls.push(xlSrc);
          }
        }
      });

      // Fallback autres images
      if (result.imageUrls.length === 0) {
        document.querySelectorAll('img').forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (
            src &&
            !src.includes('.svg') &&
            !src.includes('logo') &&
            !src.includes('icon') &&
            !src.includes('data:image') &&
            src.includes('dispano.fr') &&
            !result.imageUrls.includes(src)
          ) {
            result.imageUrls.push(src);
          }
        });
      }

      result.imageUrl = result.imageUrls[0] || null;

      // === STOCK ===
      result.stockStatus = null;
      result.stockQuantity = null;

      const availabilityEl = document.querySelector('[data-testid*="availability"]');
      if (availabilityEl) {
        const text = availabilityEl.textContent || '';
        const qtyMatch = text.match(/(\d+)\s+(?:[A-Za-z\s]+\s+)?disponible/i);
        if (qtyMatch) {
          result.stockQuantity = parseInt(qtyMatch[1]);
          result.stockStatus = 'EN STOCK';
        } else if (
          text.toLowerCase().includes('disponible') ||
          text.toLowerCase().includes('stock')
        ) {
          result.stockStatus = 'EN STOCK';
        }
      }

      if (!result.stockStatus) {
        const stockMatch = pageText.match(/(\d{1,4})\s*(?:rouleau|unité)?\s*disponible/i);
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

    const chantType = determineChantType(categorySlug);

    // Calculer prix au ml si possible
    let prixMl: number | null = null;
    if (data.prixRouleau && data.longueurRouleau > 0) {
      prixMl = data.prixRouleau / data.longueurRouleau;
    }

    return {
      nom: data.nom,
      marque: data.marque || 'Dispano',
      refDispano: data.refDispano,
      refMarque: data.refMarque || null,
      codeEAN: data.codeEAN || null,
      prixRouleau: data.prixRouleau || null,
      prixMl,
      longueurRouleau: data.longueurRouleau || 0,
      largeur: data.largeur || 0,
      epaisseur: data.epaisseur || 0,
      chantType,
      decor: data.decor || null,
      refDecor: data.refDecor || null,
      couleur: data.couleur || null,
      finition: data.finition || null,
      preEncolle: data.preEncolle,
      imageUrl: data.imageUrl || null,
      imageUrls: data.imageUrls || [],
      stockStatus: data.stockStatus || null,
      stockQuantity: data.stockQuantity || null,
    };
  } catch (error) {
    console.log(`      Erreur: ${(error as Error).message.substring(0, 50)}`);
    return null;
  }
}

/**
 * Sauvegarde un chant en base (utilise le modèle Panel avec productType='BANDE_DE_CHANT')
 */
export async function saveChant(
  chant: DispanoChant,
  catalogueId: string,
  categorySlug: string
): Promise<boolean> {
  try {
    const reference = generateReferenceChant(chant.refDispano, categorySlug);

    // Métadonnées étendues pour les chants
    const extendedData: Record<string, any> = {
      type: 'CHANT',
      chantType: chant.chantType,
    };
    if (chant.marque) extendedData.marque = chant.marque;
    if (chant.refMarque) extendedData.refMarque = chant.refMarque;
    if (chant.codeEAN) extendedData.codeEAN = chant.codeEAN;
    if (chant.prixRouleau) extendedData.prixRouleau = chant.prixRouleau;
    if (chant.longueurRouleau) extendedData.longueurRouleau = chant.longueurRouleau;
    if (chant.couleur) extendedData.couleur = chant.couleur;
    if (chant.preEncolle !== null) extendedData.preEncolle = chant.preEncolle;
    if (chant.stockQuantity) extendedData.stockQuantity = chant.stockQuantity;
    if (chant.imageUrls.length > 1) extendedData.additionalImages = chant.imageUrls.slice(1);

    const metadataJson = JSON.stringify(extendedData);

    await prisma.panel.upsert({
      where: {
        catalogueId_reference: { catalogueId, reference },
      },
      update: {
        name: chant.nom,
        thickness: chant.epaisseur > 0 ? [chant.epaisseur] : [],
        defaultLength: chant.longueurRouleau * 1000, // Convertir m en mm pour cohérence
        defaultWidth: chant.largeur,
        pricePerMl: chant.prixMl,
        pricePerUnit: chant.prixRouleau,
        manufacturerRef: chant.refMarque,
        finish: chant.finition,
        productType: 'BANDE_DE_CHANT',
        decor: chant.decor,
        colorCode: chant.refDecor,
        imageUrl: chant.imageUrl,
        stockStatus: chant.stockStatus,
        isActive: true,
        metadata: metadataJson,
      },
      create: {
        reference,
        name: chant.nom,
        thickness: chant.epaisseur > 0 ? [chant.epaisseur] : [],
        defaultLength: chant.longueurRouleau * 1000,
        defaultWidth: chant.largeur,
        pricePerMl: chant.prixMl,
        pricePerUnit: chant.prixRouleau,
        manufacturerRef: chant.refMarque,
        finish: chant.finition,
        productType: 'BANDE_DE_CHANT',
        decor: chant.decor,
        colorCode: chant.refDecor,
        imageUrl: chant.imageUrl,
        stockStatus: chant.stockStatus,
        catalogueId,
        isActive: true,
        metadata: metadataJson,
      },
    });

    return true;
  } catch (error) {
    console.log(`      DB Error: ${(error as Error).message.substring(0, 50)}`);
    return false;
  }
}

/**
 * Connecte à Chrome en mode debug
 */
export async function connectToChrome(): Promise<Browser> {
  console.log('Connexion a Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
    console.log('Connecte!\n');
    return browser;
  } catch (e) {
    console.error('Impossible de se connecter a Chrome.');
    console.error("Lancez d'abord Chrome en mode debug:");
    console.error('  chrome --remote-debugging-port=9222');
    process.exit(1);
  }
}

export { prisma };
