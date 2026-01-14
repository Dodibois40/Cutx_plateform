/**
 * Scraping Compacts B comme Bois
 *
 * Source: https://www.bcommebois.fr/agencement/plans-de-travail/compacts.html
 * Sous-catégories: Unis, Bois, Matières
 *
 * Ce script extrait TOUTES les informations nécessaires pour chaque déclinaison:
 * - Code produit (supplierCode)
 * - Code coloris (manufacturerRef, decorCode, colorChoice)
 * - Certification
 * - Dimensions, prix, stock
 *
 * Usage:
 * 1. Lancer Chrome Debug: scripts/launch-chrome-debug.bat
 * 2. Se connecter sur bcommebois.fr
 * 3. Lancer: npx tsx scripts/scrape-compacts-bouney.ts
 */

import puppeteer, { Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAIN_URL = 'https://www.bcommebois.fr/agencement/plans-de-travail/compacts.html';
const SUBCATEGORIES = [
  { name: 'Compacts Unis', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/compacts/unis.html' },
  { name: 'Compacts Bois', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/compacts/bois.html' },
  { name: 'Compacts Matières', url: 'https://www.bcommebois.fr/agencement/plans-de-travail/compacts/matieres.html' },
];

interface Declinaison {
  longueur: number;
  largeur: number;
  epaisseur: number;
  codeColoris: string;  // Ex: 0720, N105, C148
  codeProduit: string;  // Ex: 80193, 93684
  stock: string;
  prix: number | null;
}

interface ProduitCompact {
  nom: string;
  marque: string;
  finish: string | null;
  imageUrl: string | null;
  certification: string | null;
  declinaisons: Declinaison[];
}

interface Stats {
  totalProducts: number;
  totalDeclinaisons: number;
  created: number;
  updated: number;
  errors: number;
  bySubcategory: Map<string, number>;
}

/**
 * Scroll complet avec lazy loading
 */
async function scrollToBottom(page: Page): Promise<void> {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let attempts = 0;

  while (previousHeight !== currentHeight && attempts < 10) {
    previousHeight = currentHeight;
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 500;
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
    await new Promise(r => setTimeout(r, 2000));
    currentHeight = await page.evaluate(() => document.body.scrollHeight);
    attempts++;
  }
}

/**
 * Récupère tous les liens produits d'une page
 */
async function getProductLinks(page: Page, url: string): Promise<string[]> {
  console.log(`\n📋 Chargement: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    console.log('   ⚠️ Timeout, on continue...');
  }
  await new Promise(r => setTimeout(r, 3000));

  console.log('   📜 Scroll pour charger tous les produits...');
  await scrollToBottom(page);

  const links = await page.evaluate(() => {
    const productLinks: string[] = [];
    const productItems = document.querySelectorAll('.product-item, .item.product');

    productItems.forEach(item => {
      const linkEl = item.querySelector('a.product-item-link, a.product-item-photo, a[href*=".html"]');
      const nameEl = item.querySelector('.product-item-name a, .product-name a');
      const link = linkEl?.getAttribute('href') || nameEl?.getAttribute('href');

      if (link && !productLinks.includes(link)) {
        productLinks.push(link);
      }
    });

    return productLinks;
  });

  console.log(`   ✅ ${links.length} produits trouvés`);
  return links;
}

/**
 * Scrape un produit compact avec toutes ses déclinaisons
 */
async function scrapeProduct(page: Page, url: string): Promise<ProduitCompact | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      const result: any = {};

      // Titre
      const titleEl = document.querySelector('h1.page-title span, h1.product-name, h1');
      result.nom = titleEl?.textContent?.trim() || '';

      // Marque (chercher dans le nom)
      const nomLower = result.nom.toLowerCase();
      if (nomLower.includes('egger')) result.marque = 'Egger';
      else if (nomLower.includes('kronospan')) result.marque = 'Kronospan';
      else if (nomLower.includes('finsa')) result.marque = 'Finsa';
      else if (nomLower.includes('polyrey')) result.marque = 'Polyrey';
      else if (nomLower.includes('duropal')) result.marque = 'Duropal';
      else if (nomLower.includes('fenix')) result.marque = 'Fenix';
      else if (nomLower.includes('reysitop')) result.marque = 'Polyrey';
      else result.marque = 'B comme Bois';

      // Finition (chercher dans le nom et la page)
      const bodyText = document.body.innerText;
      const finitionMatch = bodyText.match(/finition[:\s]+([^\n,\.]{3,30})/i);
      if (finitionMatch) {
        result.finish = finitionMatch[1].trim();
      } else if (nomLower.includes(' mat')) {
        result.finish = 'Mat';
      } else if (nomLower.includes('ntm') || nomLower.includes('nano tech')) {
        result.finish = 'Nano Tech Matt';
      }

      // Image
      result.imageUrl = '';
      const imgSelectors = [
        '.fotorama__stage__frame img',
        '.gallery-placeholder img',
        'img.gallery-placeholder__image'
      ];
      for (const sel of imgSelectors) {
        const img = document.querySelector(sel) as HTMLImageElement;
        if (img?.src && img.src.includes('bcommebois') && !img.src.includes('placeholder')) {
          result.imageUrl = img.src;
          break;
        }
      }

      // Certification
      result.certification = null;
      const certifMatch = bodyText.match(/FSC[^,\.\n]{0,20}|PEFC/i);
      if (certifMatch) {
        result.certification = certifMatch[0].trim();
      }

      // Déclinaisons depuis les tableaux
      result.declinaisons = [];
      const tables = document.querySelectorAll('table');

      for (const table of tables) {
        const rows = table.querySelectorAll('tbody tr, tr');

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 3) {
            const cellTexts = Array.from(cells).map(c => c.textContent?.trim() || '');

            let longueur = 0, largeur = 0, epaisseur = 0;
            let codeColoris = '', codeProduit = '', stock = '', prix: number | null = null;

            // Parser les dimensions (colonnes 0, 1, 2 généralement)
            for (let i = 0; i < Math.min(3, cellTexts.length); i++) {
              const text = cellTexts[i];
              const numMatch = text.match(/[\d.,]+/);
              if (numMatch) {
                const val = parseFloat(numMatch[0].replace(',', '.'));
                if (i === 0) longueur = val < 100 ? Math.round(val * 1000) : Math.round(val);
                else if (i === 1) largeur = val < 100 ? Math.round(val * 1000) : Math.round(val);
                else if (i === 2) epaisseur = parseFloat(numMatch[0].replace(',', '.'));
              }
            }

            // Chercher les codes
            for (const text of cellTexts) {
              // Code produit (5-6 chiffres)
              if (/^\d{5,6}$/.test(text.replace(/\s/g, ''))) {
                codeProduit = text.replace(/\s/g, '');
              }
              // Code coloris (pattern: lettre + chiffres ou juste chiffres)
              else if (/^[A-Z]?\d{3,5}$/.test(text.replace(/\s/g, ''))) {
                codeColoris = text.replace(/\s/g, '');
              }
              // Stock
              else if (text.toLowerCase().includes('stock') || text.toLowerCase().includes('commande')) {
                stock = text.includes('EN STOCK') || text.toLowerCase().includes('en stock')
                  ? 'EN STOCK' : 'Sur commande';
              }
              // Prix
              else if (text.includes('€')) {
                const priceMatch = text.match(/[\d.,]+/);
                if (priceMatch) prix = parseFloat(priceMatch[0].replace(',', '.'));
              }
            }

            // Si on a au moins un code et des dimensions
            if ((codeProduit || codeColoris) && (longueur > 0 || epaisseur > 0)) {
              result.declinaisons.push({
                longueur,
                largeur,
                epaisseur,
                codeColoris: codeColoris || '',
                codeProduit: codeProduit || '',
                stock: stock || 'Sur commande',
                prix
              });
            }
          }
        }
      }

      // Si pas de tableau, créer une déclinaison unique
      if (result.declinaisons.length === 0) {
        let codeProduit = '';
        const refEl = document.querySelector('.product.attribute.sku .value, [itemprop="sku"]');
        if (refEl?.textContent) {
          const refMatch = refEl.textContent.trim().match(/(\d{5,6})/);
          if (refMatch) codeProduit = refMatch[1];
        }

        // Chercher code coloris dans le nom ou body
        let codeColoris = '';
        const colorisMatches = bodyText.match(/\b([A-Z]?\d{3,5})\b/g);
        if (colorisMatches && colorisMatches.length > 0) {
          // Prendre le premier qui n'est pas le code produit
          for (const code of colorisMatches) {
            if (code !== codeProduit) {
              codeColoris = code;
              break;
            }
          }
        }

        // Dimensions depuis le nom
        let longueur = 0, largeur = 0, epaisseur = 0;
        const dimMatch = result.nom.match(/(\d{3,4})\s*x\s*(\d{3,4})\s*x?\s*(\d+\.?\d*)/i);
        if (dimMatch) {
          longueur = parseInt(dimMatch[1]);
          largeur = parseInt(dimMatch[2]);
          epaisseur = parseFloat(dimMatch[3]);
        } else {
          const epMatch = result.nom.match(/(\d+\.?\d*)\s*mm/);
          if (epMatch) epaisseur = parseFloat(epMatch[1]);
        }

        // Prix
        let prix: number | null = null;
        const priceEl = document.querySelector('[data-price-type="finalPrice"] .price, .price-box .price');
        if (priceEl?.textContent) {
          const priceText = priceEl.textContent.replace(/[^\d,\.]/g, '').replace(',', '.');
          const parsed = parseFloat(priceText);
          if (parsed > 0) prix = parsed;
        }

        // Stock
        let stock = 'Sur commande';
        if (bodyText.toLowerCase().includes('en stock')) stock = 'EN STOCK';

        if (codeProduit || codeColoris) {
          result.declinaisons.push({
            longueur,
            largeur,
            epaisseur,
            codeColoris: codeColoris || '',
            codeProduit: codeProduit || `REF-${Date.now()}`,
            stock,
            prix
          });
        }
      }

      return result;
    });

    if (!data.nom || data.declinaisons.length === 0) {
      return null;
    }

    return {
      nom: data.nom,
      marque: data.marque,
      finish: data.finish,
      imageUrl: data.imageUrl,
      certification: data.certification,
      declinaisons: data.declinaisons
    };
  } catch (error) {
    console.log(`      ❌ Erreur: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('🪵 SCRAPING COMPACTS B COMME BOIS');
  console.log('==========================================');
  console.log('📦 Catégories: Unis, Bois, Matières');
  console.log('==========================================\n');

  console.log('🔌 Connexion à Chrome Debug...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null,
    });
  } catch (e) {
    console.error('❌ Impossible de se connecter à Chrome Debug.');
    console.error('   Lancez: scripts/launch-chrome-debug.bat');
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  console.log('✅ Connecté!\n');

  const stats: Stats = {
    totalProducts: 0,
    totalDeclinaisons: 0,
    created: 0,
    updated: 0,
    errors: 0,
    bySubcategory: new Map()
  };

  // Récupérer le catalogue
  console.log('📦 Récupération du catalogue Bouney...');
  let catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.error('❌ Catalogue Bouney non trouvé!');
    process.exit(1);
  }
  console.log(`   ✅ ${catalogue.name}\n`);

  // Catégorie principale
  let mainCategory = await prisma.category.findFirst({
    where: {
      catalogueId: catalogue.id,
      slug: 'compacts'
    }
  });

  if (!mainCategory) {
    mainCategory = await prisma.category.create({
      data: {
        name: 'Compacts',
        slug: 'compacts',
        catalogueId: catalogue.id
      }
    });
  }
  console.log(`   📂 Catégorie: ${mainCategory.name}\n`);

  // Collecter tous les produits
  const allProductLinks = new Map<string, string>();

  for (const subcat of SUBCATEGORIES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📂 ${subcat.name}`);
    console.log(`${'='.repeat(60)}`);

    const links = await getProductLinks(page, subcat.url);

    for (const link of links) {
      if (!allProductLinks.has(link)) {
        allProductLinks.set(link, subcat.name);
      }
    }

    stats.bySubcategory.set(subcat.name, links.length);
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`📊 TOTAL: ${allProductLinks.size} produits uniques`);
  console.log(`${'='.repeat(60)}\n`);

  // Scraper chaque produit
  let count = 0;

  for (const [url, subcatName] of allProductLinks) {
    count++;
    stats.totalProducts++;
    const filename = url.split('/').pop() || url;

    if (count % 5 === 0 || count === 1) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📈 ${count}/${allProductLinks.size} (${Math.round(count/allProductLinks.size*100)}%)`);
      console.log(`${'─'.repeat(50)}`);
    }

    console.log(`\n[${count}] ${filename.substring(0, 60)}...`);

    const product = await scrapeProduct(page, url);

    if (product && product.declinaisons.length > 0) {
      console.log(`   📦 ${product.nom.substring(0, 50)}...`);
      console.log(`   🏷️  ${product.marque} | ${product.finish || 'N/A'}`);
      console.log(`   📊 ${product.declinaisons.length} déclinaisons`);

      for (const decl of product.declinaisons) {
        try {
          const reference = `BCB-PDT-${decl.codeProduit}`;

          await prisma.panel.upsert({
            where: {
              catalogueId_reference: { catalogueId: catalogue.id, reference }
            },
            update: {
              name: product.nom,
              material: 'Compact',
              finish: product.finish,
              productType: 'COMPACT',
              thickness: decl.epaisseur > 0 ? [decl.epaisseur] : [],
              defaultThickness: decl.epaisseur > 0 ? decl.epaisseur : null,
              defaultLength: decl.longueur,
              defaultWidth: decl.largeur,
              pricePerM2: decl.prix,
              stockStatus: decl.stock,
              imageUrl: product.imageUrl || null,
              manufacturer: product.marque,
              manufacturerRef: decl.codeColoris || null,
              supplierCode: decl.codeProduit || null,
              decorCode: decl.codeColoris || null,
              colorChoice: decl.codeColoris || null,
              certification: product.certification,
              isActive: true,
              categoryId: mainCategory.id
            },
            create: {
              reference,
              name: product.nom,
              material: 'Compact',
              finish: product.finish,
              productType: 'COMPACT',
              thickness: decl.epaisseur > 0 ? [decl.epaisseur] : [],
              defaultThickness: decl.epaisseur > 0 ? decl.epaisseur : null,
              defaultLength: decl.longueur,
              defaultWidth: decl.largeur,
              pricePerM2: decl.prix,
              stockStatus: decl.stock,
              imageUrl: product.imageUrl || null,
              manufacturer: product.marque,
              manufacturerRef: decl.codeColoris || null,
              supplierCode: decl.codeProduit || null,
              decorCode: decl.codeColoris || null,
              colorChoice: decl.codeColoris || null,
              certification: product.certification,
              isActive: true,
              catalogueId: catalogue.id,
              categoryId: mainCategory.id
            }
          });

          stats.totalDeclinaisons++;
          stats.created++;
          console.log(`      ✅ ${reference} | Coloris: ${decl.codeColoris || 'N/A'} | ${decl.epaisseur}mm`);
        } catch (err) {
          stats.errors++;
          console.log(`      ❌ ${(err as Error).message}`);
        }
      }
    } else {
      console.log(`   ⚠️ Aucune déclinaison exploitable`);
      stats.errors++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 RÉSUMÉ SCRAPING COMPACTS');
  console.log(`${'='.repeat(60)}`);
  console.log(`📦 Produits: ${stats.totalProducts}`);
  console.log(`📋 Déclinaisons: ${stats.totalDeclinaisons}`);
  console.log(`✅ Créés/MAJ: ${stats.created}`);
  console.log(`❌ Erreurs: ${stats.errors}`);
  console.log(`\n📂 Par sous-catégorie:`);
  for (const [cat, count] of stats.bySubcategory) {
    console.log(`   - ${cat}: ${count} produits`);
  }
  console.log(`${'='.repeat(60)}\n`);

  await prisma.$disconnect();
  console.log('✅ Scraping terminé!');
}

main().catch((e) => {
  console.error('❌ Erreur:', e);
  prisma.$disconnect();
  process.exit(1);
});
