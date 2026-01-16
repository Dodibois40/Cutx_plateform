/**
 * Script pour corriger les épaisseurs aberrantes dans la base de données
 * Problème: certains panneaux ont le supplierCode stocké comme épaisseur
 * Solution: identifier et corriger ces entrées
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des panneaux avec épaisseur aberrante (> 100mm)...\n');

  // Trouver tous les panneaux avec une épaisseur > 100
  const aberrantPanels = await prisma.panel.findMany({
    where: {
      OR: [
        { defaultThickness: { gt: 100 } },
        // Pour les arrays, on doit faire une requête raw
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      defaultThickness: true,
      supplierCode: true,
      productType: true,
    },
    orderBy: { reference: 'asc' }
  });

  // Aussi chercher via raw query pour les thickness arrays
  const rawAberrant = await prisma.$queryRaw<{
    id: string;
    reference: string;
    name: string;
    thickness: number[];
    "defaultThickness": number | null;
    "supplierCode": string | null;
    "productType": string | null;
  }[]>`
    SELECT id, reference, name, thickness, "defaultThickness", "supplierCode", "productType"
    FROM "Panel"
    WHERE EXISTS (
      SELECT 1 FROM UNNEST(thickness) AS t WHERE t > 100
    )
    ORDER BY reference
  `;

  console.log(`📊 Trouvé ${rawAberrant.length} panneaux avec épaisseur > 100mm:\n`);

  if (rawAberrant.length === 0) {
    console.log('✅ Aucun panneau avec épaisseur aberrante trouvé!');
    return;
  }

  // Analyser les patterns
  const stats = {
    total: rawAberrant.length,
    supplierCodeMatchesThickness: 0,
    noSupplierCode: 0,
    byProductType: {} as Record<string, number>,
  };

  for (const panel of rawAberrant) {
    // Vérifier si le supplierCode correspond à l'épaisseur aberrante
    const aberrantThickness = panel.thickness.find(t => t > 100);
    if (panel.supplierCode && aberrantThickness?.toString() === panel.supplierCode) {
      stats.supplierCodeMatchesThickness++;
    }
    if (!panel.supplierCode) {
      stats.noSupplierCode++;
    }
    const pt = panel.productType || 'UNKNOWN';
    stats.byProductType[pt] = (stats.byProductType[pt] || 0) + 1;
  }

  console.log('📈 Statistiques:');
  console.log(`   - Total: ${stats.total}`);
  console.log(`   - Où supplierCode = épaisseur aberrante: ${stats.supplierCodeMatchesThickness}`);
  console.log(`   - Sans supplierCode: ${stats.noSupplierCode}`);
  console.log(`   - Par type de produit:`, stats.byProductType);
  console.log('');

  // Afficher les 20 premiers
  console.log('📋 Exemples (20 premiers):');
  for (const panel of rawAberrant.slice(0, 20)) {
    console.log(`   ${panel.reference}: thickness=${JSON.stringify(panel.thickness)}, supplierCode=${panel.supplierCode}, type=${panel.productType}`);
  }
  console.log('');

  // Demander confirmation pour corriger
  const args = process.argv.slice(2);
  if (!args.includes('--fix')) {
    console.log('💡 Pour corriger automatiquement, relancez avec: npx tsx scripts/fix-aberrant-thickness.ts --fix');
    console.log('');
    console.log('   La correction va:');
    console.log('   1. Mettre thickness à [] (vide) pour ces panneaux');
    console.log('   2. Mettre defaultThickness à null');
    console.log('   3. Les panneaux pourront être re-scrapés avec les bonnes valeurs');
    return;
  }

  // Corriger les données
  console.log('🔧 Correction en cours...');

  let fixed = 0;
  for (const panel of rawAberrant) {
    await prisma.panel.update({
      where: { id: panel.id },
      data: {
        thickness: [],
        defaultThickness: null,
      }
    });
    fixed++;
    if (fixed % 10 === 0) {
      console.log(`   Corrigé ${fixed}/${rawAberrant.length}...`);
    }
  }

  console.log(`\n✅ ${fixed} panneaux corrigés!`);
  console.log('   Les épaisseurs ont été réinitialisées.');
  console.log('   Vous pouvez maintenant re-scraper ces produits pour obtenir les bonnes valeurs.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
