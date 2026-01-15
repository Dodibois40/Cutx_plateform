#!/usr/bin/env node
/**
 * Upload shorts to Cloudflare R2
 *
 * Setup:
 * 1. npm install @aws-sdk/client-s3
 * 2. Create .env file with R2 credentials (see below)
 * 3. node scripts/upload-to-r2.js
 */

require('dotenv').config();
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configuration - à mettre dans .env
const CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID,           // Cloudflare Account ID
  accessKeyId: process.env.R2_ACCESS_KEY_ID,      // R2 Access Key
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, // R2 Secret Key
  bucket: process.env.R2_BUCKET || 'cutx-shorts',
  publicUrl: process.env.R2_PUBLIC_URL || 'https://cdn.cutx.ai', // Custom domain
};

const SHORTS_DIR = path.join(__dirname, '../cutx-frontend/public/shorts');
const JSON_FILE = path.join(__dirname, '../cutx-frontend/src/data/local-shorts.json');

// Verify config
if (!CONFIG.accountId || !CONFIG.accessKeyId || !CONFIG.secretAccessKey) {
  console.error(`
❌ Configuration manquante!

Crée un fichier .env à la racine avec:

R2_ACCOUNT_ID=ton_account_id
R2_ACCESS_KEY_ID=ta_access_key
R2_SECRET_ACCESS_KEY=ton_secret_key
R2_BUCKET=cutx-shorts
R2_PUBLIC_URL=https://cdn.cutx.ai

Tu trouves l'Account ID dans: Cloudflare Dashboard → R2 → Overview (en haut à droite)
`);
  process.exit(1);
}

// S3 client for R2
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CONFIG.accessKeyId,
    secretAccessKey: CONFIG.secretAccessKey,
  },
});

async function uploadFile(filePath, key) {
  const fileContent = fs.readFileSync(filePath);
  const command = new PutObjectCommand({
    Bucket: CONFIG.bucket,
    Key: key,
    Body: fileContent,
    ContentType: 'video/mp4',
  });

  await s3.send(command);
  return `${CONFIG.publicUrl}/${key}`;
}

async function main() {
  console.log('🚀 Upload vers Cloudflare R2\n');
  console.log(`📦 Bucket: ${CONFIG.bucket}`);
  console.log(`🌐 URL: ${CONFIG.publicUrl}\n`);

  // Get video files
  const files = fs.readdirSync(SHORTS_DIR).filter(f => f.endsWith('.mp4'));
  console.log(`📁 ${files.length} vidéos à uploader\n`);

  // Load JSON data
  let videos = [];
  if (fs.existsSync(JSON_FILE)) {
    videos = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  }

  // Upload each file
  let uploaded = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(SHORTS_DIR, file);
    const key = `shorts/${file}`;
    const size = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);

    try {
      process.stdout.write(`  ⬆️  ${file} (${size} MB)...`);
      const url = await uploadFile(filePath, key);
      console.log(' ✅');

      // Update JSON with CDN URL
      const videoId = file.replace('.mp4', '');
      const video = videos.find(v => v.id === videoId);
      if (video) {
        video.cdnPath = url;
      }

      uploaded++;
    } catch (err) {
      console.log(` ❌ ${err.message}`);
      errors++;
    }
  }

  // Save updated JSON
  fs.writeFileSync(JSON_FILE, JSON.stringify(videos, null, 2));

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`✅ Uploadé: ${uploaded}/${files.length}`);
  if (errors > 0) console.log(`❌ Erreurs: ${errors}`);
  console.log(`\n📝 JSON mis à jour avec les URLs CDN`);
  console.log(`\n🔗 Tes vidéos sont sur: ${CONFIG.publicUrl}/shorts/`);
}

main().catch(console.error);
