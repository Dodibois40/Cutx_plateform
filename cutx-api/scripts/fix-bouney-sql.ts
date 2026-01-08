import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Fix Bouney Classification (SQL) ===\n');

  // Get Bouney catalogue
  const bouney = await prisma.catalogue.findUnique({ where: { slug: 'bouney' } });
  if (!bouney) {
    console.log('Bouney catalogue not found!');
    return;
  }

  console.log('Bouney ID:', bouney.id);

  // Count before
  const beforeCount = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'MELAMINE',
    },
  });
  console.log('MELAMINE count before:', beforeCount);

  // Update Egger STRATIFIE → MELAMINE using raw SQL
  const result1 = await prisma.$executeRaw`
    UPDATE "Panel"
    SET "productType" = 'MELAMINE'
    WHERE "catalogueId" = ${bouney.id}
      AND "reference" LIKE 'BCB-%'
      AND "productType" = 'STRATIFIE'
      AND "name" ILIKE '%egger%'
      AND "name" NOT ILIKE '%0.8mm%'
      AND "name" NOT ILIKE '%HPL%'
      AND "name" NOT ILIKE '%stratifié%'
  `;
  console.log('Updated Egger STRATIFIE → MELAMINE:', result1);

  // Update PARTICULE with "mélamine" → MELAMINE
  const result2 = await prisma.$executeRaw`
    UPDATE "Panel"
    SET "productType" = 'MELAMINE'
    WHERE "catalogueId" = ${bouney.id}
      AND "reference" LIKE 'BCB-%'
      AND "productType" = 'PARTICULE'
      AND "name" ILIKE '%mélamine%'
  `;
  console.log('Updated PARTICULE mélamine → MELAMINE:', result2);

  // Count after
  const afterCount = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'MELAMINE',
    },
  });
  console.log('\nMELAMINE count after:', afterCount);

  // Count with blanc
  const blancCount = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'MELAMINE',
      name: { contains: 'blanc', mode: 'insensitive' },
    },
  });
  console.log('MELAMINE "blanc" count:', blancCount);

  console.log('\n✓ Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
