import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  console.log('=== TEST TSQUERY MATCHING ===\n');

  // Le vrai searchVector d'un chant chêne
  const realVector = await prisma.$queryRaw<any[]>`
    SELECT "searchVector"::text as sv FROM "Panel" WHERE "supplierCode" = '83814'
  `;
  console.log('SearchVector réel:', realVector[0]?.sv?.substring(0, 100));

  // Test différentes requêtes
  console.log('\n=== TESTS DE MATCHING ===');

  const tests = [
    { query: "chene:*", config: 'french_unaccent' },
    { query: "chene:*", config: 'french' },
    { query: "chen:*", config: 'french_unaccent' },
    { query: "bois:*", config: 'french_unaccent' },
    { query: "chant:*", config: 'french_unaccent' },
  ];

  for (const t of tests) {
    const result = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM "Panel"
      WHERE "panelType" = 'CHANT'
        AND "searchVector" @@ to_tsquery(${t.config}, ${t.query})
    `;
    console.log(`  ${t.config} "${t.query}": ${Number(result[0]?.count)} chants`);
  }

  // Test ce que produit to_tsquery
  console.log('\n=== CE QUE PRODUIT TO_TSQUERY ===');
  const queries = await prisma.$queryRaw<any[]>`
    SELECT
      to_tsquery('french_unaccent', 'chene:*')::text as q1,
      to_tsquery('french_unaccent', 'chen:*')::text as q2,
      to_tsquery('french', 'chene:*')::text as q3,
      to_tsquery('simple', 'chene:*')::text as q4
  `;
  console.log("  french_unaccent 'chene:*':", queries[0].q1);
  console.log("  french_unaccent 'chen:*':", queries[0].q2);
  console.log("  french 'chene:*':", queries[0].q3);
  console.log("  simple 'chene:*':", queries[0].q4);

  await prisma.$disconnect();
}

test().catch(console.error);
