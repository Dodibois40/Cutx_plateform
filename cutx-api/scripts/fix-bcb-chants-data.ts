/**
 * Fix BCB chants - récupère images et prix manquants
 */

import puppeteer, { Page } from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

const PRODUCT_URLS = [
  'https://www.bcommebois.fr/chant-bois-acajou.html',
  'https://www.bcommebois.fr/chant-bois-chataignier.html',
  'https://www.bcommebois.fr/chant-bois-chene.html',
  'https://www.bcommebois.fr/chant-bois-frene.html',
  'https://www.bcommebois.fr/chant-bois-hetre.html',
  'https://www.bcommebois.fr/chant-bois-merisier.html',
  'https://www.bcommebois.fr/chant-bois-noyer.html',
  'https://www.bcommebois.fr/chant-bois-pin.html',
  'https://www.bcommebois.fr/chant-bois-teck.html',
  'https://www.bcommebois.fr/chant-bois-wenge.html',
  'https://www.bcommebois.fr/chant-bois-erable.html',
  'https://www.bcommebois.fr/chant-melamine-blanc-givre.html',
  'https://www.bcommebois.fr/chant-abs-blanc-givre.html',
];

interface VariantInfo {
  code: string;
  price: number | null;
  priceType: string | null;
}

async function scrapeProductPage(page: Page, url: string): Promise<{ imageUrl: string | null; variants: VariantInfo[] }> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000)); // Attendre le chargement complet

  const data = await page.evaluate(() => {
    // Image - chercher dans fotorama ou autres
    let imageUrl: string | null = null;

    // Essayer fotorama
    const fotoramaImg = document.querySelector('.fotorama__stage__frame img') as HTMLImageElement;
    if (fotoramaImg && fotoramaImg.src) {
      imageUrl = fotoramaImg.src;
    }

    // Sinon essayer gallery-placeholder
    if (!imageUrl) {
      const galleryImg = document.querySelector('.gallery-placeholder img') as HTMLImageElement;
      if (galleryImg && galleryImg.src && !galleryImg.src.includes('placeholder')) {
        imageUrl = galleryImg.src;
      }
    }

    // Sinon essayer product-image-container
    if (!imageUrl) {
      const prodImg = document.querySelector('.product-image-container img') as HTMLImageElement;
      if (prodImg && prodImg.src) {
        imageUrl = prodImg.src;
      }
    }

    // Variantes du tableau
    const variants: VariantInfo[] = [];
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 7) return;

      // Colonnes: Long | Larg | Haut | Qualité | Code | Stock | Prix
      const codeCell = cells[4];
      const priceCell = cells[6];

      const code = codeCell?.textContent?.trim() || '';
      if (!code.match(/^\d{5}$/)) return; // Code à 5 chiffres

      let price: number | null = null;
      let priceType: string | null = null;

      const priceText = priceCell?.textContent?.trim() || '';
      const priceMatch = priceText.match(/([\d,]+)\s*€/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(',', '.'));
        if (priceText.includes('/ml')) priceType = 'ML';
        else if (priceText.includes('/rlx')) priceType = 'RLX';
        else if (priceText.includes('/un')) priceType = 'UN';
      }

      variants.push({ code, price, priceType });
    });

    return { imageUrl, variants };
  });

  return data;
}

async function main() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 MODE DRY-RUN' : '🚀 MODE RÉEL');
  console.log('═'.repeat(60));

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const page = await browser.newPage();

  let updatedImages = 0;
  let updatedPrices = 0;

  for (const url of PRODUCT_URLS) {
    console.log('\n📦 ' + url.split('/').pop());

    const data = await scrapeProductPage(page, url);

    console.log('   Image trouvée: ' + (data.imageUrl ? 'OUI' : 'NON'));
    console.log('   Variantes: ' + data.variants.length);

    for (const v of data.variants) {
      // Chercher le panel en base
      const panel = await prisma.panel.findFirst({
        where: {
          catalogueId: 'cmjqpjtly0000by4cnkga0kaq',
          supplierCode: v.code
        }
      });

      if (!panel) {
        console.log('   ⚠️ Code ' + v.code + ' non trouvé en base');
        continue;
      }

      const updates: Record<string, unknown> = {};

      // Image si manquante
      if (!panel.imageUrl && data.imageUrl) {
        updates.imageUrl = data.imageUrl;
      }

      // Prix si manquant
      if (v.price !== null) {
        if (v.priceType === 'ML' && !panel.pricePerMl) {
          updates.pricePerMl = v.price;
        } else if (!panel.pricePerUnit && (v.priceType === 'RLX' || v.priceType === 'UN')) {
          updates.pricePerUnit = v.price;
        }
      }

      if (Object.keys(updates).length > 0) {
        console.log('   ✅ ' + v.code + ' → ' + Object.keys(updates).join(', '));
        if (updates.imageUrl) updatedImages++;
        if (updates.pricePerMl || updates.pricePerUnit) updatedPrices++;

        if (!DRY_RUN) {
          await prisma.panel.update({
            where: { id: panel.id },
            data: updates
          });
        }
      }
    }
  }

  await page.close();

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('   Images: ' + updatedImages);
  console.log('   Prix: ' + updatedPrices);

  await prisma.$disconnect();
}

main().catch(console.error);
