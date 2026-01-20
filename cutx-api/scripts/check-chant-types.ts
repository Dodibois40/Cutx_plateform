/**
 * Check chant types distribution in database
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('=== STATS CHANTS ===\n');

  // Compter par panelType et panelSubType
  const stats = await prisma.$queryRaw<
    { panelType: string | null; panelSubType: string | null; count: bigint }[]
  >`
    SELECT
      "panelType"::text,
      "panelSubType"::text,
      COUNT(*) as count
    FROM "Panel"
    WHERE "panelType" = 'CHANT' OR "productType" ILIKE '%CHANT%'
    GROUP BY "panelType", "panelSubType"
    ORDER BY count DESC
  `;

  for (const row of stats) {
    console.log(
      `panelType: ${row.panelType || 'NULL'}, panelSubType: ${row.panelSubType || 'NULL'} → ${row.count}`,
    );
  }

  console.log('\n=== TOTAL ===');
  const total = stats.reduce((sum, r) => sum + Number(r.count), 0);
  console.log(`Total: ${total} chants`);

  await prisma.$disconnect();
}

check().catch(console.error);
