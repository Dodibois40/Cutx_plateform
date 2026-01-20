/**
 * Corrige les panneaux mal classés dans mdf-standard
 * - CompacMel → MELAMINE (decors-unis)
 * - Fibralux → MELAMINE (decors-unis)
 *
 * Usage:
 *   npx tsx scripts/fix-mdf-misclassified.ts --dry-run
 *   npx tsx scripts/fix-mdf-misclassified.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

interface PanelFix {
  reference: string;
  name: string;
  currentCategory: string;
  targetCategory: string;
  targetProductType: string;
  reason: string;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       CORRECTION PANNEAUX MAL CLASSÉS                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Récupérer les catégories cibles
  const categories = await prisma.category.findMany({
    where: {
      slug: { in: ['mdf-standard', 'decors-unis', 'unis-blanc', 'unis-noir'] }
    },
    select: { id: true, slug: true, name: true }
  });

  const categoryMap = new Map(categories.map(c => [c.slug, c]));

  console.log('📂 Catégories disponibles:');
  for (const [slug, cat] of categoryMap) {
    console.log(`   ${slug} → ${cat.name}`);
  }

  const decorsUnis = categoryMap.get('decors-unis');
  const unisBlanc = categoryMap.get('unis-blanc');
  const unisNoir = categoryMap.get('unis-noir');

  if (!decorsUnis) {
    console.error('❌ Catégorie decors-unis non trouvée!');
    return;
  }

  // Trouver les panneaux à corriger
  const mdfStandard = categoryMap.get('mdf-standard');
  if (!mdfStandard) {
    console.error('❌ Catégorie mdf-standard non trouvée!');
    return;
  }

  const panels = await prisma.panel.findMany({
    where: { categoryId: mdfStandard.id },
    include: { category: { select: { slug: true, name: true } } }
  });

  console.log(`\n📦 Total panneaux dans mdf-standard: ${panels.length}\n`);

  // Analyser et préparer les corrections
  const fixes: PanelFix[] = [];

  for (const panel of panels) {
    const name = (panel.name || '').toLowerCase();

    // CompacMel → MELAMINE unis-blanc ou decors-unis
    if (name.includes('compacmel')) {
      const targetCat = name.includes('blanc') ? (unisBlanc || decorsUnis) : decorsUnis;
      fixes.push({
        reference: panel.reference,
        name: panel.name || '',
        currentCategory: panel.category?.slug || 'none',
        targetCategory: targetCat!.slug,
        targetProductType: 'MELAMINE',
        reason: 'CompacMel = Compact Mélaminé (pas MDF brut)'
      });
    }

    // Fibralux → MELAMINE decors-unis
    if (name.includes('fibralux')) {
      // Déterminer la couleur
      let targetCat = decorsUnis;
      if (name.includes('black') || name.includes('noir')) {
        targetCat = unisNoir || decorsUnis;
      }

      fixes.push({
        reference: panel.reference,
        name: panel.name || '',
        currentCategory: panel.category?.slug || 'none',
        targetCategory: targetCat!.slug,
        targetProductType: 'MELAMINE',
        reason: 'Fibralux = MDF avec film décoratif (panneau décoratif)'
      });
    }
  }

  // Afficher les corrections proposées
  console.log('═══ CORRECTIONS PROPOSÉES ═══\n');

  for (const fix of fixes) {
    console.log(`📋 ${fix.reference}`);
    console.log(`   Nom: ${fix.name.substring(0, 60)}`);
    console.log(`   Catégorie: ${fix.currentCategory} → ${fix.targetCategory}`);
    console.log(`   ProductType: MDF → ${fix.targetProductType}`);
    console.log(`   Raison: ${fix.reason}`);
    console.log('');
  }

  // Appliquer les corrections
  if (!DRY_RUN && fixes.length > 0) {
    console.log('═══ APPLICATION DES CORRECTIONS ═══\n');

    let updated = 0;
    let errors = 0;

    for (const fix of fixes) {
      const targetCat = categoryMap.get(fix.targetCategory);

      if (!targetCat) {
        console.log(`⚠️ Catégorie ${fix.targetCategory} non trouvée, skip`);
        continue;
      }

      try {
        await prisma.panel.updateMany({
          where: { reference: fix.reference },
          data: {
            categoryId: targetCat.id,
            productType: fix.targetProductType
          }
        });
        console.log(`✅ ${fix.reference} → ${fix.targetCategory} (${fix.targetProductType})`);
        updated++;
      } catch (error) {
        console.log(`❌ Erreur ${fix.reference}: ${(error as Error).message}`);
        errors++;
      }
    }

    console.log(`\n✅ Corrigés: ${updated}`);
    console.log(`❌ Erreurs: ${errors}`);
  }

  // Résumé
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n   Total corrections: ${fixes.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Aucune modification n\'a été faite');
    console.log('   Relancez sans --dry-run pour appliquer');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
