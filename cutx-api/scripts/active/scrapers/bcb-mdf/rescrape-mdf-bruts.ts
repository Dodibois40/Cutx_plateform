/**
 * RESCRAPE MDF BRUTS - B Comme Bois
 *
 * Scrape complet des panneaux MDF depuis:
 * https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf.html
 *
 * Ce script récupère:
 * - Nom complet du produit
 * - Images (upload vers R2)
 * - Prix au m²
 * - Stock (EN STOCK / Sur commande)
 * - Dimensions (longueur, largeur, épaisseur)
 * - Caractéristiques (hydrofuge, ignifuge, etc.)
 * - Description
 *
 * Et classe automatiquement dans les bonnes catégories:
 * - mdf-standard
 * - mdf-hydrofuge
 * - mdf-ignifuge
 * - mdf-leger
 * - mdf-cintrable
 * - mdf-teinte-couleurs
 * - mdf-a-laquer
 *
 * Usage:
 * 1. Lancer Chrome en mode debug: chrome.exe --remote-debugging-port=9222
 * 2. Se connecter sur bcommebois.fr avec ton compte pro
 * 3. Lancer: npx tsx scripts/active/scrapers/bcb-mdf/rescrape-mdf-bruts.ts
 *
 * Options:
 *   --dry-run    Ne pas modifier la base de données, juste afficher
 *   --limit=N    Limiter à N produits (pour tester)
 */

import puppeteer, { Page, Browser } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as https from 'https';
import * as http from 'http';

const prisma = new PrismaClient();

// Configuration R2/S3
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'cutx-panels';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-6ea9d9f4ee2044609922012b9586d129.r2.dev';

const s3Client = R2_ACCESS_KEY ? new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY!,
  },
}) : null;

// URLs des sous-catégories MDF
const MDF_SUBCATEGORIES = [
  {
    name: 'MDF Standards',
    slug: 'mdf-standard',
    url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf/standards.html',
    productType: 'MDF',
    coreType: 'MDF_STD',
    isHydrofuge: false,
    isIgnifuge: false
  },
  {
    name: 'MDF Hydrofuges',
    slug: 'mdf-hydrofuge',
    url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf/hydrofuges.html',
    productType: 'MDF',
    coreType: 'MDF_H',
    isHydrofuge: true,
    isIgnifuge: false
  },
  {
    name: 'MDF Ignifugés',
    slug: 'mdf-ignifuge',
    url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf/ignifuges.html',
    productType: 'MDF',
    coreType: 'MDF_IGN',
    isHydrofuge: false,
    isIgnifuge: true
  },
  {
    name: 'MDF Légers',
    slug: 'mdf-leger',
    url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf/legers.html',
    productType: 'MDF',
    coreType: 'MDF_LIGHT',
    isHydrofuge: false,
    isIgnifuge: false
  },
  {
    name: 'MDF Cintrables',
    slug: 'mdf-cintrable',
    url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf/cintrables.html',
    productType: 'MDF',
    coreType: 'MDF_FLEX',
    isHydrofuge: false,
    isIgnifuge: false
  },
  {
    name: 'MDF Teintés Masse',
    slug: 'mdf-teinte-couleurs',
    url: 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf/teinte-masse.html',
    productType: 'MDF',
    coreType: 'MDF_COLOR',
    isHydrofuge: false,
    isIgnifuge: false
  },
];

// Page principale MDF (peut contenir des produits supplémentaires)
const MDF_MAIN_URL = 'https://www.bcommebois.fr/agencement/panneaux-basiques-techniques/mdf.html';

interface ScrapedVariant {
  supplierCode: string;
  length: number;
  width: number;
  thickness: number;
  pricePerM2: number | null;
  stockStatus: string;
}

interface ScrapedProduct {
  name: string;
  description: string | null;
  imageUrl: string | null;
  finish: string | null;
  manufacturer: string | null;
  variants: ScrapedVariant[];
  sourceUrl: string;
  subcategorySlug: string;
  productType: string;
  coreType: string;
  isHydrofuge: boolean;
  isIgnifuge: boolean;
}

interface ScrapingStats {
  totalProducts: number;
  totalVariants: number;
  created: number;
  updated: number;
  errors: number;
  imagesUploaded: number;
}

// Parse arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null;

/**
 * Télécharge une image et l'upload vers R2
 */
async function uploadImageToR2(imageUrl: string, panelId: string): Promise<string | null> {
  if (!s3Client || !imageUrl) return null;

  try {
    // Télécharger l'image
    const imageData = await new Promise<Buffer>((resolve, reject) => {
      const protocol = imageUrl.startsWith('https') ? https : http;
      protocol.get(imageUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Follow redirect
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
            redirectProtocol.get(redirectUrl, (res) => {
              const chunks: Buffer[] = [];
              res.on('data', (chunk) => chunks.push(chunk));
              res.on('end', () => resolve(Buffer.concat(chunks)));
              res.on('error', reject);
            }).on('error', reject);
          } else {
            reject(new Error('No redirect URL'));
          }
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });

    // Déterminer le type de fichier
    const ext = imageUrl.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    // Générer un nom unique
    const timestamp = Date.now();
    const key = `panels/bouney/${panelId}-${timestamp}.${ext}`;

    // Upload vers R2
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: imageData,
      ContentType: contentType,
    }));

    return `${R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.log(`      ⚠️ Erreur upload image: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Scroll pour charger tous les produits (lazy loading)
 */
async function scrollToLoadAll(page: Page): Promise<void> {
  let previousHeight = 0;
  let sameHeightCount = 0;

  while (sameHeightCount < 3) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);

    if (currentHeight === previousHeight) {
      sameHeightCount++;
    } else {
      sameHeightCount = 0;
    }

    previousHeight = currentHeight;
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(r => setTimeout(r, 400));
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));
}

/**
 * Récupérer tous les liens produits depuis une page catégorie
 * Les vrais produits ont un code numérique à la fin: -XXXXX.html ou -XXXXXX.html
 */
async function getProductLinks(page: Page, url: string): Promise<string[]> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await scrollToLoadAll(page);

  const links = await page.evaluate(() => {
    const productLinks: string[] = [];

    // Chercher tous les liens avec code numérique (vrais produits)
    document.querySelectorAll('a[href]').forEach(el => {
      const href = (el as HTMLAnchorElement).href;
      // Les vrais produits BCB ont un code 5-6 chiffres à la fin
      if (href.includes('bcommebois.fr') && href.match(/-\d{5,6}\.html$/)) {
        productLinks.push(href);
      }
    });

    return [...new Set(productLinks)];
  });

  return links;
}

/**
 * Extraire toutes les données d'une page produit
 */
async function scrapeProductPage(page: Page, url: string, subcategory: typeof MDF_SUBCATEGORIES[0]): Promise<ScrapedProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));

    const data = await page.evaluate(() => {
      // === NOM DU PRODUIT ===
      let name = '';
      const nameSelectors = [
        'h1.page-title span',
        'h1.product-name',
        '.product-info-main h1 span',
        '.page-title-wrapper h1 span',
        'h1[itemprop="name"]'
      ];
      for (const sel of nameSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          name = el.textContent.trim();
          break;
        }
      }

      // === DESCRIPTION ===
      let description = '';
      const descSelectors = [
        '.product.attribute.description .value',
        '[itemprop="description"]',
        '.product-info-main .description',
        '.product.description .value'
      ];
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          description = el.textContent.trim();
          break;
        }
      }

      // === IMAGE ===
      let imageUrl = '';
      const imgSelectors = [
        '.fotorama__stage__frame img',
        '.fotorama__img',
        'img.gallery-placeholder__image',
        '.product-image-container img',
        '.product.media img[src*="media/catalog"]',
        'meta[property="og:image"]'
      ];
      for (const sel of imgSelectors) {
        if (sel.startsWith('meta')) {
          const meta = document.querySelector(sel);
          const content = meta?.getAttribute('content');
          if (content && content.includes('bcommebois') && !content.includes('placeholder')) {
            imageUrl = content;
            break;
          }
        } else {
          const img = document.querySelector(sel) as HTMLImageElement;
          if (img) {
            const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-full');
            if (src && src.includes('bcommebois') && !src.includes('placeholder') && !src.includes('loading')) {
              imageUrl = src;
              break;
            }
          }
        }
      }

      // === MARQUE/FABRICANT ===
      let manufacturer = '';
      const brandSelectors = [
        '.product-brand',
        '[itemprop="brand"]',
        '.product-info-main .brand'
      ];
      for (const sel of brandSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
          manufacturer = el.textContent.trim();
          break;
        }
      }

      // Détecter la marque dans le nom
      const nameLower = name.toLowerCase();
      if (!manufacturer) {
        if (nameLower.includes('egger')) manufacturer = 'Egger';
        else if (nameLower.includes('kronospan')) manufacturer = 'Kronospan';
        else if (nameLower.includes('finsa')) manufacturer = 'Finsa';
        else if (nameLower.includes('pfleiderer')) manufacturer = 'Pfleiderer';
        else if (nameLower.includes('unilin')) manufacturer = 'Unilin';
        else if (nameLower.includes('swiss krono')) manufacturer = 'Swiss Krono';
        else if (nameLower.includes('valchromat')) manufacturer = 'Valchromat';
        else if (nameLower.includes('medite')) manufacturer = 'Medite';
      }

      // === FINITION ===
      let finish = '';
      if (nameLower.includes('brut')) finish = 'Brut';
      else if (nameLower.includes('poncé') || nameLower.includes('ponce')) finish = 'Poncé';
      else if (nameLower.includes('calibré') || nameLower.includes('calibre')) finish = 'Calibré';

      // === VARIANTES (tableau des dimensions/prix) ===
      const variants: Array<{
        supplierCode: string;
        length: number;
        width: number;
        thickness: number;
        pricePerM2: number | null;
        stockStatus: string;
      }> = [];

      // Chercher le tableau des variantes
      const tables = document.querySelectorAll('table');

      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr, tr');

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length < 2) continue;

          let supplierCode = '';
          let length = 0;
          let width = 0;
          let thickness = 0;
          let pricePerM2: number | null = null;
          let stockStatus = 'Sur commande';

          // Chercher le code article
          const codeCell = row.querySelector('td[data-th="Code Article"], td:first-child');
          if (codeCell) {
            const codeText = codeCell.textContent?.trim() || '';
            const codeMatch = codeText.match(/\d{5,6}/);
            if (codeMatch) supplierCode = codeMatch[0];
          }

          // Chercher les dimensions
          for (const cell of cells) {
            const text = cell.textContent?.trim() || '';
            const dataAttr = cell.getAttribute('data-th')?.toLowerCase() || '';

            // Épaisseur
            if (dataAttr.includes('paisseur') || dataAttr.includes('epaisseur')) {
              const epMatch = text.match(/(\d+(?:[.,]\d+)?)\s*mm/i) || text.match(/^(\d+(?:[.,]\d+)?)$/);
              if (epMatch) thickness = parseFloat(epMatch[1].replace(',', '.'));
            }

            // Longueur
            if (dataAttr.includes('longueur')) {
              const lMatch = text.match(/(\d{3,4})/);
              if (lMatch) length = parseInt(lMatch[1]);
            }

            // Largeur
            if (dataAttr.includes('largeur')) {
              const wMatch = text.match(/(\d{3,4})/);
              if (wMatch) width = parseInt(wMatch[1]);
            }

            // Format dimensions "LxW" ou "LxWxT"
            const dimMatch = text.match(/(\d{3,4})\s*[xX×]\s*(\d{3,4})(?:\s*[xX×]\s*(\d+))?/);
            if (dimMatch) {
              length = parseInt(dimMatch[1]);
              width = parseInt(dimMatch[2]);
              if (dimMatch[3]) thickness = parseInt(dimMatch[3]);
            }

            // Prix
            if (dataAttr.includes('prix') || text.includes('€')) {
              const priceMatch = text.match(/(\d+[.,]\d+)\s*€?\/m²/i) || text.match(/(\d+[.,]\d+)\s*€/);
              if (priceMatch) {
                pricePerM2 = parseFloat(priceMatch[1].replace(',', '.'));
              }
            }

            // Stock
            if (text.toLowerCase().includes('en stock') || dataAttr.includes('stock')) {
              if (text.toLowerCase().includes('en stock')) {
                stockStatus = 'EN STOCK';
              }
            }
          }

          // Vérifier le stock avec l'icône ou la classe
          const stockIcon = row.querySelector('.stock.available, .in-stock, [class*="stock"]');
          if (stockIcon?.textContent?.toLowerCase().includes('stock')) {
            stockStatus = 'EN STOCK';
          }

          // Aussi chercher dans les boutons/liens d'ajout au panier
          const addToCart = row.querySelector('button[type="submit"], .tocart');
          if (addToCart && !addToCart.hasAttribute('disabled')) {
            // Si le bouton d'ajout au panier est actif, probablement en stock
          }

          // Si on a au moins le code et l'épaisseur, ajouter la variante
          if (supplierCode && thickness > 0) {
            variants.push({
              supplierCode,
              length,
              width,
              thickness,
              pricePerM2,
              stockStatus
            });
          }
        }
      }

      // Si pas de tableau, essayer de parser depuis le nom
      if (variants.length === 0 && name) {
        // Chercher dans le nom: "MDF Standard 19 mm 2800 x 2070"
        const dimInName = name.match(/(\d+)\s*mm\s+(\d{3,4})\s*[xX×]\s*(\d{3,4})/);
        const epInName = name.match(/(\d+)\s*mm/);

        // Chercher le prix sur la page
        let pagePrice: number | null = null;
        const priceEl = document.querySelector('.price-final_price .price, .product-info-price .price, [data-price-type="finalPrice"] .price');
        if (priceEl) {
          const priceText = priceEl.textContent || '';
          const priceMatch = priceText.match(/(\d+[.,]\d+)/);
          if (priceMatch) pagePrice = parseFloat(priceMatch[1].replace(',', '.'));
        }

        // Chercher le code article
        let pageCode = '';
        const skuEl = document.querySelector('[itemprop="sku"], .product.attribute.sku .value');
        if (skuEl) {
          const skuText = skuEl.textContent?.trim() || '';
          const codeMatch = skuText.match(/\d{5,6}/);
          if (codeMatch) pageCode = codeMatch[0];
        }

        // Extraire le code depuis l'URL si pas trouvé
        if (!pageCode) {
          const urlMatch = window.location.href.match(/-(\d{5,6})\.html$/);
          if (urlMatch) pageCode = urlMatch[1];
        }

        if (pageCode || dimInName || epInName) {
          variants.push({
            supplierCode: pageCode || `REF-${Date.now()}`,
            length: dimInName ? parseInt(dimInName[2]) : 0,
            width: dimInName ? parseInt(dimInName[3]) : 0,
            thickness: dimInName ? parseInt(dimInName[1]) : (epInName ? parseInt(epInName[1]) : 0),
            pricePerM2: pagePrice,
            stockStatus: document.body.innerText.includes('EN STOCK') ? 'EN STOCK' : 'Sur commande'
          });
        }
      }

      return {
        name,
        description,
        imageUrl,
        manufacturer,
        finish,
        variants
      };
    });

    if (!data.name || data.variants.length === 0) {
      console.log(`      ⚠️ Pas de données exploitables pour ${url}`);
      return null;
    }

    return {
      name: data.name,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      finish: data.finish || null,
      manufacturer: data.manufacturer || null,
      variants: data.variants,
      sourceUrl: url,
      subcategorySlug: subcategory.slug,
      productType: subcategory.productType,
      coreType: subcategory.coreType,
      isHydrofuge: subcategory.isHydrofuge,
      isIgnifuge: subcategory.isIgnifuge
    };
  } catch (error) {
    console.log(`      ❌ Erreur scraping ${url}: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Déterminer la catégorie cible basée sur le nom du produit
 */
function determineCategoryFromName(name: string, defaultSlug: string): string {
  const nameLower = name.toLowerCase();

  // Priorité aux caractéristiques détectées dans le nom
  if (nameLower.includes('hydrofuge') || nameLower.includes('ctbh') || nameLower.includes('moisture')) {
    return 'mdf-hydrofuge';
  }
  if (nameLower.includes('ignifuge') || nameLower.includes('ignifug') || nameLower.includes('m1') || nameLower.includes('b-s')) {
    return 'mdf-ignifuge';
  }
  if (nameLower.includes('léger') || nameLower.includes('leger') || nameLower.includes('light') || nameLower.includes('ultralight')) {
    return 'mdf-leger';
  }
  if (nameLower.includes('cintrable') || nameLower.includes('flexible') || nameLower.includes('flex')) {
    return 'mdf-cintrable';
  }
  if (nameLower.includes('teinté') || nameLower.includes('teinte') || nameLower.includes('colour') || nameLower.includes('valchromat') || nameLower.includes('fibracolour')) {
    return 'mdf-teinte-couleurs';
  }
  if (nameLower.includes('lac') || nameLower.includes('laquer') || nameLower.includes('e-z') || nameLower.includes('fibralac') || nameLower.includes('bouche pores')) {
    return 'mdf-a-laquer';
  }

  return defaultSlug;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           RESCRAPE MDF BRUTS - B COMME BOIS                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }
  if (LIMIT) {
    console.log(`⚠️ LIMITE: ${LIMIT} produits maximum\n`);
  }

  // 1. Connexion à Chrome
  console.log('🔌 Connexion à Chrome...');
  let browser: Browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Impossible de se connecter à Chrome.');
    console.error('   Lancez Chrome avec: chrome.exe --remote-debugging-port=9222');
    console.error('   Et connectez-vous sur bcommebois.fr');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  console.log('✅ Connecté à Chrome!\n');

  // 2. Récupérer le catalogue Bouney
  const catalogue = await prisma.catalogue.findUnique({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.error('❌ Catalogue Bouney non trouvé!');
    process.exit(1);
  }
  console.log(`📦 Catalogue: ${catalogue.name}\n`);

  // 3. Récupérer les catégories MDF
  const mdfCategories = await prisma.category.findMany({
    where: { slug: { startsWith: 'mdf-' } }
  });
  const categoryMap = new Map(mdfCategories.map(c => [c.slug, c.id]));

  console.log('📂 Catégories MDF disponibles:');
  for (const cat of mdfCategories) {
    console.log(`   ✓ ${cat.slug}`);
  }
  console.log('');

  // 4. Stats
  const stats: ScrapingStats = {
    totalProducts: 0,
    totalVariants: 0,
    created: 0,
    updated: 0,
    errors: 0,
    imagesUploaded: 0
  };

  // 5. Collecter tous les liens produits
  console.log('═══ COLLECTE DES LIENS PRODUITS ═══\n');

  const allProductLinks: Map<string, typeof MDF_SUBCATEGORIES[0]> = new Map();

  for (const subcategory of MDF_SUBCATEGORIES) {
    console.log(`📂 ${subcategory.name}: ${subcategory.url}`);

    try {
      const links = await getProductLinks(page, subcategory.url);
      let newLinks = 0;

      for (const link of links) {
        if (!allProductLinks.has(link)) {
          allProductLinks.set(link, subcategory);
          newLinks++;
        }
      }

      console.log(`   ✅ ${links.length} produits trouvés (${newLinks} nouveaux)\n`);
    } catch (error) {
      console.log(`   ⚠️ Erreur: ${(error as Error).message}\n`);
    }
  }

  // Aussi scraper la page principale
  console.log(`📂 Page principale MDF: ${MDF_MAIN_URL}`);
  try {
    const mainLinks = await getProductLinks(page, MDF_MAIN_URL);
    let newMainLinks = 0;

    const defaultSubcat = MDF_SUBCATEGORIES[0]; // mdf-standard par défaut

    for (const link of mainLinks) {
      if (!allProductLinks.has(link)) {
        allProductLinks.set(link, defaultSubcat);
        newMainLinks++;
      }
    }

    console.log(`   ✅ ${mainLinks.length} produits trouvés (${newMainLinks} nouveaux)\n`);
  } catch (error) {
    console.log(`   ⚠️ Erreur: ${(error as Error).message}\n`);
  }

  const productEntries = Array.from(allProductLinks.entries());
  const toProcess = LIMIT ? productEntries.slice(0, LIMIT) : productEntries;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 TOTAL: ${toProcess.length} produits à scraper`);
  console.log(`${'═'.repeat(60)}\n`);

  // 6. Scraper chaque produit
  let count = 0;

  for (const [url, subcategory] of toProcess) {
    count++;
    stats.totalProducts++;

    const filename = url.split('/').pop()?.replace('.html', '') || url;
    console.log(`\n[${count}/${toProcess.length}] ${filename.substring(0, 50)}...`);

    const product = await scrapeProductPage(page, url, subcategory);

    if (!product || product.variants.length === 0) {
      stats.errors++;
      continue;
    }

    console.log(`   📦 ${product.name.substring(0, 50)}...`);
    console.log(`   🏷️  ${product.manufacturer || 'N/A'} | ${product.finish || 'Brut'}`);
    console.log(`   📊 ${product.variants.length} variante(s)`);

    // Déterminer la vraie catégorie
    const finalCategorySlug = determineCategoryFromName(product.name, product.subcategorySlug);
    const categoryId = categoryMap.get(finalCategorySlug);

    if (!categoryId) {
      console.log(`   ⚠️ Catégorie ${finalCategorySlug} non trouvée!`);
      stats.errors++;
      continue;
    }

    console.log(`   📁 Catégorie: ${finalCategorySlug}`);

    // Traiter chaque variante
    for (const variant of product.variants) {
      stats.totalVariants++;
      const reference = `BCB-${variant.supplierCode}`;

      console.log(`      → ${reference}: ${variant.thickness}mm ${variant.length}x${variant.width} - ${variant.pricePerM2 ? variant.pricePerM2 + '€/m²' : 'Prix N/A'} [${variant.stockStatus}]`);

      if (DRY_RUN) continue;

      try {
        // Vérifier si le panneau existe
        const existing = await prisma.panel.findUnique({
          where: {
            catalogueId_reference: { catalogueId: catalogue.id, reference }
          }
        });

        // Upload image vers R2 si nouvelle ou si pas d'image existante
        let imageUrl = product.imageUrl;
        if (product.imageUrl && (!existing?.imageUrl || !existing.imageUrl.includes('r2.dev'))) {
          const panelId = existing?.id || `new-${Date.now()}`;
          const r2Url = await uploadImageToR2(product.imageUrl, panelId);
          if (r2Url) {
            imageUrl = r2Url;
            stats.imagesUploaded++;
            console.log(`      ✅ Image uploadée`);
          }
        }

        // Upsert le panneau
        await prisma.panel.upsert({
          where: {
            catalogueId_reference: { catalogueId: catalogue.id, reference }
          },
          update: {
            name: product.name,
            description: product.description,
            thickness: [variant.thickness],
            defaultThickness: variant.thickness,
            defaultLength: variant.length || null,
            defaultWidth: variant.width || null,
            pricePerM2: variant.pricePerM2,
            stockStatus: variant.stockStatus,
            imageUrl: imageUrl || existing?.imageUrl,
            material: 'MDF',
            finish: product.finish,
            manufacturer: product.manufacturer,
            productType: product.productType,
            coreType: product.coreType,
            isHydrofuge: product.isHydrofuge,
            isIgnifuge: product.isIgnifuge,
            categoryId,
            panelType: 'MDF',
            panelSubType: 'MDF_BRUT'
          },
          create: {
            reference,
            name: product.name,
            description: product.description,
            thickness: [variant.thickness],
            defaultThickness: variant.thickness,
            defaultLength: variant.length || null,
            defaultWidth: variant.width || null,
            pricePerM2: variant.pricePerM2,
            stockStatus: variant.stockStatus,
            imageUrl,
            material: 'MDF',
            finish: product.finish,
            manufacturer: product.manufacturer,
            productType: product.productType,
            coreType: product.coreType,
            isHydrofuge: product.isHydrofuge,
            isIgnifuge: product.isIgnifuge,
            categoryId,
            catalogueId: catalogue.id,
            panelType: 'MDF',
            panelSubType: 'MDF_BRUT',
            isActive: true
          }
        });

        if (existing) {
          stats.updated++;
        } else {
          stats.created++;
        }
      } catch (error) {
        console.log(`      ❌ Erreur: ${(error as Error).message}`);
        stats.errors++;
      }
    }
  }

  // 7. Résumé final
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ FINAL                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`
  Produits scrapés:    ${stats.totalProducts}
  Variantes totales:   ${stats.totalVariants}
  Créés:               ${stats.created}
  Mis à jour:          ${stats.updated}
  Images uploadées:    ${stats.imagesUploaded}
  Erreurs:             ${stats.errors}
  `);

  if (DRY_RUN) {
    console.log('⚠️ MODE DRY-RUN: Aucune modification n\'a été faite');
  }

  // 8. Vérification finale
  if (!DRY_RUN) {
    console.log('\n═══ VÉRIFICATION FINALE ═══\n');

    const verification = await prisma.panel.groupBy({
      by: ['categoryId'],
      where: { productType: 'MDF' },
      _count: true
    });

    const catNames = await prisma.category.findMany({
      where: { id: { in: verification.map(v => v.categoryId).filter(Boolean) as string[] } },
      select: { id: true, slug: true }
    });
    const catNameMap = new Map(catNames.map(c => [c.id, c.slug]));

    console.log('Distribution des MDF par catégorie:');
    for (const v of verification.sort((a, b) => b._count - a._count)) {
      const catSlug = v.categoryId ? catNameMap.get(v.categoryId) || 'UNKNOWN' : 'AUCUNE';
      console.log(`  ${catSlug.padEnd(25)} ${v._count}`);
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Terminé!');
}

main().catch(console.error);
