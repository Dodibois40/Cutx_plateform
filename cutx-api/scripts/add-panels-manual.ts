/**
 * Add multiple panels manually to the database
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const panels = [
  {
    reference: 'BCB-76818',
    name: 'Stratifié contrebalancement 12/10 mm blanc mi-mat 3050',
    material: 'Stratifié',
    productType: 'STRATIFIE',
    thickness: [1.2],
    defaultThickness: 1.2,
    defaultLength: 3050,
    defaultWidth: 1300,
    pricePerM2: 6.81,
    stockStatus: 'EN STOCK',
    supportQuality: 'hpl',
    decor: 'unis',
    colorChoice: 'blanc',
    finish: 'MAT',
    isActive: true,
  },
  {
    reference: 'BCB-79155',
    name: 'Stratifié contrebalancement 8/10 mm blanc mat 3050',
    material: 'Stratifié',
    productType: 'STRATIFIE',
    thickness: [0.8],
    defaultThickness: 0.8,
    defaultLength: 3050,
    defaultWidth: 1300,
    pricePerM2: 5.19,
    stockStatus: 'EN STOCK',
    supportQuality: 'hpl',
    decor: 'unis',
    colorChoice: 'blanc',
    finish: 'MAT',
    isActive: true,
  },
  {
    reference: 'BCB-80250',
    name: 'Stratifié contrebalancement 8/10 mm blanc 4200',
    material: 'Stratifié',
    productType: 'STRATIFIE',
    thickness: [0.8],
    defaultThickness: 0.8,
    defaultLength: 4200,
    defaultWidth: 1300,
    pricePerM2: 8.83,
    stockStatus: 'EN STOCK',
    supportQuality: 'hpl',
    decor: 'unis',
    colorChoice: 'blanc',
    finish: 'MAT',
    isActive: true,
  },
  {
    reference: 'BCB-94402',
    name: 'Mélaminé 30 mm W1000 ST38 Egger blanc premium',
    material: 'Mélaminé',
    productType: 'MELAMINE',
    thickness: [30],
    defaultThickness: 30,
    defaultLength: 2800,
    defaultWidth: 2070,
    pricePerM2: null,
    stockStatus: 'Sur commande',
    supportQuality: 'panneau de particules standard P2',
    decor: 'unis',
    colorChoice: 'W1000',
    finish: 'ST38',
    isActive: true,
  },
  {
    reference: 'BCB-105399',
    name: 'Stratifié contrebalancement 8/10 mm noir 42C SD 3050',
    material: 'Stratifié',
    productType: 'STRATIFIE',
    thickness: [0.8],
    defaultThickness: 0.8,
    defaultLength: 3050,
    defaultWidth: 1300,
    pricePerM2: null,
    stockStatus: 'Sur commande',
    supportQuality: 'hpl',
    decor: 'unis',
    colorChoice: 'noir 42C',
    finish: 'SD',
    isActive: true,
  },
];

async function main() {
  console.log('📦 Adding panels manually...\n');

  // Disable triggers
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

  let saved = 0;
  let errors = 0;

  for (const panel of panels) {
    try {
      const result = await prisma.panel.upsert({
        where: {
          catalogueId_reference: {
            catalogueId: catalogue.id,
            reference: panel.reference,
          },
        },
        update: {
          ...panel,
        },
        create: {
          ...panel,
          catalogueId: catalogue.id,
        },
      });

      console.log(`✅ ${result.reference} - ${result.name?.substring(0, 50)}`);
      console.log(`   ${result.defaultLength}x${result.defaultWidth}x${result.defaultThickness}mm | ${result.pricePerM2 ?? 'N/A'}€/m² | ${result.stockStatus}`);
      saved++;
    } catch (err) {
      console.error(`❌ ${panel.reference}: ${(err as Error).message}`);
      errors++;
    }
  }

  // Re-enable triggers
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" ENABLE TRIGGER ALL`);
    console.log('\n   Triggers re-enabled');
  } catch (e) {
    // Ignore
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Résultat: ${saved} sauvegardés, ${errors} erreurs`);
  console.log('═'.repeat(50));

  // Verify
  console.log('\n🔍 Vérification...');
  for (const panel of panels) {
    const found = await prisma.panel.findFirst({
      where: { reference: panel.reference },
      select: { reference: true, name: true },
    });
    console.log(found ? `   ✅ ${found.reference}` : `   ❌ ${panel.reference} NOT FOUND`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
