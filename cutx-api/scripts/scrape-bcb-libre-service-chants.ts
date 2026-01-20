/**
 * Scraper BCB Libre-service - Chants
 *
 * Scrape les 3 catégories de chants depuis B comme Bois:
 * - Chants bois
 * - Chants mélaminés
 * - Chants ABS / PVC
 *
 * Usage:
 *   npx tsx scripts/scrape-bcb-libre-service-chants.ts           # Mode réel
 *   npx tsx scripts/scrape-bcb-libre-service-chants.ts --dry-run # Test sans écriture
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { PrismaClient, ProductSubType, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

// Mode dry-run via argument
const DRY_RUN = process.argv.includes('--dry-run');

// Catégories à scraper
const CHANT_CATEGORIES: Array<{
  name: string;
  url: string;
  subType: ProductSubType;
  key: string;
}> = [
  {
    name: 'Chants bois',
    url: 'https://www.bcommebois.fr/libre-service/chant/chants-bois.html',
    subType: ProductSubType.CHANT_BOIS,
    key: 'bois'
  },
  {
    name: 'Chants mélaminés',
    url: 'https://www.bcommebois.fr/libre-service/chant/chants-melamines.html',
    subType: ProductSubType.CHANT_MELAMINE,
    key: 'melamines'
  },
  {
    name: 'Chants ABS / PVC',
    url: 'https://www.bcommebois.fr/libre-service/chant/chants-abs-pvc.html',
    subType: ProductSubType.CHANT_ABS,
    key: 'abs'
  }
];

interface ChantVariant {
  length: number | null;
  width: number | null;
  thickness: number | null;
  price: number | null;
  priceType: 'ML' | 'PIECE' | null;
  stockStatus: string;
  supplierCode: string | null;
  supportQuality: string | null;
  isPreglued: boolean;
  isVariableLength: boolean;
}

interface ChantProduct {
  name: string;
  url: string;
  imageUrl: string | null;
  variants: ChantVariant[];
}

async function connectBrowser(): Promise<Browser> {
  return puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
}

async function scrapeProductLinks(page: Page, categoryUrl: string): Promise<string[]> {
  await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));
  await autoScroll(page);
  await new Promise(r => setTimeout(r, 1000));

  const links = await page.evaluate(() => {
    const productLinks = document.querySelectorAll('a[href*=".html"]');
    const urls: string[] = [];

    productLinks.forEach(link => {
      const href = (link as HTMLAnchorElement).href;
      const pathname = new URL(href).pathname;

      // FILTRE STRICT: Seuls les produits chants (URLs /chant-xxx.html)
      if (!pathname.startsWith('/chant-')) {
        return;
      }

      if (!urls.includes(href)) {
        urls.push(href);
      }
    });

    return urls;
  });

  return links;
}

async function scrapeProductDetails(page: Page, url: string): Promise<ChantProduct | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1500));
  } catch (e) {
    console.log(`  ⚠️ Erreur navigation: ${url}`);
    return null;
  }

  const result = await page.evaluate(() => {
    const debug: string[] = [];

    // Nom du produit
    const nameEl = document.querySelector('h1.page-title span, h1.page-title, .product-name h1');
    const name = nameEl?.textContent?.trim() || '';
    debug.push(`Name: ${name}`);

    // Image
    const imgEl = document.querySelector('.gallery-placeholder img, .product-image img, .fotorama__img');
    const imageUrl = imgEl?.getAttribute('src') || null;

    // Tableau des variantes
    const table = document.querySelector('table.data-table, table#product-options-table, table');
    const variants: ChantVariant[] = [];

    if (table) {
      const headers: string[] = [];
      const headerCells = table.querySelectorAll('thead th, tr:first-child th');
      headerCells.forEach(th => {
        headers.push(th.textContent?.trim().toLowerCase() || '');
      });
      debug.push(`Headers: ${headers.join(', ')}`);

      const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
      debug.push(`Rows found: ${rows.length}`);

      rows.forEach((row, rowIdx) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 3) return;

        const variant: ChantVariant = {
          length: null,
          width: null,
          thickness: null,
          price: null,
          priceType: null,
          stockStatus: 'Sur commande',
          supplierCode: null,
          supportQuality: null,
          isPreglued: false,
          isVariableLength: false
        };

        cells.forEach((cell, idx) => {
          const text = cell.textContent?.trim() || '';
          const lowerText = text.toLowerCase();
          const header = headers[idx] || '';

          // Matcher par header ou position (colonnes: long, larg, haut, qualite, code, stock, prix)
          if (header.includes('long') || idx === 0) {
            // Longueur
            if (lowerText.includes('rouleau') || lowerText.includes('variable')) {
              variant.isVariableLength = true;
            } else {
              const match = text.match(/(\d+(?:[.,]\d+)?)/);
              if (match) {
                variant.length = parseFloat(match[1].replace(',', '.'));
              }
            }
          } else if (header.includes('larg') || idx === 1) {
            // Largeur
            const match = text.match(/(\d+(?:[.,]\d+)?)/);
            if (match) {
              variant.width = parseFloat(match[1].replace(',', '.'));
            }
          } else if (header.includes('haut') || header.includes('epais') || idx === 2) {
            // Épaisseur
            const match = text.match(/(\d+(?:[.,]\d+)?)/);
            if (match) {
              variant.thickness = parseFloat(match[1].replace(',', '.'));
            }
          } else if (header.includes('qualit') || idx === 3) {
            // Qualité - aussi détecter préencollé ici
            variant.supportQuality = text;
            if (lowerText.includes('préencollé') || lowerText.includes('preencollé') || lowerText.includes('pre-encolle')) {
              variant.isPreglued = true;
            }
          } else if (header.includes('code') || idx === 4) {
            // Code fournisseur
            variant.supplierCode = text || null;
          } else if (header.includes('stock') || idx === 5) {
            // Stock
            variant.stockStatus = lowerText.includes('stock') ? 'EN STOCK' : 'Sur commande';
          } else if (header.includes('prix') || idx === 6) {
            // Prix
            const priceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*€/);
            if (priceMatch) {
              variant.price = parseFloat(priceMatch[1].replace(',', '.'));
            }
            if (lowerText.includes('/ml') || lowerText.includes('ml')) {
              variant.priceType = 'ML';
            } else {
              variant.priceType = 'PIECE';
            }
          }
        });

        // Vérifier aussi dans le nom du produit pour préencollé
        if (name.toLowerCase().includes('préencollé') || name.toLowerCase().includes('preencollé')) {
          variant.isPreglued = true;
        }

        if (variant.width || variant.length || variant.supplierCode) {
          variants.push(variant);
        }
      });
    }

    return { name, imageUrl, variants, debug };
  });

  if (!result.name) {
    return null;
  }

  return {
    name: result.name,
    url,
    imageUrl: result.imageUrl,
    variants: result.variants
  };
}

async function main() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 MODE DRY-RUN (aucune écriture)' : '🚀 MODE RÉEL (écriture en base)');
  console.log('═'.repeat(60));
  console.log('');

  // Trouver le catalogue BCB (slug: bouney)
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' }
  });

  if (!catalogue) {
    console.error('❌ Catalogue "bouney" non trouvé');
    process.exit(1);
  }

  console.log(`📦 Catalogue: ${catalogue.name} (${catalogue.id})`);
  console.log('');

  const browser = await connectBrowser();
  const page = await browser.newPage();

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const category of CHANT_CATEGORIES) {
    console.log('─'.repeat(60));
    console.log(`📂 ${category.name}`);
    console.log(`   URL: ${category.url}`);
    console.log('─'.repeat(60));

    // Récupérer les liens produits
    const productUrls = await scrapeProductLinks(page, category.url);
    console.log(`   📋 ${productUrls.length} produits trouvés`);
    console.log('');

    let categoryCreated = 0;
    let categorySkipped = 0;

    for (const productUrl of productUrls) {
      const product = await scrapeProductDetails(page, productUrl);

      if (!product || product.variants.length === 0) {
        console.log(`   ⚠️ Pas de variantes: ${productUrl}`);
        continue;
      }

      console.log(`   📦 ${product.name} (${product.variants.length} variantes)`);

      for (const variant of product.variants) {
        // Générer une référence unique
        const refParts = [
          'BCB',
          category.key.toUpperCase().slice(0, 3),
          product.name.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
          variant.width ? `W${variant.width}` : '',
          variant.thickness ? `T${variant.thickness}` : '',
          variant.isPreglued ? 'PRE' : '',
          variant.supplierCode || ''
        ].filter(Boolean);

        const reference = refParts.join('-').slice(0, 50);

        // Construire le nom complet
        const nameParts = [product.name];
        if (variant.width) nameParts.push(`${variant.width}mm`);
        if (variant.thickness) nameParts.push(`ép.${variant.thickness}mm`);
        if (variant.isPreglued) nameParts.push('(préencollé)');
        if (variant.isVariableLength) nameParts.push('(rouleau)');
        const fullName = nameParts.join(' ');

        // Vérifier si existe déjà
        const existing = await prisma.panel.findFirst({
          where: {
            catalogueId: catalogue.id,
            OR: [
              { reference },
              { supplierCode: variant.supplierCode || undefined }
            ]
          }
        });

        if (existing) {
          categorySkipped++;
          continue;
        }

        const panelData = {
          reference,
          name: fullName,
          catalogueId: catalogue.id,
          panelType: ProductType.CHANT,
          panelSubType: category.subType,
          defaultLength: Math.round(variant.isVariableLength ? 0 : (variant.length || 0)),
          defaultWidth: Math.round(variant.width || 0),
          defaultThickness: variant.thickness || null,
          isVariableLength: variant.isVariableLength,
          stockStatus: variant.stockStatus,
          pricePerMl: variant.priceType === 'ML' ? variant.price : null,
          pricePerUnit: variant.priceType === 'PIECE' ? variant.price : null,
          supportQuality: variant.supportQuality,
          isPreglued: variant.isPreglued,
          supplierCode: variant.supplierCode,
          imageUrl: product.imageUrl
        };

        if (DRY_RUN) {
          console.log(`      ✅ [DRY] Créerait: ${reference}`);
          console.log(`         Nom: ${fullName}`);
          console.log(`         Dims: ${variant.length || 'var'}x${variant.width}x${variant.thickness}mm`);
          console.log(`         Préencollé: ${variant.isPreglued ? 'Oui' : 'Non'}`);
          console.log(`         Stock: ${variant.stockStatus}`);
        } else {
          await prisma.panel.create({ data: panelData });
          console.log(`      ✅ Créé: ${reference}`);
        }

        categoryCreated++;
      }
    }

    console.log('');
    console.log(`   📊 ${category.name}: ${categoryCreated} créés, ${categorySkipped} ignorés`);
    totalCreated += categoryCreated;
    totalSkipped += categorySkipped;
  }

  await page.close();

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log(`   Créés: ${totalCreated}`);
  console.log(`   Ignorés (existants): ${totalSkipped}`);
  console.log(`   Total traités: ${totalCreated + totalSkipped}`);
  console.log('');

  await prisma.$disconnect();
}

main().catch(console.error);
