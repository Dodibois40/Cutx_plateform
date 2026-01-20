import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  console.log('=== SIMULATION RECHERCHE API ===\n');

  // Ce que l'API fait :
  const searchQuery = 'chene';
  const normalizedQuery = searchQuery
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const terms = normalizedQuery
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/[^\w]/g, ''))
    .filter((t) => t.length > 0)
    .slice(0, 10)
    .map((t) => `${t}:*`)
    .join(' & ');

  console.log('Recherche originale:', searchQuery);
  console.log('Normalisée:', normalizedQuery);
  console.log('Termes tsquery:', terms);

  // Test direct
  console.log('\n=== TESTS DE MATCHING ===');

  // Test 1: Requête exacte de l'API
  const test1 = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND p."searchVector" @@ to_tsquery('french_unaccent', 'chene:*')
  `;
  console.log("french_unaccent 'chene:*':", Number(test1[0]?.count));

  // Test 2: Avec chen
  const test2 = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND p."searchVector" @@ to_tsquery('french_unaccent', 'chen:*')
  `;
  console.log("french_unaccent 'chen:*':", Number(test2[0]?.count));

  // Test 3: Que produit to_tsquery?
  const tsq = await prisma.$queryRaw<any[]>`
    SELECT
      to_tsquery('french_unaccent', 'chene:*')::text as query_result
  `;
  console.log("\nto_tsquery('french_unaccent', 'chene:*'):", tsq[0]?.query_result);

  // Test 4: Recherche spécifique sur les CHANT
  const test4 = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND p."panelType" = 'CHANT'
      AND p."searchVector" @@ to_tsquery('french_unaccent', 'chene:*')
  `;
  console.log("\nRecherche CHANT + 'chene:*':", Number(test4[0]?.count));

  // Test 5: Trigram fallback (ce que l'API utilise si full-text échoue)
  const test5 = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND (
        similarity(COALESCE(p."searchText", ''), 'chene') > 0.2 OR
        lower(unaccent(p.name)) LIKE '%chene%' OR
        lower(unaccent(p.reference)) LIKE '%chene%'
      )
  `;
  console.log("Trigram search 'chene':", Number(test5[0]?.count));

  await prisma.$disconnect();
}

test().catch(console.error);
