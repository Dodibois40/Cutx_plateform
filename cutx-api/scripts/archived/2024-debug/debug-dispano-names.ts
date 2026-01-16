/**
 * Debug: Check Dispano panel names and manufacturerRef
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Dispano panels with U963 in name...\n');

  // 1. Check panels with U963 in name
  const panelsWithU963 = await prisma.$queryRaw<{ name: string; manufacturerRef: string | null }[]>`
    SELECT p.name, p."manufacturerRef"
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE c.slug = 'dispano' AND p.name ILIKE '%U963%'
    LIMIT 5
  `;

  console.log('Panels with U963 in name:');
  panelsWithU963.forEach(p => {
    console.log(`  Name: ${p.name}`);
    console.log(`  manufacturerRef: ${p.manufacturerRef || 'NULL'}\n`);
  });

  // 2. Try regex extraction
  console.log('\n🧪 Testing regex extraction...');
  const regexTest = await prisma.$queryRaw<{ name: string; extracted: string | null }[]>`
    SELECT p.name, (regexp_match(p.name, '([UWFH][0-9]{3,4})', 'i'))[1] as extracted
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE c.slug = 'dispano' AND p.name ~ '[UWFH][0-9]{3,4}'
    LIMIT 10
  `;

  console.log('Regex extraction results:');
  regexTest.forEach(r => {
    console.log(`  "${r.name.substring(0, 50)}..." → ${r.extracted}`);
  });

  // 3. Count how many can be updated
  const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE c.slug = 'dispano'
      AND p.name ~ '[UWFH][0-9]{3,4}'
      AND (p."manufacturerRef" IS NULL OR p."manufacturerRef" = '')
  `;

  console.log(`\n📊 Panels that can be updated: ${countResult[0].count}`);

  await prisma.$disconnect();
}

main().catch(console.error);
