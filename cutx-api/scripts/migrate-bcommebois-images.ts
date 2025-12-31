/**
 * Migration des images B comme Bois vers Firebase Storage
 *
 * Télécharge les images depuis bcommebois.fr via Chrome connecté
 * puis les uploade vers Firebase Storage.
 *
 * Usage:
 * 1. Configurer les variables Firebase dans .env
 * 2. Lancer Chrome: chrome.exe --remote-debugging-port=9222
 * 3. Se connecter sur bcommebois.fr (accepter cookies)
 * 4. Lancer: npx tsx scripts/migrate-bcommebois-images.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as admin from 'firebase-admin';
import puppeteer from 'puppeteer-core';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Fichier de sauvegarde du mapping (pour reprendre en cas d'erreur)
const MAPPING_FILE = path.join(__dirname, 'bcommebois-images-mapping.json');

// Configuration Firebase (depuis .env)
const FIREBASE_CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  clientCertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
};

let bucket: admin.storage.Bucket | null = null;

function initFirebase(): boolean {
  if (!FIREBASE_CONFIG.projectId || !FIREBASE_CONFIG.privateKey) {
    console.log('⚠️  Variables Firebase non configurées dans .env');
    console.log('   Ajoutez ces variables:');
    console.log('   - FIREBASE_PROJECT_ID');
    console.log('   - FIREBASE_PRIVATE_KEY_ID');
    console.log('   - FIREBASE_PRIVATE_KEY');
    console.log('   - FIREBASE_CLIENT_EMAIL');
    console.log('   - FIREBASE_CLIENT_ID');
    console.log('   - FIREBASE_CLIENT_CERT_URL');
    return false;
  }

  const serviceAccount = {
    type: "service_account",
    project_id: FIREBASE_CONFIG.projectId,
    private_key_id: FIREBASE_CONFIG.privateKeyId,
    private_key: FIREBASE_CONFIG.privateKey,
    client_email: FIREBASE_CONFIG.clientEmail,
    client_id: FIREBASE_CONFIG.clientId,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: FIREBASE_CONFIG.clientCertUrl,
    universe_domain: "googleapis.com"
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: `${FIREBASE_CONFIG.projectId}.firebasestorage.app`
    });
  }

  bucket = admin.storage().bucket();
  return true;
}

function loadMapping(): Map<string, string> {
  const mapping = new Map<string, string>();
  if (fs.existsSync(MAPPING_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
      Object.entries(data).forEach(([oldUrl, newUrl]) => {
        if (newUrl && newUrl !== 'SKIPPED' && newUrl !== 'FAILED') {
          mapping.set(oldUrl, newUrl as string);
        }
      });
      console.log(`   📂 ${mapping.size} URLs déjà migrées (depuis fichier de sauvegarde)`);
    } catch (e) {
      console.log('   ⚠️  Fichier de mapping corrompu, on repart de zéro');
    }
  }
  return mapping;
}

function saveMapping(mapping: Map<string, string>): void {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(Object.fromEntries(mapping), null, 2));
}

async function uploadToFirebase(buffer: Buffer, filename: string): Promise<string> {
  if (!bucket) throw new Error('Firebase non initialisé');

  // Nettoyer le nom de fichier
  const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  const file = bucket.file(`catalogue/bcommebois/${cleanFilename}`);
  await file.save(buffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    }
  });
  await file.makePublic();

  return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.projectId}.firebasestorage.app/o/catalogue%2Fbcommebois%2F${encodeURIComponent(cleanFilename)}?alt=media`;
}

function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    return filename || `image_${Date.now()}.jpg`;
  } catch {
    return `image_${Date.now()}.jpg`;
  }
}

async function main() {
  console.log('🖼️  MIGRATION IMAGES B COMME BOIS → FIREBASE');
  console.log('=============================================\n');

  // 1. Vérifier Firebase
  console.log('🔥 Initialisation Firebase...');
  if (!initFirebase()) {
    process.exit(1);
  }
  console.log('   ✅ Firebase OK\n');

  // 2. Connexion Chrome
  console.log('🔗 Connexion à Chrome...');
  console.log('   (Chrome doit être lancé avec --remote-debugging-port=9222)\n');

  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: 'http://127.0.0.1:9222',
      defaultViewport: null
    });
  } catch (e) {
    console.error('❌ Impossible de se connecter à Chrome!');
    console.log('\n   Lancez Chrome avec:');
    console.log('   chrome.exe --remote-debugging-port=9222\n');
    process.exit(1);
  }
  console.log('   ✅ Connecté à Chrome!\n');

  // 3. Charger le mapping existant
  console.log('📊 Chargement des données...');
  const urlMapping = loadMapping();

  // 4. Récupérer les panneaux avec images bcommebois
  const panels = await prisma.panel.findMany({
    where: {
      imageUrl: { contains: 'bcommebois' }
    },
    select: { id: true, reference: true, imageUrl: true }
  });

  // Grouper par URL (plusieurs panneaux peuvent avoir la même image)
  const urlToPanels = new Map<string, typeof panels>();
  panels.forEach(p => {
    if (p.imageUrl) {
      if (!urlToPanels.has(p.imageUrl)) urlToPanels.set(p.imageUrl, []);
      urlToPanels.get(p.imageUrl)!.push(p);
    }
  });

  const allUrls = Array.from(urlToPanels.keys());
  const urlsToMigrate = allUrls.filter(url => !urlMapping.has(url));

  console.log(`   📦 Total panneaux avec images bcommebois: ${panels.length}`);
  console.log(`   🖼️  URLs uniques: ${allUrls.length}`);
  console.log(`   ✅ Déjà migrées: ${allUrls.length - urlsToMigrate.length}`);
  console.log(`   📥 À migrer: ${urlsToMigrate.length}\n`);

  if (urlsToMigrate.length === 0) {
    console.log('✅ Toutes les images sont déjà migrées!\n');

    // Mettre à jour les URLs dans la base si pas déjà fait
    console.log('🔄 Vérification des URLs en base...');
    let updated = 0;
    for (const [oldUrl, newUrl] of urlMapping) {
      const panelsToUpdate = urlToPanels.get(oldUrl) || [];
      for (const panel of panelsToUpdate) {
        const current = await prisma.panel.findUnique({
          where: { id: panel.id },
          select: { imageUrl: true }
        });
        if (current?.imageUrl === oldUrl) {
          await prisma.panel.update({
            where: { id: panel.id },
            data: { imageUrl: newUrl }
          });
          updated++;
        }
      }
    }
    console.log(`   ✅ ${updated} panneaux mis à jour\n`);

    await browser.disconnect();
    await prisma.$disconnect();
    return;
  }

  // 5. Créer une page pour télécharger les images
  const page = await browser.newPage();

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  console.log('🚀 Début de la migration...\n');

  for (let i = 0; i < urlsToMigrate.length; i++) {
    const oldUrl = urlsToMigrate[i];
    const filename = extractFilename(oldUrl);
    const panelsForUrl = urlToPanels.get(oldUrl) || [];

    // Progression
    const progress = Math.round((i / urlsToMigrate.length) * 100);
    process.stdout.write(`[${i + 1}/${urlsToMigrate.length}] (${progress}%) ${filename.substring(0, 40)}... `);

    try {
      // Naviguer vers l'image
      const response = await page.goto(oldUrl, {
        waitUntil: 'networkidle0',
        timeout: 20000
      });

      if (!response || !response.ok()) {
        const status = response?.status() || 'N/A';
        console.log(`❌ HTTP ${status}`);
        errors.push(`${filename}: HTTP ${status}`);
        failed++;
        continue;
      }

      // Récupérer le contenu
      const buffer = await response.buffer();

      if (buffer.length < 500) {
        console.log(`❌ Trop petit (${buffer.length}b)`);
        errors.push(`${filename}: Trop petit`);
        failed++;
        continue;
      }

      // Upload vers Firebase
      const newUrl = await uploadToFirebase(buffer, filename);

      // Sauvegarder le mapping
      urlMapping.set(oldUrl, newUrl);

      // Mettre à jour PostgreSQL
      for (const panel of panelsForUrl) {
        await prisma.panel.update({
          where: { id: panel.id },
          data: { imageUrl: newUrl }
        });
      }

      success++;
      console.log(`✅ (${panelsForUrl.length} panneau${panelsForUrl.length > 1 ? 'x' : ''})`);

      // Sauvegarder le mapping tous les 10
      if (success % 10 === 0) {
        saveMapping(urlMapping);
        console.log(`   💾 Sauvegarde intermédiaire (${success} images)`);
      }

      // Petite pause pour ne pas surcharger
      await new Promise(r => setTimeout(r, 500));

    } catch (error: any) {
      const errMsg = error.message?.substring(0, 50) || 'Erreur inconnue';
      console.log(`❌ ${errMsg}`);
      errors.push(`${filename}: ${errMsg}`);
      failed++;
    }
  }

  // 6. Sauvegarde finale
  saveMapping(urlMapping);

  // 7. Résumé
  console.log('\n=============================================');
  console.log('📊 RÉSULTATS MIGRATION');
  console.log('=============================================');
  console.log(`   ✅ Réussies: ${success}`);
  console.log(`   ❌ Échouées: ${failed}`);
  console.log(`   📁 Total migrées: ${urlMapping.size}/${allUrls.length}`);

  if (errors.length > 0 && errors.length <= 10) {
    console.log('\n❌ Erreurs:');
    errors.forEach(e => console.log(`   - ${e}`));
  } else if (errors.length > 10) {
    console.log(`\n❌ ${errors.length} erreurs (voir logs)`);
  }

  console.log('\n💾 Mapping sauvegardé dans:');
  console.log(`   ${MAPPING_FILE}`);
  console.log('=============================================\n');

  await page.close();
  await browser.disconnect();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur fatale:', e);
  await prisma.$disconnect();
  process.exit(1);
});
