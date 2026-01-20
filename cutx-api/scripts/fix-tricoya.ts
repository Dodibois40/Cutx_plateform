/**
 * Déplace les panneaux Infinite Tricoya vers panneaux-speciaux
 * (MDF extérieur haute performance ≠ MDF standard)
 *
 * Usage:
 *   npx tsx scripts/fix-tricoya.ts --dry-run
 *   npx tsx scripts/fix-tricoya.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       DÉPLACEMENT DES INFINITE TRICOYA                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Trouver la catégorie cible
  const specialCat = await prisma.category.findFirst({
    where: { slug: 'panneaux-speciaux' }
  });

  if (!specialCat) {
    console.error('❌ Catégorie panneaux-speciaux non trouvée!');
    return;
  }

  console.log(`🎯 Catégorie cible: ${specialCat.slug} (${specialCat.name})\n`);

  // Trouver les catégories sources (mauvaises classifications)
  const mdfStandard = await prisma.category.findFirst({ where: { slug: 'mdf-standard' } });
  const alveolaires = await prisma.category.findFirst({ where: { slug: 'alveolaires' } });

  // Trouver tous les Tricoya mal classés
  const panels = await prisma.panel.findMany({
    where: {
      name: { contains: 'tricoya', mode: 'insensitive' },
      categoryId: {
        in: [mdfStandard?.id, alveolaires?.id].filter(Boolean) as string[]
      }
    },
    include: { category: { select: { slug: true, name: true } } }
  });

  console.log(`📦 Panneaux Infinite Tricoya mal classés: ${panels.length}\n`);

  if (panels.length === 0) {
    console.log('✅ Tous les Tricoya sont déjà bien classés!');
    await prisma.$disconnect();
    return;
  }

  console.log('═══ PANNEAUX À DÉPLACER ═══\n');
  for (const p of panels) {
    console.log(`   ${p.reference}`);
    console.log(`      ${(p.name || '').substring(0, 55)}`);
    console.log(`      ${p.category?.slug} → panneaux-speciaux`);
    console.log(`      Raison: MDF extérieur haute performance (garantie 50 ans)`);
    console.log('');
  }

  if (!DRY_RUN) {
    console.log('═══ APPLICATION ═══\n');

    let updated = 0;
    for (const p of panels) {
      try {
        await prisma.panel.update({
          where: { id: p.id },
          data: {
            categoryId: specialCat.id,
            productType: 'PANNEAU_SPECIAL'
          }
        });
        console.log(`✅ ${p.reference} → panneaux-speciaux`);
        updated++;
      } catch (error) {
        console.log(`❌ ${p.reference}: ${(error as Error).message}`);
      }
    }

    console.log(`\n✅ Déplacés: ${updated}`);
  }

  console.log('\n═══ RÉSUMÉ ═══');
  console.log(`   Total: ${panels.length}`);
  console.log(`   Note: Les Tricoya dans mdf-hydrofuge restent là (classification acceptable)`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Relancez sans --dry-run pour appliquer');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
