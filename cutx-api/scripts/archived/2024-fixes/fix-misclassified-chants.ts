/**
 * Script pour corriger les chants mal classifiés
 * Problème: certains produits avec largeur <= 50mm sont classés comme PLACAGE, MELAMINE, etc.
 * mais sont en réalité des bandes de chant (BANDE_DE_CHANT)
 *
 * Critères de détection:
 * - Largeur <= 50mm (les chants font typiquement 19-45mm)
 * - Épaisseur <= 2mm (les chants sont très fins)
 * - productType != BANDE_DE_CHANT
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des chants mal classifiés...\n');

  // Trouver les produits qui ressemblent à des chants mais ne sont pas classés comme tels
  // Critères:
  // 1. Nom contient "chant" ou "bande" (identification certaine)
  // 2. OU: largeur 10-45mm ET épaisseur <= 2mm (dimensions typiques de chants)
  // Exclure: colle, mastic, accessoires
  const misclassified = await prisma.$queryRaw<{
    id: string;
    reference: string;
    name: string;
    productType: string | null;
    defaultWidth: number;
    defaultThickness: number | null;
    pricePerM2: number | null;
    pricePerMl: number | null;
  }[]>`
    SELECT id, reference, name, "productType", "defaultWidth", "defaultThickness", "pricePerM2", "pricePerMl"
    FROM "Panel"
    WHERE (
      -- Détection par nom (très fiable)
      LOWER(name) LIKE '%bande de chant%'
      OR LOWER(name) LIKE '%chant abs%'
      OR LOWER(name) LIKE '%chant pvc%'
      OR LOWER(name) LIKE '%chant pro%'
      -- Détection par dimensions (chants placage comme Shinnoki)
      OR (
        "defaultWidth" >= 10
        AND "defaultWidth" <= 45
        AND COALESCE("defaultThickness", 0) > 0
        AND COALESCE("defaultThickness", 0) <= 2
      )
    )
    AND ("productType" IS NULL OR "productType" != 'BANDE_DE_CHANT')
    AND "isActive" = true
    -- Exclure colle, mastic, accessoires
    AND LOWER(name) NOT LIKE '%colle%'
    AND LOWER(name) NOT LIKE '%mastic%'
    AND "productType" != 'COLLE'
    ORDER BY "defaultWidth" ASC, reference ASC
  `;

  console.log(`📊 Trouvé ${misclassified.length} produits mal classifiés\n`);

  if (misclassified.length === 0) {
    console.log('✅ Aucun produit mal classifié trouvé!');
    return;
  }

  // Grouper par type actuel
  const byType = new Map<string, number>();
  for (const p of misclassified) {
    const type = p.productType || 'NULL';
    byType.set(type, (byType.get(type) || 0) + 1);
  }

  console.log('📈 Par type actuel:');
  for (const [type, count] of byType) {
    console.log(`   - ${type}: ${count}`);
  }
  console.log('');

  // Afficher quelques exemples
  console.log('📋 Exemples (30 premiers):');
  console.log('REF | NOM | TYPE ACTUEL | LARGEUR | ÉPAISSEUR | PRIX/M² | PRIX/ML');
  console.log('-'.repeat(100));
  for (const p of misclassified.slice(0, 30)) {
    const name = (p.name || '').substring(0, 35).padEnd(35);
    const type = (p.productType || 'NULL').padEnd(15);
    console.log(`${p.reference} | ${name} | ${type} | ${p.defaultWidth}mm | ${p.defaultThickness}mm | ${p.pricePerM2 ?? '-'} | ${p.pricePerMl ?? '-'}`);
  }
  console.log('');

  // Demander confirmation pour corriger
  const args = process.argv.slice(2);
  if (!args.includes('--fix')) {
    console.log('💡 Pour corriger automatiquement, relancez avec: npx tsx scripts/fix-misclassified-chants.ts --fix');
    console.log('');
    console.log('   La correction va:');
    console.log('   1. Changer productType en "BANDE_DE_CHANT"');
    console.log('   2. Déplacer pricePerM2 vers pricePerMl si pricePerMl est null');
    return;
  }

  // Le trigger full-text search se déclenche sur UPDATE de productType
  // On doit d'abord désactiver temporairement le trigger
  console.log('🔧 Correction en cours...');

  // Désactiver le trigger
  console.log('   Désactivation du trigger full-text...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Panel" DISABLE TRIGGER panel_search_vector_trigger
  `);

  let fixed = 0;
  let pricesMoved = 0;

  try {
    for (const p of misclassified) {
      // Construire les données de mise à jour
      const data: Prisma.PanelUpdateInput = {
        productType: 'BANDE_DE_CHANT',
      };

      // Si pricePerM2 existe mais pas pricePerMl, déplacer le prix
      if (p.pricePerM2 && !p.pricePerMl) {
        data.pricePerMl = p.pricePerM2;
        data.pricePerM2 = null;
        pricesMoved++;
      }

      await prisma.panel.update({
        where: { id: p.id },
        data,
      });
      fixed++;

      if (fixed % 5 === 0) {
        console.log(`   Corrigé ${fixed}/${misclassified.length}...`);
      }
    }
  } finally {
    // Réactiver le trigger
    console.log('   Réactivation du trigger full-text...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Panel" ENABLE TRIGGER panel_search_vector_trigger
    `);
  }

  console.log(`\n✅ ${fixed} produits corrigés!`);
  console.log(`   - productType → BANDE_DE_CHANT`);
  console.log(`   - ${pricesMoved} prix déplacés de pricePerM2 vers pricePerMl`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
