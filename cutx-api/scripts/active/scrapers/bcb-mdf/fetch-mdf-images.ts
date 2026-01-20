/**
 * Récupère les images des panneaux MDF BCB qui n'en ont pas
 *
 * Usage:
 *   npx tsx scripts/active/scrapers/bcb-mdf/fetch-mdf-images.ts --dry-run
 *   npx tsx scripts/active/scrapers/bcb-mdf/fetch-mdf-images.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root (scripts/active/scrapers/bcb-mdf -> CutX_plateform)
config({ path: resolve(__dirname, '../../../../../.env') });

import puppeteer, { Browser, Page } from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as https from 'https';
import * as http from 'http';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');

const CHROME_DEBUG_PORT = 9222;

// Configuration R2
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || 'cutx-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://cdn.cutx.ai';

// Vérifier la configuration
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
  console.error('❌ Configuration R2 manquante! Vérifiez .env');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

async function connectToChrome(): Promise<Browser> {
  console.log('🔌 Connexion à Chrome...');
  try {
    const browser = await puppeteer.connect({
      browserURL: `http://localhost:${CHROME_DEBUG_PORT}`,
    });
    console.log('✅ Connecté à Chrome!');
    return browser;
  } catch (error) {
    console.error('❌ Impossible de se connecter à Chrome.');
    console.error('   Lancez Chrome avec: chrome --remote-debugging-port=9222');
    process.exit(1);
  }
}

/**
 * Télécharge une image depuis une URL
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve);
          return;
        }
      }

      if (response.statusCode !== 200) {
        resolve(null);
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', () => resolve(null));
    });

    request.on('error', () => resolve(null));
    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
  });
}

/**
 * Upload une image vers R2
 */
async function uploadToR2(imageBuffer: Buffer, filename: string): Promise<string | null> {
  try {
    const key = `panels/mdf/${filename}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000',
    }));

    return `${R2_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.log(`   ❌ Erreur upload R2: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Cherche l'image d'un produit sur BCB par sa référence
 */
async function findProductImage(page: Page, ref: string): Promise<string | null> {
  const refNum = ref.replace('BCB-', '').replace('BCB-BAS-', '');

  // Recherche sur BCB
  const searchUrl = `https://www.bcommebois.fr/catalogsearch/result/?q=${refNum}`;

  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Trouver le lien vers le produit
    const productLink = await page.evaluate((refNum) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        if (href.includes(`-${refNum}.html`)) {
          return href;
        }
      }
      return null;
    }, refNum);

    if (!productLink) {
      return null;
    }

    // Aller sur la page produit
    await page.goto(productLink, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000)); // Plus de temps pour le lazy loading

    // Scroll pour déclencher le lazy loading
    await page.evaluate(() => window.scrollTo(0, 500));
    await new Promise(r => setTimeout(r, 1000));

    // Extraire l'URL de l'image principale
    const imageUrl = await page.evaluate(() => {
      // Chercher les images dans /media/catalog/product/ (images produit BCB)
      const allImages = Array.from(document.querySelectorAll('img'));

      for (const img of allImages) {
        const src = img.src || '';
        // Les images produit BCB sont dans media/catalog/product
        if (src.includes('/media/catalog/product/') &&
            !src.includes('placeholder') &&
            !src.includes('logo') &&
            !src.includes('icon') &&
            !src.includes('renard') &&
            !src.includes('fond-bois')) {
          return src;
        }
      }

      // Vérifier aussi les data-src pour le lazy loading
      const lazyImages = document.querySelectorAll('[data-src]');
      for (const el of lazyImages) {
        const dataSrc = el.getAttribute('data-src') || '';
        if (dataSrc.includes('/media/catalog/product/') && !dataSrc.includes('placeholder')) {
          return dataSrc;
        }
      }

      return null;
    });

    return imageUrl;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       RÉCUPÉRATION IMAGES MDF BCB                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`📦 Bucket R2: ${R2_BUCKET}`);
  console.log(`🌐 URL publique: ${R2_PUBLIC_URL}\n`);

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Trouver les MDF BCB sans images
  const panelsNoImage = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'MDF',
      OR: [
        { imageUrl: null },
        { imageUrl: '' }
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true
    },
    orderBy: { reference: 'asc' }
  });

  console.log(`📦 Panneaux MDF BCB sans image: ${panelsNoImage.length}`);

  if (panelsNoImage.length === 0) {
    console.log('✅ Tous les panneaux ont une image!');
    await prisma.$disconnect();
    return;
  }

  const toProcess = LIMIT > 0 ? panelsNoImage.slice(0, LIMIT) : panelsNoImage;
  console.log(`   À traiter: ${toProcess.length}${LIMIT > 0 ? ` (limite: ${LIMIT})` : ''}\n`);

  const browser = await connectToChrome();
  const page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const panel = toProcess[i];
    console.log(`\n[${i + 1}/${toProcess.length}] ${panel.reference}: ${panel.name?.substring(0, 45)}...`);

    const imageUrl = await findProductImage(page, panel.reference);

    if (imageUrl) {
      console.log(`   📷 Image trouvée: ${imageUrl.substring(0, 60)}...`);

      if (!DRY_RUN) {
        // Télécharger l'image
        const imageBuffer = await downloadImage(imageUrl);

        if (imageBuffer) {
          // Upload vers R2
          const refClean = panel.reference.replace(/[^a-zA-Z0-9-]/g, '_');
          const r2Url = await uploadToR2(imageBuffer, `${refClean}.jpg`);

          if (r2Url) {
            try {
              await prisma.panel.update({
                where: { id: panel.id },
                data: { imageUrl: r2Url }
              });
              console.log(`   ✅ Image uploadée: ${r2Url}`);
              updated++;
            } catch (error) {
              console.log(`   ❌ Erreur update: ${(error as Error).message}`);
              errors++;
            }
          } else {
            errors++;
          }
        } else {
          console.log(`   ❌ Échec téléchargement image`);
          errors++;
        }
      } else {
        updated++;
      }
    } else {
      console.log(`   ⚠️ Pas d'image trouvée sur BCB`);
      notFound++;
    }

    // Pause pour éviter rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }

  await page.close();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n  Total analysés: ${toProcess.length}`);
  console.log(`  Images uploadées: ${updated}`);
  console.log(`  Non trouvées: ${notFound}`);
  console.log(`  Erreurs: ${errors}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Aucune modification n\'a été faite');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
