/**
 * Test script to verify the optimized facet aggregation
 * Before: 19+ sequential queries for genres
 * After: 3 parallel queries (genres with CASE WHEN, dimensions, thicknesses)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Genre keywords (same as in catalogues.service.ts)
const genreKeywords = [
  { keyword: 'hydrofuge', label: 'Hydrofuge', searchTerm: 'hydrofuge' },
  { keyword: 'standard', label: 'Standard', searchTerm: 'standard' },
  { keyword: 'ignifug', label: 'Ignifugé', searchTerm: 'ignifugé' },
  { keyword: 'teinté', label: 'Teinté masse', searchTerm: 'teinté' },
  { keyword: 'teinte', label: 'Teinté masse', searchTerm: 'teinté' },
  { keyword: 'laqué', label: 'Laqué', searchTerm: 'laqué' },
  { keyword: 'laquable', label: 'Laquable', searchTerm: 'laqué' },
  { keyword: 'cintrable', label: 'Cintrable', searchTerm: 'cintrable' },
  { keyword: 'léger', label: 'Léger / Allégé', searchTerm: 'léger' },
  { keyword: 'allégé', label: 'Léger / Allégé', searchTerm: 'léger' },
  { keyword: 'bouche-pores', label: 'Bouche-pores', searchTerm: 'bouche-pores' },
  { keyword: 'bouche pores', label: 'Bouche-pores', searchTerm: 'bouche-pores' },
  { keyword: 'filmé', label: 'Filmé / Coffrage', searchTerm: 'filmé' },
  { keyword: 'coffrage', label: 'Filmé / Coffrage', searchTerm: 'filmé' },
  { keyword: 'ctbx', label: 'CTBX Extérieur', searchTerm: 'ctbx' },
  { keyword: 'okoumé', label: 'Okoumé', searchTerm: 'okoumé' },
  { keyword: 'okoume', label: 'Okoumé', searchTerm: 'okoumé' },
  { keyword: 'bouleau', label: 'Bouleau', searchTerm: 'bouleau' },
  { keyword: 'peuplier', label: 'Peuplier', searchTerm: 'peuplier' },
];

async function testOldMethod(whereClause: string, params: any[], catalogueCondition: string) {
  console.log('\n🐢 OLD METHOD: 19+ sequential queries');
  const start = performance.now();

  const genreCounts: { label: string; count: number }[] = [];
  const seenLabels = new Set<string>();

  for (const genre of genreKeywords) {
    const countSql = `
      SELECT COUNT(*) as count
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
      WHERE ${whereClause}
        ${catalogueCondition}
        AND unaccent(lower(p.name)) ILIKE '%' || unaccent(lower($${params.length + 1})) || '%'
    `;
    const [result] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      countSql,
      ...params,
      genre.keyword,
    );
    const count = Number(result.count);
    if (count > 0 && !seenLabels.has(genre.label)) {
      seenLabels.add(genre.label);
      genreCounts.push({ label: genre.label, count });
    }
  }

  const end = performance.now();
  console.log(`   Time: ${(end - start).toFixed(2)}ms`);
  console.log(`   Queries executed: ${genreKeywords.length}`);
  console.log(`   Results: ${genreCounts.length} genres found`);
  genreCounts.slice(0, 5).forEach(g => console.log(`     • ${g.label}: ${g.count}`));

  return { time: end - start, genreCounts };
}

async function testNewMethod(whereClause: string, params: any[], catalogueCondition: string) {
  console.log('\n🚀 NEW METHOD: 1 query with CASE WHEN');
  const start = performance.now();

  // Build CASE WHEN statements
  const genreCaseStatements = genreKeywords
    .map(
      (g, i) =>
        `SUM(CASE WHEN unaccent(lower(p.name)) ILIKE '%' || unaccent(lower('${g.keyword.replace(/'/g, "''")}')) || '%' THEN 1 ELSE 0 END) as "count_${i}"`,
    )
    .join(',\n        ');

  const genresSql = `
    SELECT
      ${genreCaseStatements}
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
      ${catalogueCondition}
  `;

  const [genreResult] = await prisma.$queryRawUnsafe<[Record<string, bigint>]>(genresSql, ...params);

  // Parse results
  const genreCounts: { label: string; count: number }[] = [];
  const seenLabels = new Set<string>();

  genreKeywords.forEach((genre, i) => {
    const count = Number(genreResult[`count_${i}`] || 0);
    if (count > 0 && !seenLabels.has(genre.label)) {
      seenLabels.add(genre.label);
      genreCounts.push({ label: genre.label, count });
    }
  });

  genreCounts.sort((a, b) => b.count - a.count);

  const end = performance.now();
  console.log(`   Time: ${(end - start).toFixed(2)}ms`);
  console.log(`   Queries executed: 1`);
  console.log(`   Results: ${genreCounts.length} genres found`);
  genreCounts.slice(0, 5).forEach(g => console.log(`     • ${g.label}: ${g.count}`));

  return { time: end - start, genreCounts };
}

async function main() {
  console.log('='.repeat(60));
  console.log('FACET AGGREGATION OPTIMIZATION TEST');
  console.log('='.repeat(60));

  // Simple query: all MDF panels
  const whereClause = `unaccent(lower(p."productType")) = 'mdf'`;
  const params: any[] = [];
  const catalogueCondition = '';

  console.log('\n📋 Test query: All MDF panels');

  // Run old method
  const oldResult = await testOldMethod(whereClause, params, catalogueCondition);

  // Run new method
  const newResult = await testNewMethod(whereClause, params, catalogueCondition);

  // Comparison
  console.log('\n📊 COMPARISON');
  console.log('='.repeat(40));
  const speedup = oldResult.time / newResult.time;
  console.log(`   Old method: ${oldResult.time.toFixed(2)}ms`);
  console.log(`   New method: ${newResult.time.toFixed(2)}ms`);
  console.log(`   Speedup: ${speedup.toFixed(1)}x faster`);
  console.log(`   Queries saved: ${genreKeywords.length - 1}`);

  // Verify results match
  const oldLabels = oldResult.genreCounts.map(g => g.label).sort();
  const newLabels = newResult.genreCounts.map(g => g.label).sort();
  const resultsMatch = JSON.stringify(oldLabels) === JSON.stringify(newLabels);
  console.log(`   Results match: ${resultsMatch ? '✅ YES' : '❌ NO'}`);

  await prisma.$disconnect();
}

main().catch(console.error);
