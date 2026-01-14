import { PrismaClient } from '@prisma/client';
import { parseSmartQuery, buildSmartSearchSQL } from '../src/catalogues/utils/smart-search-parser.js';

const prisma = new PrismaClient();

async function testSmartSearch(query: string) {
  console.log('\n' + '='.repeat(60));
  console.log('Query: "' + query + '"');
  console.log('='.repeat(60));

  // Parse the query
  const parsed = parseSmartQuery(query);
  console.log('\nParsed:');
  console.log('  productTypes:', parsed.productTypes.join(', ') || '(none)');
  console.log('  thickness:', parsed.thickness ? parsed.thickness + 'mm' : '(none)');
  console.log('  colors:', parsed.colors.slice(0, 3).join(', ') || '(none)');
  console.log('  woods:', parsed.woods.slice(0, 3).join(', ') || '(none)');
  console.log('  searchText:', parsed.searchText || '(none)');

  // Build SQL
  const { whereClause, params } = buildSmartSearchSQL(parsed);
  console.log('\nSQL WHERE:', whereClause.substring(0, 200) + '...');
  console.log('Params:', params);

  // Count total matching
  const countSql = `
    SELECT COUNT(*) as total
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
  `;

  // Get sample results
  const sampleSql = `
    SELECT p.id, p.name, p.reference, p."productType", p.thickness, p."stockStatus"
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
    ORDER BY p.name ASC
    LIMIT 5
  `;

  try {
    const [countResult] = await prisma.$queryRawUnsafe<[{ total: bigint }]>(countSql, ...params);
    const total = Number(countResult.total);
    const results = await prisma.$queryRawUnsafe<any[]>(sampleSql, ...params);
    console.log('\n🎯 TOTAL: ' + total + ' panneaux trouvés');
    console.log('Aperçu (5 premiers):');
    results.forEach((r, i) => {
      const thickness = r.thickness && r.thickness.length > 0 ? r.thickness[0] + 'mm' : '-';
      console.log('  ' + (i + 1) + '. [' + r.productType + '] ' + r.name.substring(0, 50) + ' (' + thickness + ')');
    });
  } catch (error: any) {
    console.error('\nError:', error.message);
  }
}

async function main() {
  console.log('=== TEST SMART SEARCH API ===');

  const tests = [
    'mdf 19',
    'mdf 19 standard',
    'mdf hydrofuge 19',
    'mdf ignifugé',
    'mdf teinté',
    'agglo hydrofuge',
    'méla gris',
    'agglo chêne 19',
    'strat blanc 0.8',
    'chant chêne',
    'melamine blanc',
    'compact noir',
  ];

  for (const test of tests) {
    await testSmartSearch(test);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
