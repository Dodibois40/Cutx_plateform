#!/usr/bin/env npx tsx
/**
 * Supprime les fichiers HTML corrompus du bucket R2
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  console.log('🧹 Nettoyage des fichiers HTML corrompus\n');

  // List all objects
  const list = await s3.send(
    new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET }),
  );

  if (!list.Contents || list.Contents.length === 0) {
    console.log('Bucket vide');
    return;
  }

  console.log(`Objets dans le bucket: ${list.Contents.length}\n`);

  // Find small files (likely HTML challenge pages, real images are usually > 1KB)
  const toDelete = list.Contents.filter((obj) => {
    const size = obj.Size || 0;
    return size < 2000; // Files under 2KB are likely HTML pages
  });

  console.log(`Fichiers à supprimer (< 2KB): ${toDelete.length}`);
  toDelete.forEach((obj) => {
    console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
  });

  if (toDelete.length === 0) {
    console.log('\nRien à supprimer');
    return;
  }

  // Delete from R2
  console.log('\nSuppression de R2...');
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET,
      Delete: {
        Objects: toDelete.map((obj) => ({ Key: obj.Key })),
      },
    }),
  );
  console.log('✅ Fichiers supprimés de R2');

  // Reset panel imageUrls in database
  console.log('\nRéinitialisation des URLs en base...');
  const r2Prefix = process.env.R2_PUBLIC_URL;

  // Find panels with R2 URLs and reset them
  const panelsToReset = await prisma.panel.findMany({
    where: {
      imageUrl: { startsWith: r2Prefix },
    },
    select: { id: true, reference: true, imageUrl: true },
  });

  console.log(`Panels à réinitialiser: ${panelsToReset.length}`);

  // We need to restore the original URLs - but we don't have them saved
  // For now, just set them to null and re-run migration later
  if (panelsToReset.length > 0) {
    await prisma.panel.updateMany({
      where: {
        imageUrl: { startsWith: r2Prefix },
      },
      data: {
        imageUrl: null, // Will need to re-import from source
      },
    });
    console.log('✅ URLs réinitialisées (null)');
    console.log('\n⚠️  Re-importez les panels depuis le catalogue pour restaurer les URLs originales');
  }

  await prisma.$disconnect();
  console.log('\n✅ Nettoyage terminé');
}

main().catch(async (e) => {
  console.error('❌ Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
