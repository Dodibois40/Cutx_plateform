import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Searching for 79155 everywhere...\n');

  // Search in ALL fields
  const allSearch = await prisma.$queryRaw<{
    reference: string;
    panel_name: string;
    catalogue_name: string;
    manufacturerRef: string | null;
  }[]>`
    SELECT
      p.reference,
      p.name as panel_name,
      c.name as catalogue_name,
      p."manufacturerRef"
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p.reference LIKE '%79155%'
      OR p.name LIKE '%79155%'
      OR p."manufacturerRef" LIKE '%79155%'
      OR p.decor LIKE '%79155%'
  `;

  console.log(`Found ${allSearch.length} panels with "79155" in any field`);
  allSearch.forEach(p => {
    console.log(`  ${p.catalogue_name}: ${p.reference} - ${p.panel_name.substring(0, 40)}`);
  });

  // Check all catalogues
  console.log('\n📊 All catalogues:');
  const catalogues = await prisma.catalogue.findMany({
    select: {
      slug: true,
      name: true,
      _count: { select: { panels: true } }
    },
  });
  catalogues.forEach(c => {
    console.log(`  ${c.slug}: ${c.name} (${c._count.panels} panels)`);
  });

  // Check reference ranges in Bouney
  console.log('\n🔍 Bouney reference ranges (first 2 digits after BCB-):');
  const ranges = await prisma.$queryRaw<{ prefix: string; cnt: bigint }[]>`
    SELECT
      SUBSTRING(reference FROM 5 FOR 2) as prefix,
      COUNT(*) as cnt
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE c.slug = 'bouney'
    GROUP BY SUBSTRING(reference FROM 5 FOR 2)
    ORDER BY prefix
  `;
  ranges.forEach(r => console.log(`  ${r.prefix}xxxx: ${r.cnt} panels`));

  await prisma.$disconnect();
}

main().catch(console.error);
