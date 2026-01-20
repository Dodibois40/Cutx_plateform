/**
 * Met à jour les chants BCB avec les images et prix manquants
 *
 * Usage:
 *   npx tsx scripts/update-bcb-chants-images-prix.ts           # Mode réel
 *   npx tsx scripts/update-bcb-chants-images-prix.ts --dry-run # Test
 */

import puppeteer, { Browser, Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// URLs des catégories à re-scraper
const CATEGORIES = [
  'https://www.bcommebois.fr/libre-service/chant/chants-bois.html',
  'https://www.bcommebois.fr/libre-service/chant/chants-melamines.html',
  'https://www.bcommebois.fr/libre-service/chant/chants-abs-pvc.html',
];

interface VariantData {
  supplierCode: string;
  price: number | null;
  priceType: 'ML' | 'PIECE' | 'RLX' | null;
}

interface ProductData {
  imageUrl: string | null;
  variants: VariantData[];
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

  const links = await page.evaluate(() => {
    const productLinks = document.querySelectorAll('a[href*=".html"]');
    const urls: string[] = [];
    productLinks.forEach(link => {
      const href = (link as HTMLAnchorElement).href;
      const pathname = new URL(href).pathname;
      if (pathname.startsWith('/chant-') && !urls.includes(href)) {
        urls.push(href);
      }
    });
    return urls;
  });

  return links;
}

async function scrapeProductData(page: Page, url: string): Promise<ProductData | null> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    return null;
  }

  const result = await page.evaluate(() => {
    // Image - essayer plusieurs sélecteurs
    let imageUrl: string | null = null;
    const imgSelectors = [
      '.fotorama__stage__frame img',
      '.fotorama__img',
      '.gallery-placeholder img',
      '.product-image-container img',
      '.product.media img',
      'img[itemprop="image"]',
      '.product-image img'
    ];

    for (const selector of imgSelectors) {
      const img = document.querySelector(selector);
      if (img) {
        const src = img.getAttribute('src') || img.getAttribute('data-src');
        if (src && !src.includes('placeholder')) {
          imageUrl = src;
          break;
        }
      }
    }

    // Tableau des variantes
    const table = document.querySelector('table');
    const variants: VariantData[] = [];

    if (table) {
      const rows = table.querySelectorAll('tbody tr');

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;

        // Trouver la colonne CODE et PRIX
        let codeIdx = -1;
        let priceIdx = -1;

        // Chercher les headers
        const headers = table.querySelectorAll('thead th');
        headers.forEach((th, idx) => {
          const text = th.textContent?.toLowerCase() || '';
          if (text.includes('code')) codeIdx = idx;
          if (text.includes('prix')) priceIdx = idx;
        });

        // Si pas trouvé, utiliser les positions par défaut
        // Format: Long | Larg | Haut | Qualité | Code | Stock | Prix
        if (codeIdx === -1) codeIdx = 4;
        if (priceIdx === -1) priceIdx = 6;

        const codeCell = cells[codeIdx];
        const priceCell = cells[priceIdx];

        if (!codeCell) return;

        const supplierCode = codeCell.textContent?.trim() || '';
        if (!supplierCode.match(/^\d+$/)) return; // Code doit être numérique

        let price: number | null = null;
        let priceType: 'ML' | 'PIECE' | 'RLX' | null = null;

        if (priceCell) {
          const priceText = priceCell.textContent?.trim() || '';
          const priceMatch = priceText.match(/([\d,]+)\s*€/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(',', '.'));
          }

          const lowerPrice = priceText.toLowerCase();
          if (lowerPrice.includes('/ml')) {
            priceType = 'ML';
          } else if (lowerPrice.includes('/rlx') || lowerPrice.includes('rouleau')) {
            priceType = 'RLX';
          } else if (lowerPrice.includes('/un')) {
            priceType = 'PIECE';
          }
        }

        variants.push({ supplierCode, price, priceType });
      });
    }

    return { imageUrl, variants };
  });

  return result;
}

async function main() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 MODE DRY-RUN' : '🚀 MODE RÉEL - Mise à jour images/prix');
  console.log('═'.repeat(60));
  console.log('');

  const browser = await connectBrowser();
  const page = await browser.newPage();

  let updatedImages = 0;
  let updatedPrices = 0;
  let notFound = 0;

  for (const categoryUrl of CATEGORIES) {
    console.log('\n📂 ' + categoryUrl.split('/').pop());

    const productUrls = await scrapeProductLinks(page, categoryUrl);
    console.log('   ' + productUrls.length + ' produits trouvés');

    for (const productUrl of productUrls) {
      const data = await scrapeProductData(page, productUrl);
      if (!data) continue;

      const productName = productUrl.split('/').pop()?.replace('.html', '') || '';
      console.log('\n   📦 ' + productName.substring(0, 50));

      if (data.imageUrl) {
        console.log('      Image: ' + data.imageUrl.substring(0, 60) + '...');
      }

      for (const variant of data.variants) {
        // Trouver le panel en base par supplierCode
        const panel = await prisma.panel.findFirst({
          where: {
            catalogueId: 'cmjqpjtly0000by4cnkga0kaq',
            supplierCode: variant.supplierCode
          }
        });

        if (!panel) {
          notFound++;
          continue;
        }

        const updates: Record<string, unknown> = {};

        // Mettre à jour l'image si manquante
        if (!panel.imageUrl && data.imageUrl) {
          updates.imageUrl = data.imageUrl;
          updatedImages++;
        }

        // Mettre à jour le prix si manquant
        if (variant.price) {
          if (variant.priceType === 'ML' && !panel.pricePerMl) {
            updates.pricePerMl = variant.price;
            updatedPrices++;
          } else if ((variant.priceType === 'PIECE' || variant.priceType === 'RLX') && !panel.pricePerUnit) {
            updates.pricePerUnit = variant.price;
            updatedPrices++;
          }
        }

        if (Object.keys(updates).length > 0) {
          console.log('      ✅ ' + variant.supplierCode + ' - MAJ: ' + Object.keys(updates).join(', '));

          if (!DRY_RUN) {
            await prisma.panel.update({
              where: { id: panel.id },
              data: updates
            });
          }
        }
      }
    }
  }

  await page.close();

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('═'.repeat(60));
  console.log('   Images mises à jour: ' + updatedImages);
  console.log('   Prix mis à jour: ' + updatedPrices);
  console.log('   Non trouvés en base: ' + notFound);

  await prisma.$disconnect();
}

main().catch(console.error);
