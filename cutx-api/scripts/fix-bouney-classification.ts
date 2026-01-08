/**
 * Fix Bouney Panel Classification
 *
 * Problems identified:
 * 1. Egger panels (mélaminé) are classified as STRATIFIE instead of MELAMINE
 * 2. Some DISP- panels are incorrectly in the Bouney catalogue
 *
 * This script fixes the productType for Egger panels that should be MELAMINE
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('=== Fix Bouney Panel Classification ===\n');
  console.log('Mode:', dryRun ? 'DRY RUN' : 'APPLY CHANGES');
  console.log('Database:', process.env.DATABASE_URL?.slice(0, 40) + '...\n');

  // Get Bouney catalogue
  const bouney = await prisma.catalogue.findUnique({ where: { slug: 'bouney' } });
  const dispano = await prisma.catalogue.findUnique({ where: { slug: 'dispano' } });

  if (!bouney || !dispano) {
    console.error('Catalogues not found!');
    return;
  }

  // ========================================
  // FIX 1: Move DISP- panels to Dispano
  // ========================================

  const wrongDispCount = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'DISP-' },
    },
  });

  console.log('1. DISP- panels in Bouney catalogue:', wrongDispCount);

  if (wrongDispCount > 0 && !dryRun) {
    const result = await prisma.panel.updateMany({
      where: {
        catalogueId: bouney.id,
        reference: { startsWith: 'DISP-' },
      },
      data: { catalogueId: dispano.id },
    });
    console.log(`   ✓ Moved ${result.count} DISP- panels to Dispano\n`);
  }

  // ========================================
  // FIX 2: Reclassify Egger STRATIFIE panels as MELAMINE
  // ========================================

  // Egger panels with certain patterns should be MELAMINE, not STRATIFIE
  // - Panels with "egger" in name AND productType=STRATIFIE
  // - BUT NOT those with "0.8mm" or "HPL" (those are real stratifiés)

  const eggerStratifie = await prisma.panel.findMany({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'STRATIFIE',
      name: { contains: 'egger', mode: 'insensitive' },
      NOT: [
        { name: { contains: '0.8mm', mode: 'insensitive' } },
        { name: { contains: 'HPL', mode: 'insensitive' } },
        { name: { contains: 'stratifié', mode: 'insensitive' } },
        { name: { contains: 'STRATIFIE', mode: 'insensitive' } },
      ],
    },
    select: { id: true, reference: true, name: true },
  });

  console.log('2. Egger STRATIFIE panels that should be MELAMINE:', eggerStratifie.length);

  if (dryRun) {
    console.log('   Sample (first 10):');
    eggerStratifie.slice(0, 10).forEach(p =>
      console.log('    -', p.reference, '|', p.name?.slice(0, 45))
    );
  } else if (eggerStratifie.length > 0) {
    const ids = eggerStratifie.map(p => p.id);
    const result = await prisma.panel.updateMany({
      where: { id: { in: ids } },
      data: { productType: 'MELAMINE' },
    });
    console.log(`   ✓ Reclassified ${result.count} panels as MELAMINE\n`);
  }

  // ========================================
  // FIX 3: Reclassify "mélamine" PARTICULE panels
  // ========================================

  const melParticule = await prisma.panel.findMany({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'PARTICULE',
      name: { contains: 'mélamine', mode: 'insensitive' },
    },
    select: { id: true, reference: true, name: true },
  });

  console.log('3. PARTICULE panels with "mélamine" in name:', melParticule.length);

  if (dryRun) {
    melParticule.forEach(p =>
      console.log('    -', p.reference, '|', p.name?.slice(0, 45))
    );
  } else if (melParticule.length > 0) {
    const ids = melParticule.map(p => p.id);
    const result = await prisma.panel.updateMany({
      where: { id: { in: ids } },
      data: { productType: 'MELAMINE' },
    });
    console.log(`   ✓ Reclassified ${result.count} panels as MELAMINE\n`);
  }

  // ========================================
  // STATS: Show final counts
  // ========================================

  if (!dryRun) {
    const finalMelamine = await prisma.panel.count({
      where: {
        catalogueId: bouney.id,
        reference: { startsWith: 'BCB-' },
        productType: 'MELAMINE',
      },
    });

    const finalBlanc = await prisma.panel.count({
      where: {
        catalogueId: bouney.id,
        reference: { startsWith: 'BCB-' },
        productType: 'MELAMINE',
        name: { contains: 'blanc', mode: 'insensitive' },
      },
    });

    console.log('=== Final Stats ===');
    console.log('Bouney MELAMINE panels:', finalMelamine);
    console.log('Bouney MELAMINE "blanc":', finalBlanc);
  } else {
    console.log('\n→ Run without --dry-run to apply changes');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
