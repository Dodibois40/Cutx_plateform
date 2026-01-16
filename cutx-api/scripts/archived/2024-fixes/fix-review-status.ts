import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Fixing Panel Review Status ===\n');

  // Count panels with NULL reviewStatus
  const nullCount = await prisma.panel.count({ where: { reviewStatus: null as any } });
  console.log(`Panels with NULL reviewStatus: ${nullCount}`);

  if (nullCount === 0) {
    console.log('No panels to fix!');
    return;
  }

  // Update all panels with NULL status to NON_VERIFIE
  console.log('\nUpdating panels to NON_VERIFIE...');
  const result = await prisma.$executeRaw`
    UPDATE "Panel"
    SET "reviewStatus" = 'NON_VERIFIE'
    WHERE "reviewStatus" IS NULL
  `;
  console.log(`Updated ${result} panels`);

  // Verify the fix
  const afterFix = await prisma.panel.count({ where: { reviewStatus: 'NON_VERIFIE' } });
  console.log(`\nPanels with NON_VERIFIE status after fix: ${afterFix}`);

  console.log('\n✅ Done! Restart the frontend and refresh the page.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
