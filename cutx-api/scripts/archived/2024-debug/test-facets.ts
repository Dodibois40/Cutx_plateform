import { PrismaClient } from '@prisma/client';
import { parseSmartQuery, buildSmartSearchSQL } from '../src/catalogues/utils/smart-search-parser.js';

const prisma = new PrismaClient();

async function testFacets(query: string) {
  console.log('\n' + '='.repeat(60));
  console.log('Query: "' + query + '"');
  console.log('='.repeat(60));

  // Parse the query
  const parsed = parseSmartQuery(query);
  const { whereClause, params } = buildSmartSearchSQL(parsed);

  // Count total
  const countSql = `
    SELECT COUNT(*) as total
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
  `;
  const [countResult] = await prisma.$queryRawUnsafe<[{ total: bigint }]>(countSql, ...params);
  const total = Number(countResult.total);
  console.log('\n📊 Total résultats: ' + total);

  // Facettes: Genres
  console.log('\n🏷️  GENRES DISPONIBLES:');
  const genreKeywords = [
    { keyword: 'hydrofuge', label: 'Hydrofuge' },
    { keyword: 'standard', label: 'Standard' },
    { keyword: 'ignifug', label: 'Ignifugé' },
    { keyword: 'teinté', label: 'Teinté masse' },
    { keyword: 'teinte', label: 'Teinté masse' },
    { keyword: 'laqué', label: 'Laqué' },
    { keyword: 'cintrable', label: 'Cintrable' },
    { keyword: 'léger', label: 'Léger / Allégé' },
    { keyword: 'allégé', label: 'Léger / Allégé' },
  ];

  const seenLabels = new Set<string>();
  for (const genre of genreKeywords) {
    const genreSql = `
      SELECT COUNT(*) as count
      FROM "Panel" p
      JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
      WHERE ${whereClause}
        AND unaccent(lower(p.name)) ILIKE '%' || unaccent(lower($${params.length + 1})) || '%'
    `;
    try {
      const [result] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(genreSql, ...params, genre.keyword);
      const count = Number(result.count);
      if (count > 0 && !seenLabels.has(genre.label)) {
        seenLabels.add(genre.label);
        console.log('  • ' + genre.label + ': ' + count + ' panneaux');
      }
    } catch (e) {
      // ignore
    }
  }

  // Facettes: Dimensions
  console.log('\n📐 DIMENSIONS DISPONIBLES:');
  const dimSql = `
    SELECT
      p."defaultLength" as length,
      p."defaultWidth" as width,
      COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
      AND p."defaultLength" > 0
      AND p."defaultWidth" > 0
    GROUP BY p."defaultLength", p."defaultWidth"
    ORDER BY count DESC
    LIMIT 8
  `;
  try {
    const dims = await prisma.$queryRawUnsafe<{ length: number; width: number; count: bigint }[]>(dimSql, ...params);
    dims.forEach(d => {
      console.log('  • ' + d.length + ' × ' + d.width + 'mm: ' + Number(d.count) + ' panneaux');
    });
  } catch (e) {
    console.log('  (erreur)');
  }

  // Facettes: Épaisseurs
  console.log('\n📏 ÉPAISSEURS DISPONIBLES:');
  const thickSql = `
    SELECT
      unnest(p.thickness) as thickness_value,
      COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
    GROUP BY thickness_value
    ORDER BY thickness_value ASC
  `;
  try {
    const thicks = await prisma.$queryRawUnsafe<{ thickness_value: number; count: bigint }[]>(thickSql, ...params);
    thicks.filter(t => t.thickness_value > 0).slice(0, 10).forEach(t => {
      console.log('  • ' + t.thickness_value + 'mm: ' + Number(t.count) + ' panneaux');
    });
  } catch (e) {
    console.log('  (erreur)');
  }
}

async function main() {
  console.log('=== TEST FACETTES SMART SEARCH ===');

  await testFacets('mdf 19');
  await testFacets('mdf');
  await testFacets('contreplaqué');

  await prisma.$disconnect();
}

main().catch(console.error);
