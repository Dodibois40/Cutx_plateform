/**
 * Test script to verify accent-insensitive search
 * Run with: npx tsx scripts/test-search.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSearch() {
  console.log('🔍 Testing accent-insensitive search...\n');

  const testCases = [
    { query: 'chene', description: 'chene (without accent)' },
    { query: 'chêne', description: 'chêne (with accent)' },
    { query: 'melamine', description: 'melamine (without accent)' },
    { query: 'mélaminé', description: 'mélaminé (with accents)' },
    { query: 'hetre', description: 'hetre (without accent)' },
    { query: 'hêtre', description: 'hêtre (with accent)' },
    { query: 'noyer', description: 'noyer' },
  ];

  for (const { query, description } of testCases) {
    // Normalize query (same as in the service)
    const normalizedQuery = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const terms = normalizedQuery
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 1)
      .map(t => t.replace(/[^\w]/g, ''))
      .filter(t => t.length > 0)
      .map(t => `${t}:*`)
      .join(' & ');

    try {
      // Test full-text search with french_unaccent
      const result = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM "Panel" p
        WHERE p."isActive" = true
          AND p."searchVector" @@ to_tsquery('french_unaccent', ${terms})
      `;

      // Also test trigram similarity
      const trigramResult = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM "Panel" p
        WHERE p."isActive" = true
          AND (
            similarity(COALESCE(p."searchText", ''), ${normalizedQuery}) > 0.2 OR
            lower(unaccent(p.name)) LIKE '%' || ${normalizedQuery} || '%'
          )
      `;

      console.log(`✓ "${description}"`);
      console.log(`  Full-text (french_unaccent): ${result[0].count} résultats`);
      console.log(`  Trigram similarity: ${trigramResult[0].count} résultats`);
      console.log('');
    } catch (error) {
      console.log(`✗ "${description}" - Error: ${error}`);
    }
  }

  // Compare "chene" vs "chêne" results
  console.log('--- Comparing "chene" vs "chêne" results ---\n');

  const cheneNormalized = 'chene';
  const cheneTerms = 'chene:*';

  const cheneResults = await prisma.$queryRaw<{ name: string; reference: string }[]>`
    SELECT p.name, p.reference
    FROM "Panel" p
    WHERE p."isActive" = true
      AND p."searchVector" @@ to_tsquery('french_unaccent', ${cheneTerms})
    ORDER BY ts_rank(p."searchVector", to_tsquery('french_unaccent', ${cheneTerms})) DESC
    LIMIT 10
  `;

  console.log('Top 10 résultats pour "chene":');
  cheneResults.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.reference})`);
  });

  await prisma.$disconnect();
}

testSearch().catch(console.error);
