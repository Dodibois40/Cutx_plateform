import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Panel Review Status ===\n');

  // Count total panels
  const total = await prisma.panel.count();
  console.log(`Total panels: ${total}`);

  // Count by reviewStatus
  const nonVerifie = await prisma.panel.count({ where: { reviewStatus: 'NON_VERIFIE' } });
  const verifie = await prisma.panel.count({ where: { reviewStatus: 'VERIFIE' } });
  const aCorriger = await prisma.panel.count({ where: { reviewStatus: 'A_CORRIGER' } });

  // Check for NULL using raw SQL
  const nullResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "Panel" WHERE "reviewStatus" IS NULL
  `;
  const nullStatus = Number(nullResult[0].count);

  console.log(`\nReview Status Distribution:`);
  console.log(`  NON_VERIFIE: ${nonVerifie}`);
  console.log(`  VERIFIE: ${verifie}`);
  console.log(`  A_CORRIGER: ${aCorriger}`);
  console.log(`  NULL: ${nullStatus}`);

  // Count active panels
  const activeTotal = await prisma.panel.count({ where: { isActive: true } });
  const activeNonVerifie = await prisma.panel.count({ where: { isActive: true, reviewStatus: 'NON_VERIFIE' } });

  console.log(`\nActive Panels:`);
  console.log(`  Total active: ${activeTotal}`);
  console.log(`  Active NON_VERIFIE: ${activeNonVerifie}`);

  // Check if reviewStatus column exists by getting a sample
  const sample = await prisma.panel.findFirst({
    select: {
      id: true,
      name: true,
      reviewStatus: true,
      isActive: true,
    },
  });
  console.log('\nSample panel:');
  console.log(JSON.stringify(sample, null, 2));

  // If any panels have null status, show warning
  if (nullStatus > 0) {
    console.log('\n⚠️  Found panels with NULL reviewStatus!');
    console.log('Run this to fix: npx tsx scripts/fix-review-status.ts');
  } else {
    console.log('\n✅ All panels have a valid reviewStatus');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
