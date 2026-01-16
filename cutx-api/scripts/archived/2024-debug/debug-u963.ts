/**
 * Debug script to investigate U963 data issues
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Investigating U963 data...\n');

  // 1. Search for U963 in ALL catalogues
  console.log('=== 1. All panels containing "U963" ===\n');
  const allU963 = await prisma.panel.findMany({
    where: {
      OR: [
        { reference: { contains: 'U963', mode: 'insensitive' } },
        { name: { contains: 'U963', mode: 'insensitive' } },
      ],
    },
    include: {
      catalogue: { select: { name: true, slug: true } },
      category: { select: { name: true } },
    },
    orderBy: { catalogue: { name: 'asc' } },
  });

  console.log(`Found ${allU963.length} panels with "U963":\n`);

  for (const panel of allU963) {
    console.log(`📦 ${panel.catalogue.name} - ${panel.reference}`);
    console.log(`   Name: ${panel.name}`);
    console.log(`   Thickness: ${panel.thickness.join(', ')} mm`);
    console.log(`   Default Thickness: ${panel.defaultThickness} mm`);
    console.log(`   Price/m²: ${panel.pricePerM2 ?? 'N/A'}`);
    console.log(`   Price/ml: ${panel.pricePerMl ?? 'N/A'}`);
    console.log(`   Price/unit: ${panel.pricePerUnit ?? 'N/A'}`);
    console.log(`   Stock: ${panel.stockStatus}`);
    console.log(`   Category: ${panel.category?.name ?? 'N/A'}`);
    console.log(`   Product Type: ${panel.productType ?? 'N/A'}`);
    console.log('');
  }

  // 2. Check Bouney specifically
  console.log('\n=== 2. Bouney panels containing "U963" ===\n');
  const bouneyU963 = await prisma.panel.findMany({
    where: {
      catalogue: { slug: 'bouney' },
      OR: [
        { reference: { contains: 'U963', mode: 'insensitive' } },
        { name: { contains: 'U963', mode: 'insensitive' } },
        { decor: { contains: 'U963', mode: 'insensitive' } },
        { manufacturerRef: { contains: 'U963', mode: 'insensitive' } },
      ],
    },
    include: {
      catalogue: { select: { name: true } },
    },
  });

  if (bouneyU963.length === 0) {
    console.log('❌ No U963 found in Bouney catalogue');

    // Check if Bouney uses different reference format
    console.log('\n   Checking Bouney reference patterns...');
    const bouneyRefs = await prisma.panel.findMany({
      where: { catalogue: { slug: 'bouney' } },
      select: { reference: true },
      take: 20,
    });
    console.log('   Sample Bouney refs:', bouneyRefs.map(p => p.reference).join(', '));
  } else {
    console.log(`Found ${bouneyU963.length} in Bouney:`);
    bouneyU963.forEach(p => console.log(`   - ${p.reference}: ${p.name}`));
  }

  // 3. Check Dispano U963 details
  console.log('\n=== 3. Dispano U963 detailed check ===\n');
  const dispanoU963 = await prisma.panel.findMany({
    where: {
      catalogue: { slug: 'dispano' },
      OR: [
        { reference: { contains: 'U963', mode: 'insensitive' } },
        { name: { contains: 'U963', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      defaultThickness: true,
      pricePerM2: true,
      pricePerMl: true,
      pricePerUnit: true,
      productType: true,
      finish: true,
      stockStatus: true,
      metadata: true,
    },
  });

  console.log(`Found ${dispanoU963.length} Dispano U963 panels:`);
  for (const p of dispanoU963) {
    console.log(`\n📋 ${p.reference}`);
    console.log(`   Name: ${p.name}`);
    console.log(`   Thickness array: [${p.thickness.join(', ')}]`);
    console.log(`   Default thickness: ${p.defaultThickness}`);
    console.log(`   Product type: ${p.productType}`);
    console.log(`   Prices: m²=${p.pricePerM2}, ml=${p.pricePerMl}, unit=${p.pricePerUnit}`);
    if (p.metadata) {
      try {
        const meta = JSON.parse(p.metadata);
        console.log(`   Metadata:`, JSON.stringify(meta, null, 2).substring(0, 500));
      } catch {
        console.log(`   Metadata (raw): ${p.metadata.substring(0, 200)}`);
      }
    }
  }

  // 4. Check what references Bouney uses for Egger decors
  console.log('\n=== 4. Bouney Egger decor references ===\n');
  const bouneyEgger = await prisma.panel.findMany({
    where: {
      catalogue: { slug: 'bouney' },
      OR: [
        { name: { contains: 'Egger', mode: 'insensitive' } },
        { name: { contains: 'U9', mode: 'insensitive' } },
      ],
    },
    select: { reference: true, name: true, decor: true, manufacturerRef: true },
    take: 10,
  });

  console.log(`Found ${bouneyEgger.length} Bouney panels with Egger/U9:`);
  bouneyEgger.forEach(p => {
    console.log(`   ${p.reference}: ${p.name}`);
    console.log(`      Decor: ${p.decor ?? 'N/A'}, ManufRef: ${p.manufacturerRef ?? 'N/A'}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
