import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  console.log('=== TEST RANKING RECHERCHE ===\n');

  // Simuler exactement ce que fait l'API
  const results = await prisma.$queryRaw<any[]>`
    SELECT
      p.id,
      p.reference,
      p.name,
      p."panelType",
      ts_rank(p."searchVector", to_tsquery('french_unaccent', 'chene:*')) as rank
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND p."searchVector" @@ to_tsquery('french_unaccent', 'chene:*')
    ORDER BY ts_rank(p."searchVector", to_tsquery('french_unaccent', 'chene:*')) DESC, p.name ASC
    LIMIT 15
  `;

  console.log('Top 15 résultats (classés par rank):');
  console.log('─'.repeat(100));
  results.forEach((r, i) => {
    console.log(`${i + 1}. [${r.panelType}] rank=${r.rank?.toFixed(6)} - ${r.name?.substring(0, 60)}`);
  });

  // Voir où sont les chants
  console.log('\n=== POSITION DES CHANTS ===');
  const chantResults = await prisma.$queryRaw<any[]>`
    SELECT
      p.name,
      p."panelType",
      ts_rank(p."searchVector", to_tsquery('french_unaccent', 'chene:*')) as rank
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND p."panelType" = 'CHANT'
      AND p."searchVector" @@ to_tsquery('french_unaccent', 'chene:*')
    ORDER BY rank DESC
    LIMIT 5
  `;

  console.log('Top 5 chants par rank:');
  chantResults.forEach((r) => {
    console.log(`  rank=${r.rank?.toFixed(6)} - ${r.name?.substring(0, 60)}`);
  });

  await prisma.$disconnect();
}

test().catch(console.error);
