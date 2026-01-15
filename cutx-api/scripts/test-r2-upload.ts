#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function test() {
  console.log('Config:');
  console.log('  Account ID:', process.env.R2_ACCOUNT_ID);
  console.log('  Bucket:', process.env.R2_BUCKET);
  console.log('  Public URL:', process.env.R2_PUBLIC_URL);
  console.log('');

  // List objects
  console.log('Listing objects...');
  const list = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET }));
  console.log('Objects in bucket:', list.Contents?.length || 0);
  if (list.Contents && list.Contents.length > 0) {
    list.Contents.slice(0, 5).forEach((obj) => {
      console.log('  -', obj.Key, `(${obj.Size} bytes)`);
    });
  }
  console.log('');

  // Test upload
  console.log('Uploading test file...');
  const testData = Buffer.from('Hello from CutX!');
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: 'test/hello.txt',
      Body: testData,
      ContentType: 'text/plain',
    }),
  );
  console.log('✅ Upload successful!');
  console.log('');

  // Verify
  console.log('Verifying...');
  const list2 = await s3.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET }));
  console.log('Objects after upload:', list2.Contents?.length || 0);

  console.log('');
  console.log('Test URL:', `${process.env.R2_PUBLIC_URL}/test/hello.txt`);
}

test().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
