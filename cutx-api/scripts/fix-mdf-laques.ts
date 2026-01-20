/**
 * Déplace les MDF laqués/peints vers unis-blanc
 *
 * Usage:
 *   npx tsx scripts/fix-mdf-laques.ts --dry-run
 *   npx tsx scripts/fix-mdf-laques.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       DÉPLACEMENT DES MDF LAQUÉS/PEINTS                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Récupérer les catégories
  const mdfStandardCat = await prisma.category.findFirst({ where: { slug: 'mdf-standard' } });
  const unisBlancCat = await prisma.category.findFirst({ where: { slug: 'unis-blanc' } });

  if (!mdfStandardCat || !unisBlancCat) {
    console.error('❌ Catégories non trouvées!');
    return;
  }

  // Trouver les panneaux laqués/peints
  const panels = await prisma.panel.findMany({
    where: { categoryId: mdfStandardCat.id },
    select: { id: true, reference: true, name: true }
  });

  const toMove: { id: string; reference: string; name: string }[] = [];

  for (const p of panels) {
    const name = (p.name || '').toLowerCase();

    // MDF déjà laqué ou pré-peint
    if ((name.includes('laqué') || name.includes('laque') || name.includes('prépeint') || name.includes('prepeint')) &&
        (name.includes('blanc') || name.includes('white'))) {
      toMove.push(p);
    }
  }

  console.log(`📦 Panneaux MDF laqués/peints blancs trouvés: ${toMove.length}\n`);

  if (toMove.length === 0) {
    console.log('✅ Aucun panneau à déplacer!');
    await prisma.$disconnect();
    return;
  }

  console.log('═══ PANNEAUX À DÉPLACER ═══\n');
  for (const p of toMove) {
    console.log(`   ${p.reference}`);
    console.log(`      ${p.name?.substring(0, 55)}`);
    console.log(`      → unis-blanc (MELAMINE)`);
    console.log('');
  }

  if (!DRY_RUN) {
    console.log('═══ APPLICATION ═══\n');

    let updated = 0;
    for (const p of toMove) {
      try {
        await prisma.panel.update({
          where: { id: p.id },
          data: {
            categoryId: unisBlancCat.id,
            productType: 'MELAMINE'
          }
        });
        console.log(`✅ ${p.reference} → unis-blanc`);
        updated++;
      } catch (error) {
        console.log(`❌ ${p.reference}: ${(error as Error).message}`);
      }
    }

    console.log(`\n✅ Déplacés: ${updated}`);
  }

  console.log('\n═══ RÉSUMÉ ═══');
  console.log(`   Total: ${toMove.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Relancez sans --dry-run pour appliquer');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
