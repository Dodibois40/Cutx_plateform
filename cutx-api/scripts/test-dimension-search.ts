import { PrismaClient } from '@prisma/client';
import { parseSmartQuery, buildSmartSearchSQL } from '../src/catalogues/utils/smart-search-parser.js';

const prisma = new PrismaClient();

async function testSearch(query: string) {
  console.log('\n' + '='.repeat(60));
  console.log('Query:', JSON.stringify(query));
  console.log('='.repeat(60));

  const parsed = parseSmartQuery(query);
  console.log('Parsed:', {
    productTypes: parsed.productTypes,
    thickness: parsed.thickness,
    dimension: parsed.dimension,
    subcategories: parsed.subcategories,
  });

  const { whereClause, params } = buildSmartSearchSQL(parsed);
  console.log('SQL params:', params);

  const countSql = `
    SELECT COUNT(*) as total
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
  `;

  const sampleSql = `
    SELECT p.name, p.reference, p."defaultLength", p."defaultWidth", p.thickness
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
    LIMIT 5
  `;

  try {
    const [countResult] = await prisma.$queryRawUnsafe<[{ total: bigint }]>(countSql, ...params);
    const total = Number(countResult.total);
    console.log('\n📊 Total:', total, 'panneaux');

    if (total > 0) {
      const samples = await prisma.$queryRawUnsafe<any[]>(sampleSql, ...params);
      console.log('Exemples:');
      samples.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name.substring(0, 50)} (${s.defaultLength}×${s.defaultWidth})`);
      });
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

async function main() {
  // D'abord, vérifions quelles dimensions existent pour les MDF 19mm
  console.log('=== Dimensions disponibles pour MDF 19mm ===');
  const dims = await prisma.$queryRaw<any[]>`
    SELECT "defaultLength" as length, "defaultWidth" as width, COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE p."productType" = 'MDF'
      AND 19 = ANY(p.thickness)
      AND p."defaultLength" > 0
      AND p."defaultWidth" > 0
    GROUP BY "defaultLength", "defaultWidth"
    ORDER BY count DESC
    LIMIT 5
  `;
  dims.forEach(d => console.log(`  ${d.length}×${d.width}: ${d.count} panneaux`));

  // Maintenant testons la recherche avec dimensions
  await testSearch('mdf 19');

  if (dims.length > 0) {
    const firstDim = dims[0];
    await testSearch(`mdf 19 ${firstDim.length}x${firstDim.width}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
