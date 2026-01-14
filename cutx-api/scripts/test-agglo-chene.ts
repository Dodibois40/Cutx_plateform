import { PrismaClient } from '@prisma/client';
import { parseSmartQuery, buildSmartSearchSQL } from '../src/catalogues/utils/smart-search-parser.js';

const prisma = new PrismaClient();

async function testSearch(query: string) {
  console.log('\n' + '='.repeat(60));
  console.log('Recherche:', JSON.stringify(query));
  console.log('='.repeat(60));

  const parsed = parseSmartQuery(query);
  console.log('Parsed:', {
    productTypes: parsed.productTypes,
    woods: parsed.woods,
    colors: parsed.colors,
    thickness: parsed.thickness,
  });

  const { whereClause, params } = buildSmartSearchSQL(parsed);
  console.log('SQL params:', params);

  const sql = `
    SELECT p.name, p."productType", p.finish
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id AND c."isActive" = true
    WHERE ${whereClause}
    LIMIT 10
  `;

  try {
    const results = await prisma.$queryRawUnsafe<any[]>(sql, ...params);
    console.log(`\n✅ ${results.length} résultats trouvés:`);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.productType}] ${r.name.substring(0, 55)}`);
    });
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

async function main() {
  // Tests
  await testSearch('agglo chêne');
  await testSearch('agglo noyer');
  await testSearch('mdf chêne');
  await testSearch('cp bouleau');
  await testSearch('agglo');  // Devrait toujours fonctionner
  await testSearch('chêne');  // Recherche simple

  await prisma.$disconnect();
}

main().catch(console.error);
