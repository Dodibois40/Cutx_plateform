/**
 * Mise à jour finale des chants BCB - images et prix
 */

import puppeteer from 'puppeteer-core';
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

async function main() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 DRY-RUN' : '🚀 MODE RÉEL');
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

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));

    const data = await page.evaluate(() => {
      // Trouver l'image du catalogue
      let imageUrl: string | null = null;
      document.querySelectorAll('img').forEach((img) => {
        if (img.src && img.src.includes('media/catalog/product') && !imageUrl) {
          imageUrl = img.src;
        }
      });

      // Parser le tableau - 8 colonnes: Long | Larg | Haut | Qualité | Code | Stock | Prix | Qté
      const variants: Array<{ code: string; price: number | null; priceType: string | null }> = [];
      const rows = document.querySelectorAll('table tr');

      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;

        const code = cells[4]?.textContent?.trim() || '';
        if (!/^\d+$/.test(code)) return;

        const priceText = cells[6]?.textContent?.trim() || '';
        const priceMatch = priceText.match(/([\d,]+)\s*€/);
        let price: number | null = null;
        let priceType: string | null = null;

        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(',', '.'));
          if (priceText.toLowerCase().includes('/ml')) priceType = 'ML';
          else if (priceText.toLowerCase().includes('/rlx')) priceType = 'RLX';
          else if (priceText.toLowerCase().includes('/un')) priceType = 'UN';
        }

        variants.push({ code, price, priceType });
      });

      return { imageUrl, variants };
    });

    console.log('   Image: ' + (data.imageUrl ? 'OUI' : 'NON'));
    console.log('   Variantes: ' + data.variants.length);

    for (const v of data.variants) {
      const panel = await prisma.panel.findFirst({
        where: {
          catalogueId: 'cmjqpjtly0000by4cnkga0kaq',
          supplierCode: v.code
        }
      });

      if (!panel) continue;

      const updates: Record<string, unknown> = {};

      // Image si manquante
      if (!panel.imageUrl && data.imageUrl) {
        updates.imageUrl = data.imageUrl;
      }

      // Prix si manquant
      if (v.price !== null && v.price > 0) {
        if (v.priceType === 'ML' && !panel.pricePerMl) {
          updates.pricePerMl = v.price;
        } else if ((v.priceType === 'RLX' || v.priceType === 'UN') && !panel.pricePerUnit) {
          updates.pricePerUnit = v.price;
        } else if (!v.priceType && !panel.pricePerMl && !panel.pricePerUnit) {
          // Prix sans type, mettre en pricePerUnit par défaut
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
  console.log('   Images mises à jour: ' + updatedImages);
  console.log('   Prix mis à jour: ' + updatedPrices);

  await prisma.$disconnect();
}

main().catch(console.error);
