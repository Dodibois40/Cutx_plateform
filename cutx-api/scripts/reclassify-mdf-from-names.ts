/**
 * Reclasse les panneaux MDF dans les bonnes catégories
 * basé sur leurs noms (Hydrofuge, Ignifuge, Bouche pores, etc.)
 *
 * Usage:
 *   npx tsx scripts/reclassify-mdf-from-names.ts --dry-run
 *   npx tsx scripts/reclassify-mdf-from-names.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// Règles de classification basées sur le nom
function determineCategory(name: string): string {
  const nameLower = name.toLowerCase();

  // Ignifuge (M1, ignifuge)
  if (nameLower.includes('ignifuge') || nameLower.includes(' m1 ') || nameLower.includes('mediland m1')) {
    return 'mdf-ignifuge';
  }

  // Hydrofuge (MH, hydrofuge, ctbh)
  if (nameLower.includes('hydrofuge') || nameLower.includes(' mh ') || nameLower.includes('mediland mh') || nameLower.includes('ctbh')) {
    return 'mdf-hydrofuge';
  }

  // Bouche pores / À laquer (BP, bouche pores, lac, laquer)
  if (nameLower.includes('bouche pores') || nameLower.includes('bouche-pores') ||
      nameLower.includes(' bp ') || nameLower.includes('mediland bp') ||
      nameLower.includes('fibralac') || nameLower.includes('fibraplast lac') ||
      nameLower.includes('à laquer') || nameLower.includes('a laquer')) {
    return 'mdf-a-laquer';
  }

  // Teinté (colour, color, teinté, teinte, valchromat, fibracolour)
  if (nameLower.includes('teinté') || nameLower.includes('teinte') ||
      nameLower.includes('colour') || nameLower.includes('color') ||
      nameLower.includes('valchromat') || nameLower.includes('fibracolour')) {
    return 'mdf-teinte-couleurs';
  }

  // Léger (léger, leger, light, ultralight)
  if (nameLower.includes('léger') || nameLower.includes('leger') ||
      nameLower.includes('light') || nameLower.includes('ultralight')) {
    return 'mdf-leger';
  }

  // Cintrable (cintrable, flexible, flex)
  if (nameLower.includes('cintrable') || nameLower.includes('flexible') || nameLower.includes('flex')) {
    return 'mdf-cintrable';
  }

  // Par défaut: Standard
  return 'mdf-standard';
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       RECLASSIFICATION MDF PAR NOM                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Récupérer les catégories MDF
  const categories = await prisma.category.findMany({
    where: {
      slug: { in: ['mdf-standard', 'mdf-hydrofuge', 'mdf-ignifuge', 'mdf-a-laquer', 'mdf-teinte-couleurs', 'mdf-leger', 'mdf-cintrable'] }
    },
    select: { id: true, slug: true, name: true }
  });

  const categoryMap = new Map(categories.map(c => [c.slug, c.id]));

  console.log('📂 Catégories MDF disponibles:');
  for (const cat of categories) {
    console.log(`   ${cat.slug} → ${cat.name}`);
  }
  console.log('');

  // Récupérer tous les panneaux MDF
  const panels = await prisma.panel.findMany({
    where: { productType: 'MDF' },
    select: {
      id: true,
      reference: true,
      name: true,
      categoryId: true,
      category: { select: { slug: true } }
    },
    orderBy: { reference: 'asc' }
  });

  console.log(`📦 Total panneaux MDF: ${panels.length}\n`);

  // Analyser et reclasser
  const changes: { reference: string; name: string; from: string; to: string; id: string; newCategoryId: string }[] = [];
  const stats: Record<string, { correct: number; reclassified: number }> = {};

  for (const panel of panels) {
    const targetSlug = determineCategory(panel.name || '');
    const currentSlug = panel.category?.slug || 'NONE';
    const targetCategoryId = categoryMap.get(targetSlug);

    if (!targetCategoryId) {
      console.log(`⚠️ Catégorie non trouvée: ${targetSlug}`);
      continue;
    }

    // Initialiser les stats
    if (!stats[targetSlug]) {
      stats[targetSlug] = { correct: 0, reclassified: 0 };
    }

    if (currentSlug !== targetSlug) {
      changes.push({
        reference: panel.reference,
        name: panel.name || '',
        from: currentSlug,
        to: targetSlug,
        id: panel.id,
        newCategoryId: targetCategoryId
      });
      stats[targetSlug].reclassified++;
    } else {
      stats[targetSlug].correct++;
    }
  }

  // Afficher les changements par catégorie
  console.log('═══ CHANGEMENTS PAR CATÉGORIE ═══\n');

  const changesByTarget: Record<string, typeof changes> = {};
  for (const change of changes) {
    if (!changesByTarget[change.to]) {
      changesByTarget[change.to] = [];
    }
    changesByTarget[change.to].push(change);
  }

  for (const [slug, categoryChanges] of Object.entries(changesByTarget)) {
    console.log(`\n📁 ${slug} (+${categoryChanges.length} panneaux)`);
    for (const c of categoryChanges.slice(0, 10)) {
      console.log(`   ${c.reference}: ${c.name.substring(0, 50)}`);
      console.log(`      ${c.from} → ${c.to}`);
    }
    if (categoryChanges.length > 10) {
      console.log(`   ... et ${categoryChanges.length - 10} autres`);
    }
  }

  // Appliquer les changements
  if (!DRY_RUN && changes.length > 0) {
    console.log('\n═══ APPLICATION DES CHANGEMENTS ═══\n');

    let updated = 0;
    let errors = 0;

    for (const change of changes) {
      try {
        await prisma.panel.update({
          where: { id: change.id },
          data: { categoryId: change.newCategoryId }
        });
        updated++;
      } catch (error) {
        console.log(`❌ Erreur ${change.reference}: ${(error as Error).message}`);
        errors++;
      }
    }

    console.log(`✅ Mis à jour: ${updated}`);
    console.log(`❌ Erreurs: ${errors}`);
  }

  // Résumé final
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('Distribution finale:');
  for (const [slug, stat] of Object.entries(stats).sort((a, b) => (b[1].correct + b[1].reclassified) - (a[1].correct + a[1].reclassified))) {
    const total = stat.correct + stat.reclassified;
    console.log(`   ${slug.padEnd(20)} ${total.toString().padStart(4)} (${stat.reclassified} reclassés)`);
  }

  console.log(`\n   Total reclassements: ${changes.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Aucune modification n\'a été faite');
    console.log('   Relancez sans --dry-run pour appliquer');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
