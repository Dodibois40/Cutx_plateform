/**
 * Déplace les panneaux plaqués et mélaminés hors de mdf-standard
 *
 * Usage:
 *   npx tsx scripts/fix-mdf-replaques.ts --dry-run
 *   npx tsx scripts/fix-mdf-replaques.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

interface PanelMove {
  reference: string;
  name: string;
  targetCategory: string;
  targetProductType?: string;
  reason: string;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       DÉPLACEMENT DES PANNEAUX PLAQUÉS/MÉLAMINÉS                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Récupérer les catégories cibles
  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['mdf-standard', 'plaque-chene', 'plaque-noyer', 'plaque-frene', 'plaque-hetre',
             'plaque-autres-essences', 'unis-blanc', 'decors-unis']
      }
    },
    select: { id: true, slug: true, name: true }
  });

  const categoryMap = new Map(categories.map(c => [c.slug, c]));

  console.log('📂 Catégories cibles:');
  for (const [slug, cat] of categoryMap) {
    console.log(`   ${slug} → ${cat.name}`);
  }

  const mdfStandard = categoryMap.get('mdf-standard');
  if (!mdfStandard) {
    console.error('❌ Catégorie mdf-standard non trouvée!');
    return;
  }

  // Récupérer les panneaux
  const panels = await prisma.panel.findMany({
    where: { categoryId: mdfStandard.id },
    select: { id: true, reference: true, name: true, productType: true }
  });

  console.log(`\n📦 Total panneaux dans mdf-standard: ${panels.length}\n`);

  // Analyser et préparer les déplacements
  const moves: PanelMove[] = [];

  for (const p of panels) {
    const name = (p.name || '').toLowerCase();

    // 1. MDF mélaminé → MELAMINE unis-blanc
    if (name.includes('mélamine') || name.includes('melamine')) {
      moves.push({
        reference: p.reference,
        name: p.name || '',
        targetCategory: name.includes('blanc') ? 'unis-blanc' : 'decors-unis',
        targetProductType: 'MELAMINE',
        reason: 'MDF mélaminé = panneau MELAMINE'
      });
      continue;
    }

    // 2. Aggloméré replaqué → plaque-* avec productType PARTICULE
    if (name.includes('aggloméré') || name.includes('agglomere')) {
      const essence = detectEssence(name);
      moves.push({
        reference: p.reference,
        name: p.name || '',
        targetCategory: `plaque-${essence}`,
        targetProductType: 'PARTICULE',
        reason: 'Aggloméré replaqué ≠ MDF'
      });
      continue;
    }

    // 3. MDF replaqué → plaque-*
    if (name.includes('replaqué') || name.includes('replaque') ||
        (name.includes('fibraform') && name.includes('natur'))) {
      const essence = detectEssence(name);
      moves.push({
        reference: p.reference,
        name: p.name || '',
        targetCategory: `plaque-${essence}`,
        reason: 'MDF replaqué = panneau plaqué bois'
      });
      continue;
    }
  }

  // Afficher les déplacements
  console.log('═══ DÉPLACEMENTS PROPOSÉS ═══\n');

  // Grouper par catégorie cible
  const byTarget: Record<string, PanelMove[]> = {};
  for (const m of moves) {
    if (!byTarget[m.targetCategory]) {
      byTarget[m.targetCategory] = [];
    }
    byTarget[m.targetCategory].push(m);
  }

  for (const [target, items] of Object.entries(byTarget)) {
    console.log(`\n📁 ${target} (${items.length} panneaux)`);
    console.log('─'.repeat(50));
    for (const m of items) {
      const typeChange = m.targetProductType ? ` [→ ${m.targetProductType}]` : '';
      console.log(`   ${m.reference}${typeChange}`);
      console.log(`      ${m.name.substring(0, 50)}`);
    }
  }

  // Appliquer les déplacements
  if (!DRY_RUN && moves.length > 0) {
    console.log('\n═══ APPLICATION DES DÉPLACEMENTS ═══\n');

    let updated = 0;
    let errors = 0;
    let skipped = 0;

    for (const m of moves) {
      const targetCat = categoryMap.get(m.targetCategory);

      if (!targetCat) {
        console.log(`⚠️ Catégorie ${m.targetCategory} non trouvée, utilise plaque-autres-essences`);
        const fallback = categoryMap.get('plaque-autres-essences');
        if (!fallback) {
          console.log(`❌ Catégorie plaque-autres-essences non trouvée, skip`);
          skipped++;
          continue;
        }
      }

      const catId = targetCat?.id || categoryMap.get('plaque-autres-essences')?.id;
      if (!catId) {
        skipped++;
        continue;
      }

      try {
        const updateData: { categoryId: string; productType?: string } = { categoryId: catId };
        if (m.targetProductType) {
          updateData.productType = m.targetProductType;
        }

        await prisma.panel.updateMany({
          where: { reference: m.reference },
          data: updateData
        });
        console.log(`✅ ${m.reference} → ${m.targetCategory}`);
        updated++;
      } catch (error) {
        console.log(`❌ ${m.reference}: ${(error as Error).message}`);
        errors++;
      }
    }

    console.log(`\n✅ Déplacés: ${updated}`);
    console.log(`⏭️ Ignorés: ${skipped}`);
    console.log(`❌ Erreurs: ${errors}`);
  }

  // Résumé
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n   Total à déplacer: ${moves.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Aucune modification n\'a été faite');
    console.log('   Relancez sans --dry-run pour appliquer');
  }

  await prisma.$disconnect();
}

function detectEssence(name: string): string {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('chêne') || nameLower.includes('chene') || nameLower.includes('oak')) return 'chene';
  if (nameLower.includes('noyer') || nameLower.includes('walnut') || nameLower.includes('amérique')) return 'noyer';
  if (nameLower.includes('frêne') || nameLower.includes('frene') || nameLower.includes('ash')) return 'frene';
  if (nameLower.includes('hêtre') || nameLower.includes('hetre') || nameLower.includes('beech')) return 'hetre';
  if (nameLower.includes('érable') || nameLower.includes('erable') || nameLower.includes('maple')) return 'erable';
  if (nameLower.includes('merisier') || nameLower.includes('cherry')) return 'merisier';
  if (nameLower.includes('teck') || nameLower.includes('teak')) return 'teck';
  if (nameLower.includes('wengé') || nameLower.includes('wenge')) return 'wenge';
  if (nameLower.includes('pin')) return 'pin';

  return 'autres-essences';
}

main().catch(console.error);
