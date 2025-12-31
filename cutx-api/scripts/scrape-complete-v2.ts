/**
 * SCRAPING COMPLET V2 - B comme Bois
 *
 * Récupère TOUTES les informations produit:
 * - Ref Fabriquant, Nom, Dimensions, Qualité/Support
 * - Code fournisseur, Stock (avec localisation), Prix
 * - Décor/essence, Coloris/choix, Finition, Certification
 *
 * Structure du site:
 * - Page catégorie: liste de produits avec tableau de variantes
 * - Chaque ligne = une variante (MÉLAMINÉ, STRATIFIÉ, BANDE DE CHANT)
 * - Page détail: caractéristiques techniques complètes
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Stock locations avec leurs couleurs
const STOCK_LOCATIONS = {
  'Bouney, Anglet': 'yellow',
  'Beaumartin, Bruges': 'green',
  'Batibois, Gaillac': 'blue',
  'Batibois, Rodez': 'red',
  'Sur commande': 'gray'
};

interface ProductVariant {
  // Identification
  reference: string;        // Code fournisseur (79133)
  manufacturerRef: string;  // Ref fabricant (005)
  name: string;             // Nom complet

  // Dimensions
  length: number;           // Longueur en mm
  width: number;            // Largeur en mm
  thickness: number;        // Épaisseur en mm
  isVariableLength: boolean;

  // Type et qualité
  productType: string;      // MELAMINE, STRATIFIE, BANDE_DE_CHANT
  supportQuality: string;   // "panneau de particules standard P2"
  material: string;         // Type de matériau

  // Prix
  pricePerM2: number | null;
  pricePerMl: number | null;
  pricePerUnit: number | null;

  // Stock
  stockStatus: string;
  stockLocations: { location: string; inStock: boolean }[];

  // Caractéristiques
  decor: string | null;
  colorChoice: string | null;
  finish: string | null;
  certification: string | null;

  // Image
  imageUrl: string | null;
}

interface ProductPageData {
  // En-tête produit
  manufacturerRef: string;  // "005"
  productName: string;      // "Polyrey noir classique FA"

  // Variantes (tableau)
  variants: ProductVariant[];

  // Caractéristiques techniques (page détail)
  technicalSpecs: {
    decor?: string;
    colorChoice?: string;
    finish?: string;
    certification?: string;
  };

  imageUrl: string | null;
}

/**
 * Parse le stock depuis une cellule du tableau
 * Retourne le statut et les localisations
 */
function parseStock(stockCell: string): { status: string; locations: { location: string; inStock: boolean }[] } {
  const locations: { location: string; inStock: boolean }[] = [];

  // Détecter "EN STOCK" ou "Sur commande"
  const isEnStock = stockCell.toLowerCase().includes('en stock');
  const status = isEnStock ? 'EN STOCK' : 'Sur commande';

  // Pour l'instant, on ne peut pas parser les locations depuis le texte seul
  // Il faudrait le faire via les classes CSS/couleurs dans le scraping réel

  return { status, locations };
}

/**
 * Parse le prix depuis une cellule
 * Détecte le type: €/m², €/ml, € unitaire
 */
function parsePrice(priceCell: string): { perM2: number | null; perMl: number | null; perUnit: number | null } {
  const result = { perM2: null as number | null, perMl: null as number | null, perUnit: null as number | null };

  // Nettoyer et extraire le nombre
  const priceMatch = priceCell.match(/([\d,\.]+)\s*€/);
  if (!priceMatch) return result;

  const price = parseFloat(priceMatch[1].replace(',', '.'));

  // Détecter le type
  if (priceCell.includes('/m2') || priceCell.includes('€/m²')) {
    result.perM2 = price;
  } else if (priceCell.includes('/ml') || priceCell.includes('€/ml')) {
    result.perMl = price;
  } else {
    // Par défaut, considérer comme prix au m²
    result.perM2 = price;
  }

  return result;
}

/**
 * Scrape une page produit complète
 */
async function scrapeProductPage(page: Page, url: string): Promise<ProductPageData | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      const result: any = {
        manufacturerRef: '',
        productName: '',
        variants: [],
        technicalSpecs: {},
        imageUrl: null
      };

      // === EN-TÊTE PRODUIT ===
      // Ref fabricant (ex: "005")
      const refElement = document.querySelector('.product-info-main .product-attribute-code, .product-info-main .sku .value');
      if (refElement) {
        result.manufacturerRef = refElement.textContent?.trim() || '';
      }

      // Chercher dans le breadcrumb ou titre
      const titleElement = document.querySelector('h1.page-title span, .product-info-main h1');
      if (titleElement) {
        result.productName = titleElement.textContent?.trim() || '';
      }

      // Image produit
      const imgElement = document.querySelector('.gallery-placeholder img, .product-image-photo') as HTMLImageElement;
      if (imgElement) {
        result.imageUrl = imgElement.src || imgElement.getAttribute('data-src');
      }

      // === TABLEAU DES VARIANTES ===
      // Chercher les sections MÉLAMINÉ, STRATIFIÉ, BANDE DE CHANT
      const productSections = document.querySelectorAll('.product-options-wrapper table, .product-info-main table, table.data-table');

      productSections.forEach(table => {
        // Trouver le type de produit (header de section)
        let productType = 'MELAMINE';
        const prevSibling = table.previousElementSibling;
        if (prevSibling) {
          const sectionTitle = prevSibling.textContent?.toUpperCase() || '';
          if (sectionTitle.includes('STRATIFIÉ')) productType = 'STRATIFIE';
          else if (sectionTitle.includes('CHANT')) productType = 'BANDE_DE_CHANT';
          else if (sectionTitle.includes('COMPACT')) productType = 'COMPACT';
        }

        // Parser les lignes du tableau
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 6) return;

          // Structure: LONG | LARG | HAUT | QUALITÉ/SUPPORT | CODE | STOCK | PRIX
          const variant: any = {
            productType,
            length: 0,
            width: 0,
            thickness: 0,
            isVariableLength: false,
            supportQuality: '',
            reference: '',
            stockStatus: '',
            stockLocations: [],
            pricePerM2: null,
            pricePerMl: null,
            pricePerUnit: null
          };

          // Parser chaque cellule selon sa position
          cells.forEach((cell, idx) => {
            const text = cell.textContent?.trim() || '';
            const header = table.querySelector(`thead th:nth-child(${idx + 1})`)?.textContent?.toLowerCase() || '';

            if (header.includes('long') || idx === 0) {
              if (text.toLowerCase() === 'variable') {
                variant.isVariableLength = true;
              } else {
                // Convertir de mètres en mm si nécessaire
                const val = parseFloat(text.replace(',', '.'));
                variant.length = val < 100 ? Math.round(val * 1000) : Math.round(val);
              }
            } else if (header.includes('larg') || idx === 1) {
              const val = parseFloat(text.replace(',', '.'));
              variant.width = val < 100 ? Math.round(val * 1000) : Math.round(val);
            } else if (header.includes('haut') || header.includes('épais') || idx === 2) {
              variant.thickness = parseFloat(text.replace(',', '.')) || 0;
            } else if (header.includes('qualit') || header.includes('support') || idx === 3) {
              variant.supportQuality = text;
            } else if (header.includes('code') || idx === 4) {
              variant.reference = text;
            } else if (header.includes('stock') || idx === 5) {
              // Parser le stock
              const stockIndicator = cell.querySelector('.stock-indicator, .availability');
              if (stockIndicator) {
                variant.stockStatus = stockIndicator.classList.contains('in-stock') ? 'EN STOCK' : 'Sur commande';
              } else {
                variant.stockStatus = text.toLowerCase().includes('stock') ? 'EN STOCK' : 'Sur commande';
              }

              // Chercher les indicateurs de localisation (points colorés)
              const locationDots = cell.querySelectorAll('.stock-location, .location-dot, span[class*="stock"]');
              locationDots.forEach(dot => {
                const className = dot.className || '';
                const title = dot.getAttribute('title') || dot.textContent?.trim() || '';
                if (title) {
                  variant.stockLocations.push({
                    location: title,
                    inStock: !className.includes('out') && !className.includes('commande')
                  });
                }
              });
            } else if (header.includes('prix') || idx === 6) {
              const priceText = text;
              const priceVal = parseFloat(priceText.replace(',', '.').replace(/[^\d.]/g, ''));
              if (!isNaN(priceVal)) {
                if (priceText.includes('/ml') || priceText.includes('€/ml')) {
                  variant.pricePerMl = priceVal;
                } else {
                  variant.pricePerM2 = priceVal;
                }
              }
            }
          });

          if (variant.reference) {
            result.variants.push(variant);
          }
        });
      });

      // === CARACTÉRISTIQUES TECHNIQUES ===
      // Chercher dans la section "Caractéristiques techniques"
      const specRows = document.querySelectorAll('.product-info-main .additional-attributes tr, .product.attribute tr, .data.table.additional-attributes tr');
      specRows.forEach(row => {
        const label = row.querySelector('th, td:first-child')?.textContent?.toLowerCase().trim() || '';
        const value = row.querySelector('td:last-child, td.data')?.textContent?.trim() || '';

        if (label.includes('décor') || label.includes('essence')) {
          result.technicalSpecs.decor = value;
        } else if (label.includes('coloris') || label.includes('choix')) {
          result.technicalSpecs.colorChoice = value;
        } else if (label.includes('finition')) {
          result.technicalSpecs.finish = value;
        } else if (label.includes('certification')) {
          result.technicalSpecs.certification = value;
        }
      });

      return result;
    });

    return data;
  } catch (error) {
    console.error(`   ❌ Erreur scraping ${url}:`, error);
    return null;
  }
}

/**
 * Scrape une page de catégorie et récupère les liens produits
 */
async function scrapeCategoryPage(page: Page, url: string): Promise<string[]> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll pour charger tous les produits (lazy loading)
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 1000);
        await new Promise(r => setTimeout(r, 500));
      }
    });

    const productLinks = await page.evaluate(() => {
      const links: string[] = [];

      // Sélecteurs possibles pour les liens produits
      const selectors = [
        'a.product-item-link',
        '.product-item a[href*=".html"]',
        '.products-grid a[href*=".html"]',
        '.product-items a[href*=".html"]'
      ];

      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(el => {
          const href = (el as HTMLAnchorElement).href;
          if (href && href.includes('.html') && !href.includes('/agencement/') && !links.includes(href)) {
            links.push(href);
          }
        });
      }

      return links;
    });

    return productLinks;
  } catch (error) {
    console.error(`   ❌ Erreur catégorie ${url}:`, error);
    return [];
  }
}

/**
 * Test sur une seule page produit
 */
async function testSingleProduct(productUrl: string) {
  console.log('═'.repeat(70));
  console.log('🧪 TEST SCRAPING - PAGE UNIQUE');
  console.log('═'.repeat(70));
  console.log(`\n📍 URL: ${productUrl}\n`);

  // Connexion Chrome
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

  // Scraper la page
  const data = await scrapeProductPage(page, productUrl);

  if (!data) {
    console.log('❌ Aucune donnée récupérée');
    await browser.disconnect();
    return;
  }

  // Afficher les résultats
  console.log('📦 DONNÉES RÉCUPÉRÉES:');
  console.log('─'.repeat(50));
  console.log(`   Ref Fabricant: ${data.manufacturerRef || '(non trouvé)'}`);
  console.log(`   Nom produit: ${data.productName || '(non trouvé)'}`);
  console.log(`   Image: ${data.imageUrl ? '✅' : '❌'}`);

  console.log('\n📋 VARIANTES:');
  if (data.variants.length === 0) {
    console.log('   (aucune variante trouvée)');
  } else {
    data.variants.forEach((v, i) => {
      console.log(`\n   [${i + 1}] ${v.productType}`);
      console.log(`       Code: ${v.reference}`);
      console.log(`       Dimensions: ${v.length}x${v.width}mm, ép. ${v.thickness}mm`);
      console.log(`       Support: ${v.supportQuality || '(non trouvé)'}`);
      console.log(`       Stock: ${v.stockStatus}`);
      console.log(`       Prix: ${v.pricePerM2 ? v.pricePerM2 + '€/m²' : v.pricePerMl ? v.pricePerMl + '€/ml' : '(non trouvé)'}`);
    });
  }

  console.log('\n📊 CARACTÉRISTIQUES TECHNIQUES:');
  console.log(`   Décor/Essence: ${data.technicalSpecs.decor || '(non trouvé)'}`);
  console.log(`   Coloris/Choix: ${data.technicalSpecs.colorChoice || '(non trouvé)'}`);
  console.log(`   Finition: ${data.technicalSpecs.finish || '(non trouvé)'}`);
  console.log(`   Certification: ${data.technicalSpecs.certification || '(non trouvé)'}`);

  console.log('\n' + '═'.repeat(70));

  await browser.disconnect();
}

// Exécution
const testUrl = process.argv[2] || 'https://www.bcommebois.fr/melamine-19-mm-005-fa-polyrey-noir-classique.html';
testSingleProduct(testUrl);
