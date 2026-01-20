/**
 * Génère des noms descriptifs pour les panneaux MDF avec nom générique
 * basés sur leurs dimensions et caractéristiques
 *
 * Usage:
 *   npx tsx scripts/fix-mdf-names-from-dimensions.ts --dry-run
 *   npx tsx scripts/fix-mdf-names-from-dimensions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       CORRECTION DES NOMS MDF GÉNÉRIQUES                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  if (DRY_RUN) {
    console.log('🔍 MODE DRY-RUN: Aucune modification ne sera faite\n');
  }

  // Récupérer les panneaux avec nom générique
  const panels = await prisma.panel.findMany({
    where: {
      productType: 'MDF',
      name: { contains: 'Panneau Standard' }
    },
    include: {
      category: { select: { slug: true, name: true } }
    },
    orderBy: { reference: 'asc' }
  });

  console.log(`Panneaux à corriger: ${panels.length}\n`);

  let updated = 0;
  let errors = 0;

  for (const panel of panels) {
    const thickness = panel.thickness?.[0] || panel.defaultThickness || 0;
    const length = panel.defaultLength || 0;
    const width = panel.defaultWidth || 0;

    // Déterminer le type de MDF basé sur la catégorie ou les caractéristiques
    let mdfType = 'MDF Standard';

    if (panel.isHydrofuge || panel.category?.slug === 'mdf-hydrofuge') {
      mdfType = 'MDF Hydrofuge';
    } else if (panel.isIgnifuge || panel.category?.slug === 'mdf-ignifuge') {
      mdfType = 'MDF Ignifugé';
    } else if (panel.category?.slug === 'mdf-leger') {
      mdfType = 'MDF Léger';
    } else if (panel.category?.slug === 'mdf-cintrable') {
      mdfType = 'MDF Cintrable';
    } else if (panel.category?.slug === 'mdf-teinte-couleurs') {
      mdfType = 'MDF Teinté';
    } else if (panel.category?.slug === 'mdf-a-laquer') {
      mdfType = 'MDF à Laquer';
    }

    // Prix très élevé = probablement spécial
    if (panel.pricePerM2 && panel.pricePerM2 > 80) {
      if (panel.category?.slug === 'mdf-standard') {
        mdfType = 'MDF Premium'; // Prix > 80€/m² c'est probablement un MDF spécial
      }
    }

    // Générer le nouveau nom
    let newName = `${mdfType}`;
    if (thickness) newName += ` ${thickness}mm`;
    if (length && width) newName += ` ${length}x${width}`;

    // Ajouter une mention si dimensions non standard
    if (length > 3000 || width > 2100) {
      newName += ' Grand Format';
    }

    console.log(`${panel.reference}: "${panel.name}" → "${newName}"`);
    console.log(`  Dims: ${thickness}mm ${length}x${width} | Prix: ${panel.pricePerM2}€/m² | Cat: ${panel.category?.slug}`);

    if (!DRY_RUN) {
      try {
        await prisma.panel.update({
          where: { id: panel.id },
          data: { name: newName }
        });
        updated++;
      } catch (error) {
        console.log(`  ❌ Erreur: ${(error as Error).message}`);
        errors++;
      }
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        RÉSUMÉ                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n  Total analysés: ${panels.length}`);
  console.log(`  Mis à jour: ${updated}`);
  console.log(`  Erreurs: ${errors}`);

  if (DRY_RUN) {
    console.log('\n⚠️ MODE DRY-RUN: Aucune modification n\'a été faite');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
