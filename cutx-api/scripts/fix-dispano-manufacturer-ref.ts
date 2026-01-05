/**
 * Script pour extraire le code décor (U963, W1100, etc.) du nom des produits Dispano
 * et le stocker dans manufacturerRef
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing Dispano manufacturerRef from product names...\n');

  // Désactiver le trigger temporairement (s'il existe)
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" DISABLE TRIGGER ALL`);
    console.log('   Triggers disabled');
  } catch (e) {
    console.log('   No triggers to disable or permission denied');
  }

  // Utiliser une requête SQL brute pour extraire et mettre à jour les codes décor
  // Regex PostgreSQL pour extraire U963, W1100, H3170, F206, etc.
  const result = await prisma.$executeRaw`
    UPDATE "Panel" p
    SET "manufacturerRef" = UPPER((regexp_match(p.name, '([UWFH][0-9]{3,4})', 'i'))[1])
    WHERE p."catalogueId" IN (SELECT id FROM "Catalogue" WHERE slug = 'dispano')
      AND p.name ~ '[UWFH][0-9]{3,4}'
  `;

  // Réactiver les triggers
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Panel" ENABLE TRIGGER ALL`);
    console.log('   Triggers re-enabled');
  } catch (e) {
    // Ignore
  }

  console.log(`✅ Updated ${result} Dispano panels with extracted decor codes\n`);

  // Vérifier les résultats pour U963
  console.log('🔍 Verification - Searching for U963:');
  const u963Panels = await prisma.$queryRaw<{ reference: string; name: string; manufacturerRef: string }[]>`
    SELECT p.reference, p.name, p."manufacturerRef"
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE c.slug = 'dispano' AND p."manufacturerRef" = 'U963'
    LIMIT 10
  `;

  console.log(`   Found ${u963Panels.length} Dispano panels with manufacturerRef = "U963":`);
  u963Panels.forEach(p => {
    console.log(`   - ${p.reference}: ${p.name.substring(0, 50)}...`);
  });

  // Afficher quelques exemples de codes extraits
  console.log('\n📝 Sample of extracted codes:');
  const samples = await prisma.$queryRaw<{ name: string; manufacturerRef: string }[]>`
    SELECT p.name, p."manufacturerRef"
    FROM "Panel" p
    JOIN "Catalogue" c ON p."catalogueId" = c.id
    WHERE c.slug = 'dispano'
      AND p."manufacturerRef" IS NOT NULL
      AND p."manufacturerRef" ~ '^[UWFH]\d{3,4}$'
    ORDER BY RANDOM()
    LIMIT 10
  `;

  samples.forEach(s => {
    console.log(`   ${s.manufacturerRef} ← "${s.name.substring(0, 55)}..."`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
