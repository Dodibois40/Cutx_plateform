/**
 * Debug searchVector pour comprendre pourquoi la recherche ne fonctionne pas
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('=== DEBUG SEARCH VECTOR ===\n');

  // 1. Vérifier le searchVector d'un chant
  const result = await prisma.$queryRaw<any[]>`
    SELECT
      reference,
      name,
      "searchText",
      "searchVector"::text as search_vector_text
    FROM "Panel"
    WHERE "supplierCode" = '83814'
    LIMIT 1
  `;

  console.log('📦 CHANT 83814:');
  if (result[0]) {
    console.log('   name:', result[0].name);
    console.log('   searchText:', result[0].searchText?.substring(0, 80));
    console.log('   searchVector:', result[0].search_vector_text?.substring(0, 100) || 'NULL');
  }

  // 2. Test différentes configurations tsquery
  console.log('\n🔍 TESTS TSQUERY:');

  try {
    const test1 = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "Panel" p
      WHERE p."searchVector" @@ to_tsquery('french_unaccent', 'chene:*')
    `;
    console.log('   french_unaccent "chene:*":', Number(test1[0]?.count));
  } catch (e: any) {
    console.log('   french_unaccent: ERREUR -', e.message?.substring(0, 80));
  }

  try {
    const test2 = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "Panel" p
      WHERE p."searchVector" @@ to_tsquery('french', 'chene:*')
    `;
    console.log('   french "chene:*":', Number(test2[0]?.count));
  } catch (e: any) {
    console.log('   french: ERREUR -', e.message?.substring(0, 80));
  }

  try {
    const test3 = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "Panel" p
      WHERE p."searchVector" @@ to_tsquery('simple', 'chene:*')
    `;
    console.log('   simple "chene:*":', Number(test3[0]?.count));
  } catch (e: any) {
    console.log('   simple: ERREUR -', e.message?.substring(0, 80));
  }

  // 3. Vérifier combien de panels ont searchVector != NULL
  const withVector = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM "Panel" WHERE "searchVector" IS NOT NULL
  `;
  const total = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM "Panel"
  `;
  console.log('\n📊 STATS:');
  console.log('   Panels avec searchVector:', Number(withVector[0]?.count), '/', Number(total[0]?.count));

  // 4. Vérifier si les chants ont searchVector
  const chantsWithVector = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM "Panel"
    WHERE "panelType" = 'CHANT' AND "searchVector" IS NOT NULL
  `;
  const chantsTotal = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM "Panel" WHERE "panelType" = 'CHANT'
  `;
  console.log('   Chants avec searchVector:', Number(chantsWithVector[0]?.count), '/', Number(chantsTotal[0]?.count));

  await prisma.$disconnect();
}

check().catch(console.error);
