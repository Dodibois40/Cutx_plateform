/**
 * Forcer la régénération de searchVector et searchText pour les chants BCB
 *
 * Le trigger PostgreSQL devrait mettre à jour ces champs automatiquement,
 * mais les chants scrapés ne les ont pas.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function fix() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 DRY-RUN' : '🚀 MODE RÉEL');
  console.log('═'.repeat(60));
  console.log('');

  // Trouver tous les chants BCB
  const whereClause = {
    catalogueId: 'cmjqpjtly0000by4cnkga0kaq',
    OR: [
      { reference: { startsWith: 'BCB-BOI-' } },
      { reference: { startsWith: 'BCB-MEL-' } },
      { reference: { startsWith: 'BCB-ABS-' } },
      { reference: { startsWith: 'BCB-CHANT-' } },
      { reference: { startsWith: 'BCB-QUERKUS-' } }
    ]
  };

  const total = await prisma.panel.count({ where: whereClause });
  console.log(`📦 Total chants BCB à mettre à jour: ${total}`);
  console.log('');

  if (DRY_RUN) {
    console.log('Mode dry-run, pas de mise à jour effectuée.');
    console.log('Exécuter sans --dry-run pour appliquer les changements.');
    await prisma.$disconnect();
    return;
  }

  // Utiliser une requête SQL raw pour forcer le trigger
  // En faisant un UPDATE qui ne change rien de valeur, le trigger se déclenche
  console.log('🔄 Déclenchement du trigger pour régénérer searchText/searchVector...');

  const result = await prisma.$executeRaw`
    UPDATE "Panel"
    SET "updatedAt" = NOW()
    WHERE "catalogueId" = 'cmjqpjtly0000by4cnkga0kaq'
      AND (
        "reference" LIKE 'BCB-BOI-%' OR
        "reference" LIKE 'BCB-MEL-%' OR
        "reference" LIKE 'BCB-ABS-%' OR
        "reference" LIKE 'BCB-CHANT-%' OR
        "reference" LIKE 'BCB-QUERKUS-%'
      )
  `;

  console.log(`✅ ${result} panneaux mis à jour`);
  console.log('');

  // Vérifier le résultat
  console.log('🔍 Vérification...');

  const sample = await prisma.$queryRaw<Array<{ reference: string; searchText: string | null }>>`
    SELECT reference, "searchText"
    FROM "Panel"
    WHERE "supplierCode" IN ('83814', '77701', '83760')
    LIMIT 3
  `;

  sample.forEach(p => {
    console.log(`   ${p.reference}: searchText = ${p.searchText ? p.searchText.substring(0, 50) + '...' : 'NULL'}`);
  });

  // Test de recherche
  console.log('');
  console.log('🔍 Test recherche "chêne"...');

  const searchResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE p."isActive" = true
      AND c."isActive" = true
      AND c.slug = 'bouney'
      AND p."panelType" = 'CHANT'
      AND (
        p."searchText" LIKE '%chene%' OR
        lower(unaccent(p.name)) LIKE '%chene%'
      )
  `;

  console.log(`   Chants trouvés avec "chene": ${Number(searchResult[0]?.count)}`);

  await prisma.$disconnect();
}

fix().catch(console.error);
