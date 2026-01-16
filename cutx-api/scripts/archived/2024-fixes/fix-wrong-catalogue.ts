import { PrismaClient } from '@prisma/client';

// For production: set DATABASE_URL env var
const prisma = new PrismaClient();

async function main() {
  console.log('=== Fixing wrong catalogue associations ===\n');
  console.log('Database:', process.env.DATABASE_URL?.slice(0, 40) + '...\n');

  // Get catalogues
  const dispano = await prisma.catalogue.findUnique({ where: { slug: 'dispano' } });
  const bouney = await prisma.catalogue.findUnique({ where: { slug: 'bouney' } });

  if (!dispano || !bouney) {
    console.error('Catalogues not found!');
    return;
  }

  console.log('Dispano catalogue ID:', dispano.id);
  console.log('Bouney catalogue ID:', bouney.id);

  // Count Dispano panels in Bouney catalogue
  const wrongDispInBouney = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'DISP-' },
    },
  });

  console.log('\n1. Dispano panels (DISP-) wrongly in Bouney catalogue:', wrongDispInBouney);

  // Count BCB- panels in Dispano catalogue
  const wrongBCBInDispano = await prisma.panel.count({
    where: {
      catalogueId: dispano.id,
      reference: { startsWith: 'BCB-' },
    },
  });

  console.log('2. Bouney panels (BCB-) wrongly in Dispano catalogue:', wrongBCBInDispano);

  if (wrongDispInBouney === 0 && wrongBCBInDispano === 0) {
    console.log('\n✓ No panels to fix - all associations are correct!');
    return;
  }

  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('\n[DRY RUN MODE]');

    if (wrongDispInBouney > 0) {
      console.log(`\nWould move ${wrongDispInBouney} DISP- panels to Dispano catalogue`);
      const samples = await prisma.panel.findMany({
        where: { catalogueId: bouney.id, reference: { startsWith: 'DISP-' } },
        select: { reference: true, name: true },
        take: 5,
      });
      console.log('Samples:');
      samples.forEach(p => console.log(' -', p.reference, '|', p.name?.slice(0, 40)));
    }

    if (wrongBCBInDispano > 0) {
      console.log(`\nWould move ${wrongBCBInDispano} BCB- panels to Bouney catalogue`);
      const samples = await prisma.panel.findMany({
        where: { catalogueId: dispano.id, reference: { startsWith: 'BCB-' } },
        select: { reference: true, name: true },
        take: 5,
      });
      console.log('Samples:');
      samples.forEach(p => console.log(' -', p.reference, '|', p.name?.slice(0, 40)));
    }

    console.log('\n→ Run without --dry-run to apply fixes');
  } else {
    console.log('\nApplying fixes...');

    if (wrongDispInBouney > 0) {
      const result = await prisma.panel.updateMany({
        where: { catalogueId: bouney.id, reference: { startsWith: 'DISP-' } },
        data: { catalogueId: dispano.id },
      });
      console.log(`✓ Moved ${result.count} DISP- panels to Dispano catalogue`);
    }

    if (wrongBCBInDispano > 0) {
      const result = await prisma.panel.updateMany({
        where: { catalogueId: dispano.id, reference: { startsWith: 'BCB-' } },
        data: { catalogueId: bouney.id },
      });
      console.log(`✓ Moved ${result.count} BCB- panels to Bouney catalogue`);
    }

    console.log('\n✓ Done!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
