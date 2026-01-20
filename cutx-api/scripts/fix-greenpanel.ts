/**
 * Déplace les GreenPanel et panneaux alvéolaires vers la bonne catégorie
 *
 * Usage:
 *   npx tsx scripts/fix-greenpanel.ts --dry-run
 *   npx tsx scripts/fix-greenpanel.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       DÉPLACEMENT DES GREENPANEL / ALVÉOLAIRES                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Vérifier les catégories alvéolaires disponibles
  const alveolaireCats = await prisma.category.findMany({
    where: {
      OR: [
        { slug: 'panneaux-alveolaires' },
        { slug: 'alveolaires' }
      ]
    },
    select: { id: true, slug: true, name: true }
  });

  console.log('📂 Catégories alvéolaires:');
  for (const c of alveolaireCats) {
    console.log(`   ${c.slug}: ${c.name} [${c.id}]`);
  }

  // Utiliser 'panneaux-alveolaires' ou 'alveolaires'
  const targetCat = alveolaireCats.find(c => c.slug === 'panneaux-alveolaires') ||
                    alveolaireCats.find(c => c.slug === 'alveolaires');

  if (!targetCat) {
    console.error('❌ Aucune catégorie alvéolaires trouvée!');
    return;
  }

  console.log(`\n🎯 Catégorie cible: ${targetCat.slug}\n`);

  // Trouver les panneaux GreenPanel et alvéolaires mal classés
  const panels = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'greenpanel', mode: 'insensitive' } },
        { name: { contains: 'green panel', mode: 'insensitive' } },
        { name: { contains: 'alvéolaire', mode: 'insensitive' } },
        { name: { contains: 'alveolaire', mode: 'insensitive' } }
      ],
      NOT: {
        categoryId: targetCat.id
      }
    },
    include: { category: { select: { slug: true, name: true } } }
  });

  // Filtrer pour ne garder que ceux qui sont des panneaux alvéolaires (pas stratifié, pas chant, etc.)
  const toMove = panels.filter(p => {
    const type = p.productType || '';
    // Exclure les bandes de chant, stratifiés, etc.
    if (type === 'BANDE_DE_CHANT' || type === 'STRATIFIE') return false;
    // Garder seulement MDF, PANNEAU_SPECIAL ou null
    return type === 'MDF' || type === 'PANNEAU_SPECIAL' || !type;
  });

  console.log(`📦 Panneaux à déplacer: ${toMove.length}\n`);

  if (toMove.length === 0) {
    console.log('✅ Tous les panneaux alvéolaires sont déjà bien classés!');
    await prisma.$disconnect();
    return;
  }

  console.log('═══ PANNEAUX À DÉPLACER ═══\n');
  for (const p of toMove) {
    console.log(`   ${p.reference}`);
    console.log(`      ${(p.name || '').substring(0, 55)}`);
    console.log(`      ${p.category?.slug || 'AUCUNE'} → ${targetCat.slug}`);
    console.log(`      ProductType: ${p.productType} → PANNEAU_SPECIAL`);
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
            categoryId: targetCat.id,
            productType: 'PANNEAU_SPECIAL'
          }
        });
        console.log(`✅ ${p.reference} → ${targetCat.slug}`);
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
