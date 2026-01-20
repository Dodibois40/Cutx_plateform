/**
 * Vérifier pourquoi les chants BCB ne sont pas trouvés dans la recherche
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('=== DIAGNOSTIC RECHERCHE CHANTS BCB ===\n');

  // 1. Vérifier un chant spécifique
  const chant = await prisma.panel.findFirst({
    where: { supplierCode: '83814' },
  });

  if (chant) {
    console.log('📦 CHANT 83814 (chêne):');
    console.log('   reference:', chant.reference);
    console.log('   name:', chant.name);
    console.log('   panelType:', chant.panelType);
    console.log('   searchText:', chant.searchText ? chant.searchText.substring(0, 100) : 'NULL');
    console.log('   categoryId:', chant.categoryId || 'NULL');
  }

  // 2. Stats searchText pour les chants
  const withoutSearchText = await prisma.panel.count({
    where: { panelType: 'CHANT', searchText: null }
  });
  const totalChants = await prisma.panel.count({
    where: { panelType: 'CHANT' }
  });
  console.log('\n📊 STATS SEARCH TEXT:');
  console.log('   Chants sans searchText:', withoutSearchText, '/', totalChants);

  // 3. Stats categoryId pour les chants
  const withoutCategory = await prisma.panel.count({
    where: { panelType: 'CHANT', categoryId: null }
  });
  console.log('   Chants sans categoryId:', withoutCategory, '/', totalChants);

  // 4. Test recherche raw SQL
  console.log('\n🔍 TEST RECHERCHE RAW:');

  const rawSearch = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND (
        lower(unaccent(p.name)) LIKE '%chene%' OR
        lower(unaccent(p.name)) LIKE '%chêne%'
      )
  `;
  console.log('   Recherche ILIKE "chene/chêne":', Number(rawSearch[0]?.count));

  const rawSearchChants = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND p."panelType" = 'CHANT'
      AND (
        lower(unaccent(p.name)) LIKE '%chene%' OR
        lower(unaccent(p.name)) LIKE '%chêne%'
      )
  `;
  console.log('   Recherche ILIKE "chene/chêne" + panelType=CHANT:', Number(rawSearchChants[0]?.count));

  await prisma.$disconnect();
}

check().catch(console.error);
