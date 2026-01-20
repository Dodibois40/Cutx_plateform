/**
 * Forcer la reconstruction complète des searchVector pour les chants BCB
 * en utilisant directement le SQL du trigger
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function rebuild() {
  console.log('=== RECONSTRUCTION FORCÉE DES SEARCH VECTORS ===\n');

  // 1. Vérifier l'état actuel
  const before = await prisma.$queryRaw<any[]>`
    SELECT reference, name, "searchVector"::text as sv
    FROM "Panel"
    WHERE "supplierCode" = '83814'
  `;
  console.log('AVANT:');
  console.log('  name:', before[0]?.name);
  console.log('  searchVector:', before[0]?.sv?.substring(0, 100));

  // 2. Mettre à jour explicitement avec la même logique que le trigger
  console.log('\n🔄 Mise à jour forcée...');

  const result = await prisma.$executeRaw`
    UPDATE "Panel"
    SET
      "searchVector" =
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(name, ''))), 'A') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(reference, ''))), 'A') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("manufacturerRef", ''))), 'A') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(decor, ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("colorChoice", ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("decorCode", ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("decorName", ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("finishName", ''))), 'B') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce("productType", ''))), 'C') ||
        setweight(to_tsvector('french_unaccent', unaccent(coalesce(material, ''))), 'C'),
      "searchText" = lower(unaccent(
        coalesce(name, '') || ' ' ||
        coalesce(reference, '') || ' ' ||
        coalesce("manufacturerRef", '') || ' ' ||
        coalesce(decor, '') || ' ' ||
        coalesce("colorChoice", '') || ' ' ||
        coalesce("decorCode", '') || ' ' ||
        coalesce("decorName", '')
      )),
      "updatedAt" = NOW()
    WHERE "catalogueId" = 'cmjqpjtly0000by4cnkga0kaq'
      AND (
        "reference" LIKE 'BCB-BOI-%' OR
        "reference" LIKE 'BCB-MEL-%' OR
        "reference" LIKE 'BCB-ABS-%' OR
        "reference" LIKE 'BCB-CHANT-%' OR
        "reference" LIKE 'BCB-QUERKUS-%'
      )
  `;

  console.log(`✅ ${result} chants mis à jour`);

  // 3. Vérifier après
  const after = await prisma.$queryRaw<any[]>`
    SELECT reference, name, "searchVector"::text as sv
    FROM "Panel"
    WHERE "supplierCode" = '83814'
  `;
  console.log('\nAPRÈS:');
  console.log('  name:', after[0]?.name);
  console.log('  searchVector:', after[0]?.sv?.substring(0, 150));

  // 4. Test de recherche
  console.log('\n🔍 TEST RECHERCHE:');
  const searchTest = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND p."panelType" = 'CHANT'
      AND p."searchVector" @@ to_tsquery('french_unaccent', 'chen:*')
  `;
  console.log('  Chants avec "chen:*":', Number(searchTest[0]?.count));

  await prisma.$disconnect();
}

rebuild().catch(console.error);
