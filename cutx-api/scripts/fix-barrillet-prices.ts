/**
 * Script de correction des prix Barrillet
 *
 * Problème: Le scraper a stocké le prix HT du panneau dans pricePerM2
 *           au lieu du vrai prix au m².
 *
 * Solution: pricePerM2 = ancien_pricePerM2 / surface_m2
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBarrilletPrices() {
  console.log('='.repeat(60));
  console.log(' CORRECTION DES PRIX BARRILLET');
  console.log('='.repeat(60));

  // Récupérer le catalogue Barrillet
  const catalogue = await prisma.catalogue.findUnique({
    where: { slug: 'barrillet' }
  });

  if (!catalogue) {
    console.log('Catalogue Barrillet non trouvé!');
    return;
  }

  console.log(`Catalogue: ${catalogue.name} (${catalogue.id})`);

  // Récupérer tous les panneaux Barrillet avec un prix
  const panels = await prisma.panel.findMany({
    where: {
      catalogueId: catalogue.id,
      pricePerM2: { not: null }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      pricePerM2: true,
    }
  });

  console.log(`\nPanneaux avec prix à corriger: ${panels.length}`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Exemples avant/après
  console.log('\n--- Exemples de corrections ---');
  const examples = panels.slice(0, 5);
  for (const p of examples) {
    const surface = (p.defaultLength * p.defaultWidth) / 1_000_000;
    const oldPrice = p.pricePerM2!;
    const newPrice = surface > 0 ? Math.round((oldPrice / surface) * 100) / 100 : null;
    console.log(`${p.name.substring(0, 50)}...`);
    console.log(`  Dims: ${p.defaultLength}x${p.defaultWidth} = ${surface.toFixed(2)}m²`);
    console.log(`  Prix panneau (ancien pricePerM2): ${oldPrice}€`);
    console.log(`  Nouveau prix/m²: ${newPrice}€/m²`);
    console.log('');
  }

  console.log('\n--- Mise à jour en cours ---');

  // Mettre à jour chaque panneau
  for (const panel of panels) {
    const surface = (panel.defaultLength * panel.defaultWidth) / 1_000_000;

    if (surface <= 0) {
      skipped++;
      continue;
    }

    const oldPrice = panel.pricePerM2!; // C'est le prix du panneau
    const newPricePerM2 = Math.round((oldPrice / surface) * 100) / 100;

    try {
      await prisma.panel.update({
        where: { id: panel.id },
        data: { pricePerM2: newPricePerM2 }
      });
      updated++;

      if (updated % 200 === 0) {
        console.log(`  Progression: ${updated}/${panels.length}`);
      }
    } catch (err) {
      errors++;
      console.log(`  Erreur sur ${panel.reference}: ${(err as Error).message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(' RÉSULTAT');
  console.log('='.repeat(60));
  console.log(`  Panneaux mis à jour: ${updated}`);
  console.log(`  Panneaux ignorés (pas de dimensions): ${skipped}`);
  console.log(`  Erreurs: ${errors}`);

  // Vérification finale
  console.log('\n--- Vérification (5 premiers panneaux) ---');
  const verification = await prisma.panel.findMany({
    where: { catalogueId: catalogue.id, pricePerM2: { not: null } },
    select: {
      name: true,
      defaultLength: true,
      defaultWidth: true,
      pricePerM2: true,
    },
    take: 5
  });

  for (const p of verification) {
    const surface = (p.defaultLength * p.defaultWidth) / 1_000_000;
    const prixPanneau = p.pricePerM2! * surface;
    console.log(`${p.name.substring(0, 50)}...`);
    console.log(`  Prix/m²: ${p.pricePerM2}€ → Panneau: ${prixPanneau.toFixed(2)}€`);
  }

  await prisma.$disconnect();
}

fixBarrilletPrices().catch(console.error);
