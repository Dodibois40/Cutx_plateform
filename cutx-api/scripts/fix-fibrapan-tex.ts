/**
 * Déplace les panneaux MDF texturés/sculptés vers muraux-decoratifs
 *
 * Usage:
 *   npx tsx scripts/fix-fibrapan-tex.ts --dry-run
 *   npx tsx scripts/fix-fibrapan-tex.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       DÉPLACEMENT DES MDF TEXTURÉS/SCULPTÉS                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Trouver la catégorie cible
  const murauxDeco = await prisma.category.findFirst({
    where: { slug: 'muraux-decoratifs' }
  });

  if (!murauxDeco) {
    console.error('❌ Catégorie muraux-decoratifs non trouvée!');
    return;
  }

  console.log(`🎯 Catégorie cible: ${murauxDeco.slug} (${murauxDeco.name})\n`);

  // Trouver les MDF texturés/sculptés dans mdf-standard
  const mdfStandard = await prisma.category.findFirst({ where: { slug: 'mdf-standard' } });

  const panels = await prisma.panel.findMany({
    where: {
      categoryId: mdfStandard?.id,
      OR: [
        { name: { contains: 'tex', mode: 'insensitive' } },
        { name: { contains: 'flute', mode: 'insensitive' } },
        { name: { contains: 'sculpté', mode: 'insensitive' } },
        { name: { contains: 'cannelé', mode: 'insensitive' } },
        { name: { contains: 'rainuré', mode: 'insensitive' } },
        { name: { contains: 'texturé', mode: 'insensitive' } },
        { name: { contains: 'ondulé', mode: 'insensitive' } },
        { name: { contains: 'wave', mode: 'insensitive' } },
        { name: { contains: 'relief', mode: 'insensitive' } },
      ]
    },
    include: { category: { select: { slug: true } } }
  });

  console.log(`📦 Panneaux MDF texturés trouvés dans mdf-standard: ${panels.length}\n`);

  if (panels.length === 0) {
    console.log('✅ Aucun panneau MDF texturé à déplacer!');
    await prisma.$disconnect();
    return;
  }

  console.log('═══ PANNEAUX À DÉPLACER ═══\n');
  for (const p of panels) {
    console.log(`   ${p.reference}`);
    console.log(`      ${(p.name || '').substring(0, 55)}`);
    console.log(`      mdf-standard → muraux-decoratifs`);
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
            categoryId: murauxDeco.id,
            productType: 'PANNEAU_SPECIAL'
          }
        });
        console.log(`✅ ${p.reference} → muraux-decoratifs`);
        updated++;
      } catch (error) {
        console.log(`❌ ${p.reference}: ${(error as Error).message}`);
      }
    }

    console.log(`\n✅ Déplacés: ${updated}`);
  }

  console.log('\n═══ RÉSUMÉ ═══');
  console.log(`   Total: ${panels.length}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Relancez sans --dry-run pour appliquer');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
