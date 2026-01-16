/**
 * Fix All Melamine Brands Classification
 *
 * Reclassifies panels from STRATIFIE to MELAMINE for known melamine brands:
 * - Pfleiderer, Polyrey, Unilin, Fenix, Formica, Rauvisio, Nebodesign, Rehau
 *
 * Exclusions (real stratifié):
 * - HPL
 * - 0.8mm (thin laminate)
 * - "stratifié" in name
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Fix All Melamine Brands ===\n');

  const bouney = await prisma.catalogue.findUnique({ where: { slug: 'bouney' } });
  if (!bouney) {
    console.log('Bouney catalogue not found!');
    return;
  }

  console.log('Bouney ID:', bouney.id);

  // Count before
  const beforeMelamine = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'MELAMINE',
    },
  });
  console.log('\nMELAMINE count before:', beforeMelamine);

  // All melamine brands to fix (with accent variations)
  const brands = [
    'pfleiderer',
    'polyrey',
    'unilin',
    'fenix',
    'formica',
    'rauvisio',
    'nebodesign',
    'nébodesign',  // avec accent
    'rehau',
  ];

  let totalUpdated = 0;

  for (const brand of brands) {
    const result = await prisma.$executeRaw`
      UPDATE "Panel"
      SET "productType" = 'MELAMINE'
      WHERE "catalogueId" = ${bouney.id}
        AND "reference" LIKE 'BCB-%'
        AND "productType" = 'STRATIFIE'
        AND "name" ILIKE ${'%' + brand + '%'}
        AND "name" NOT ILIKE '%HPL%'
        AND "name" NOT ILIKE '%0.8mm%'
        AND "name" NOT ILIKE '%stratifié%'
    `;

    if (result > 0) {
      console.log(`  ${brand.padEnd(15)}: ${result} panels updated`);
      totalUpdated += Number(result);
    }
  }

  console.log('\nTotal panels updated:', totalUpdated);

  // Count after
  const afterMelamine = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'MELAMINE',
    },
  });
  console.log('MELAMINE count after:', afterMelamine);

  // Count remaining STRATIFIE
  const remainingStratifie = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'STRATIFIE',
    },
  });
  console.log('STRATIFIE remaining:', remainingStratifie);

  // Count with "blanc"
  const blancCount = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'MELAMINE',
      name: { contains: 'blanc', mode: 'insensitive' },
    },
  });
  console.log('MELAMINE "blanc" count:', blancCount);

  // Show sample of remaining STRATIFIE
  console.log('\n=== Remaining STRATIFIE samples (for manual review) ===');
  const samples = await prisma.panel.findMany({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'STRATIFIE',
    },
    select: { reference: true, name: true },
    take: 15,
  });
  samples.forEach(p => console.log(`  ${p.reference} | ${p.name?.slice(0, 60)}`));

  console.log('\n✓ Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
