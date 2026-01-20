/**
 * Verify actual chants count
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Count all BANDE_DE_CHANT
  const total = await prisma.panel.count({
    where: { productType: 'BANDE_DE_CHANT', isActive: true },
  });
  console.log('Total BANDE_DE_CHANT actifs:', total);

  // By catalogue
  console.log('\nPar catalogue:');
  const catalogues = await prisma.catalogue.findMany();
  for (const cat of catalogues) {
    const count = await prisma.panel.count({
      where: { productType: 'BANDE_DE_CHANT', isActive: true, catalogueId: cat.id },
    });
    if (count > 0) {
      console.log(`  ${cat.name}: ${count}`);
    }
  }

  // Show some examples
  console.log('\nExemples de chants (10 premiers):');
  const examples = await prisma.panel.findMany({
    where: { productType: 'BANDE_DE_CHANT', isActive: true },
    select: {
      name: true,
      reference: true,
      manufacturerRef: true,
      catalogue: { select: { name: true } },
    },
    take: 10,
  });
  for (const ex of examples) {
    const name = ex.name || ex.reference || ex.manufacturerRef || '(sans nom)';
    console.log(`  [${ex.catalogue?.name}] ${name.substring(0, 60)}`);
  }

  // Also check what was counted before Phase 1
  console.log('\n\nVérification de la Phase 1:');
  console.log('Combien avaient productType=BANDE_DE_CHANT avant nos changements?');

  // Check if there are inactive ones
  const inactive = await prisma.panel.count({
    where: { productType: 'BANDE_DE_CHANT', isActive: false },
  });
  console.log(`  BANDE_DE_CHANT inactifs: ${inactive}`);

  // Total
  const totalAll = await prisma.panel.count({
    where: { productType: 'BANDE_DE_CHANT' },
  });
  console.log(`  BANDE_DE_CHANT total (actifs + inactifs): ${totalAll}`);

  await prisma.$disconnect();
}

main().catch(console.error);
