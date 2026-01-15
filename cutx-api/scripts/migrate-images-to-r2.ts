#!/usr/bin/env npx tsx
/**
 * Migration des images vers Cloudflare R2
 *
 * Ce script migre les images des panneaux depuis leurs sources actuelles
 * (URLs externes, Firebase, stockage local) vers Cloudflare R2.
 *
 * Usage:
 *   npx tsx scripts/migrate-images-to-r2.ts [options]
 *
 * Options:
 *   --dry-run       Simuler sans modifier la base de données
 *   --catalogue     Filtrer par slug du catalogue (ex: --catalogue=bcommebois)
 *   --limit         Nombre maximum d'images à migrer (ex: --limit=100)
 *   --skip-firebase Ne pas migrer les images déjà sur Firebase
 *   --skip-local    Ne pas migrer les images locales (/uploads/)
 *   --force         Re-migrer même si déjà sur R2
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../.env') });
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import puppeteer from 'puppeteer';

const prisma = new PrismaClient();

// Browser instance for downloading images
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

// Configuration R2
const CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET || 'cutx-images',
  publicUrl: process.env.R2_PUBLIC_URL || 'https://cdn.cutx.ai',
};

// Parse arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  skipFirebase: args.includes('--skip-firebase'),
  skipLocal: args.includes('--skip-local'),
  force: args.includes('--force'),
  catalogue: args.find((a) => a.startsWith('--catalogue='))?.split('=')[1],
  limit: parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10),
};

// Vérifier la configuration
if (!CONFIG.accountId || !CONFIG.accessKeyId || !CONFIG.secretAccessKey) {
  console.error(`
❌ Configuration R2 manquante!

Assurez-vous que .env contient:
  R2_ACCOUNT_ID=votre_account_id
  R2_ACCESS_KEY_ID=votre_access_key
  R2_SECRET_ACCESS_KEY=votre_secret_key
  R2_BUCKET=cutx-images
  R2_PUBLIC_URL=https://cdn.cutx.ai
`);
  process.exit(1);
}

// Client S3 pour R2
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CONFIG.accessKeyId!,
    secretAccessKey: CONFIG.secretAccessKey!,
  },
});

// Types d'URLs
function getUrlType(url: string): 'r2' | 'firebase' | 'local' | 'external' | 'none' {
  if (!url) return 'none';
  if (url.startsWith(CONFIG.publicUrl)) return 'r2';
  if (url.includes('firebasestorage.googleapis.com')) return 'firebase';
  if (url.startsWith('/uploads/')) return 'local';
  return 'external';
}

// Initialize browser for downloading images
async function initBrowser(): Promise<void> {
  if (!browser) {
    console.log('🌐 Lancement du navigateur...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}

// Close browser
async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

// Télécharger une image avec Puppeteer (contourne les protections anti-bot)
async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    await initBrowser();
    const page = await browser!.newPage();

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    // Intercept the image response
    let imageBuffer: Buffer | null = null;
    let contentType = 'image/jpeg';

    page.on('response', async (response) => {
      if (response.url() === url) {
        const ct = response.headers()['content-type'] || '';
        if (ct.startsWith('image/')) {
          contentType = ct;
          try {
            imageBuffer = Buffer.from(await response.buffer());
          } catch {
            // Response already consumed, ignore
          }
        }
      }
    });

    // Navigate to the image URL
    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // If we didn't catch it via intercept, try to get it from the page
    if (!imageBuffer && response) {
      const ct = response.headers()['content-type'] || '';
      if (ct.startsWith('image/')) {
        contentType = ct;
        imageBuffer = Buffer.from(await response.buffer());
      }
    }

    await page.close();

    if (!imageBuffer) {
      console.log(`    ⚠️ Pas d'image trouvée pour ${url.substring(0, 60)}...`);
      return null;
    }

    // Verify it's actually an image (not HTML)
    if (imageBuffer.length < 1000) {
      const text = imageBuffer.toString('utf-8').toLowerCase();
      if (text.includes('<html') || text.includes('<!doctype') || text.includes('<script')) {
        console.log(`    ⚠️ Page HTML reçue au lieu d'une image`);
        return null;
      }
    }

    return { buffer: imageBuffer, contentType };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`    ⚠️ Erreur téléchargement: ${message}`);
    return null;
  }
}

// Uploader vers R2
async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: CONFIG.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000',
  });

  await s3.send(command);
  return `${CONFIG.publicUrl}/${key}`;
}

// Vérifier si un objet existe sur R2
async function existsOnR2(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: CONFIG.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Extraire l'extension d'une URL
function getExtension(url: string): string {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
  return match ? match[1].toLowerCase() : 'jpg';
}

// Générer une clé R2 pour un panel
function generateR2Key(panelId: string, catalogueSlug: string, originalUrl: string): string {
  const ext = getExtension(originalUrl);
  const timestamp = Date.now();
  return `panels/${catalogueSlug}/${panelId}-${timestamp}.${ext}`;
}

async function main() {
  console.log('🚀 Migration des images vers Cloudflare R2\n');
  console.log(`📦 Bucket: ${CONFIG.bucket}`);
  console.log(`🌐 URL: ${CONFIG.publicUrl}`);
  console.log(`⚙️  Options:`, options);
  console.log('');

  // Construire la requête
  const where: Record<string, unknown> = {
    imageUrl: { not: null },
  };

  if (options.catalogue) {
    where.catalogue = { slug: options.catalogue };
  }

  // Récupérer les panels avec images
  const panels = await prisma.panel.findMany({
    where,
    include: {
      catalogue: { select: { slug: true, name: true } },
    },
    take: options.limit || undefined,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`📊 ${panels.length} panels avec images trouvés\n`);

  // Statistiques
  const stats = {
    total: panels.length,
    alreadyR2: 0,
    firebase: 0,
    local: 0,
    external: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
  };

  // Analyser les types d'URLs
  for (const panel of panels) {
    const type = getUrlType(panel.imageUrl || '');
    if (type === 'r2') stats.alreadyR2++;
    else if (type === 'firebase') stats.firebase++;
    else if (type === 'local') stats.local++;
    else if (type === 'external') stats.external++;
  }

  console.log('📈 Distribution actuelle:');
  console.log(`   R2 (déjà migré): ${stats.alreadyR2}`);
  console.log(`   Firebase: ${stats.firebase}`);
  console.log(`   Local (/uploads): ${stats.local}`);
  console.log(`   Externe: ${stats.external}`);
  console.log('');

  if (options.dryRun) {
    console.log('🔍 Mode DRY-RUN - Aucune modification ne sera effectuée\n');
  }

  // Migrer les images
  let processed = 0;
  for (const panel of panels) {
    const imageUrl = panel.imageUrl || '';
    const type = getUrlType(imageUrl);
    const catalogueSlug = panel.catalogue?.slug || 'unknown';

    processed++;
    const prefix = `[${processed}/${panels.length}]`;

    // Déjà sur R2
    if (type === 'r2' && !options.force) {
      stats.skipped++;
      continue;
    }

    // Skip Firebase si demandé
    if (type === 'firebase' && options.skipFirebase) {
      stats.skipped++;
      continue;
    }

    // Skip local si demandé
    if (type === 'local' && options.skipLocal) {
      stats.skipped++;
      continue;
    }

    // Pas d'image
    if (type === 'none') {
      stats.skipped++;
      continue;
    }

    console.log(`${prefix} ${panel.reference || panel.id}`);
    console.log(`   📥 Source: ${type} - ${imageUrl.substring(0, 60)}...`);

    if (options.dryRun) {
      console.log('   ⏭️  Simulation - pas de migration');
      stats.migrated++;
      continue;
    }

    // Construire l'URL complète pour les images locales
    let fullUrl = imageUrl;
    if (type === 'local') {
      // Pour les images locales, on doit les lire depuis le disque
      const localPath = `./uploads/panels/${imageUrl.replace('/uploads/panels/', '')}`;
      const fs = await import('fs');
      const path = await import('path');

      const absolutePath = path.resolve(localPath);
      if (!fs.existsSync(absolutePath)) {
        console.log(`   ⚠️ Fichier local introuvable: ${absolutePath}`);
        stats.failed++;
        continue;
      }

      // Lire le fichier local
      const buffer = fs.readFileSync(absolutePath);
      const ext = getExtension(imageUrl);
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const key = generateR2Key(panel.id, catalogueSlug, imageUrl);

      try {
        const r2Url = await uploadToR2(buffer, key, contentType);
        console.log(`   ✅ Migré vers: ${r2Url}`);

        // Mettre à jour en base
        await prisma.panel.update({
          where: { id: panel.id },
          data: { imageUrl: r2Url },
        });

        stats.migrated++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ Erreur upload: ${message}`);
        stats.failed++;
      }
      continue;
    }

    // Télécharger l'image externe
    const downloaded = await downloadImage(fullUrl);
    if (!downloaded) {
      stats.failed++;
      continue;
    }

    const key = generateR2Key(panel.id, catalogueSlug, imageUrl);

    try {
      const r2Url = await uploadToR2(downloaded.buffer, key, downloaded.contentType);
      console.log(`   ✅ Migré vers: ${r2Url}`);

      // Mettre à jour en base
      await prisma.panel.update({
        where: { id: panel.id },
        data: { imageUrl: r2Url },
      });

      stats.migrated++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Erreur upload: ${message}`);
      stats.failed++;
    }

    // Pause entre les requêtes pour éviter le rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  // Résumé
  console.log('\n' + '='.repeat(50));
  console.log('📊 Résumé de la migration:');
  console.log(`   Total traité: ${panels.length}`);
  console.log(`   ✅ Migré: ${stats.migrated}`);
  console.log(`   ⏭️  Ignoré: ${stats.skipped}`);
  console.log(`   ❌ Échec: ${stats.failed}`);

  if (options.dryRun) {
    console.log('\n🔍 Mode DRY-RUN - Aucune modification effectuée');
    console.log("   Relancez sans --dry-run pour effectuer la migration");
  }

  await closeBrowser();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Erreur:', error);
  await closeBrowser();
  await prisma.$disconnect();
  process.exit(1);
});
