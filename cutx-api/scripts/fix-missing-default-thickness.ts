/**
 * Script pour corriger les panneaux avec defaultThickness null
 * mais qui ont une valeur dans le tableau thickness
 * Ceci permet le tri par épaisseur de fonctionner correctement
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des panneaux avec defaultThickness null mais thickness[] non vide...\n');

  // Trouver tous les panneaux avec defaultThickness null mais thickness non vide
  const panelsToFix = await prisma.$queryRaw<{
    id: string;
    reference: string;
    name: string;
    thickness: number[];
    defaultThickness: number | null;
  }[]>`
    SELECT id, reference, name, thickness, "defaultThickness"
    FROM "Panel"
    WHERE "defaultThickness" IS NULL
      AND array_length(thickness, 1) > 0
      AND thickness[1] <= 100
    ORDER BY reference
  `;

  console.log(`📊 Trouvé ${panelsToFix.length} panneaux à corriger\n`);

  if (panelsToFix.length === 0) {
    console.log('✅ Aucun panneau à corriger!');
    return;
  }

  // Afficher quelques exemples
  console.log('📋 Exemples (20 premiers):');
  for (const panel of panelsToFix.slice(0, 20)) {
    console.log(`   ${panel.reference}: thickness=${JSON.stringify(panel.thickness)} → defaultThickness=${panel.thickness[0]}`);
  }
  console.log('');

  // Demander confirmation pour corriger
  const args = process.argv.slice(2);
  if (!args.includes('--fix')) {
    console.log('💡 Pour corriger automatiquement, relancez avec: npx tsx scripts/fix-missing-default-thickness.ts --fix');
    return;
  }

  // Corriger les données avec une seule requête SQL
  console.log('🔧 Correction en cours...');

  const result = await prisma.$executeRaw`
    UPDATE "Panel"
    SET "defaultThickness" = thickness[1]
    WHERE "defaultThickness" IS NULL
      AND array_length(thickness, 1) > 0
      AND thickness[1] <= 100
  `;

  console.log(`\n✅ ${result} panneaux corrigés!`);
  console.log('   Le tri par épaisseur devrait maintenant fonctionner.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
