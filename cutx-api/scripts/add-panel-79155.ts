/**
 * Add panel 79155 manually to the database
 * Product: Stratifié contrebalancement 8/10 mm blanc mat 3050
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Adding panel BCB-79155...\n');

  // Disable triggers temporarily
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" DISABLE TRIGGER ALL`);
    console.log('   Triggers disabled');
  } catch (e) {
    console.log('   Could not disable triggers');
  }

  // Get Bouney catalogue
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'bouney' },
  });

  if (!catalogue) {
    console.error('❌ Catalogue Bouney not found');
    return;
  }

  // Product data from the website screenshot
  const panelData = {
    reference: 'BCB-79155',
    name: 'Stratifié contrebalancement 8/10 mm blanc mat 3050',
    material: 'Stratifié',
    finish: 'Mat',
    productType: 'STRATIFIE',
    thickness: [0.8, 1.0], // 8/10 mm = 0.8mm et 1.0mm
    defaultThickness: 0.8,
    defaultLength: 3050,
    defaultWidth: 1300,
    pricePerM2: 5.19,
    stockStatus: 'EN STOCK',
    supportQuality: 'hpl',
    decor: 'unis',
    colorChoice: 'blanc',
    isActive: true,
    catalogueId: catalogue.id,
  };

  try {
    const panel = await prisma.panel.upsert({
      where: {
        catalogueId_reference: {
          catalogueId: catalogue.id,
          reference: panelData.reference,
        },
      },
      update: panelData,
      create: panelData,
    });

    console.log('✅ Panel added/updated:', panel.reference);
    console.log(`   Name: ${panel.name}`);
    console.log(`   Price: ${panel.pricePerM2}€/m²`);
    console.log(`   Dimensions: ${panel.defaultLength}x${panel.defaultWidth}mm`);
    console.log(`   Thickness: ${panel.thickness.join(', ')}mm`);

  } catch (err) {
    console.error('❌ Error:', err);
  }

  // Re-enable triggers
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" ENABLE TRIGGER ALL`);
    console.log('   Triggers re-enabled');
  } catch (e) {
    // Ignore
  }

  // Verify it's searchable
  console.log('\n🔍 Verification - searching for 79155...');
  const found = await prisma.panel.findMany({
    where: {
      reference: { contains: '79155' },
    },
    select: { reference: true, name: true },
  });

  console.log(`Found ${found.length} panels:`);
  found.forEach(p => console.log(`   - ${p.reference}: ${p.name}`));

  await prisma.$disconnect();
}

main().catch(console.error);
