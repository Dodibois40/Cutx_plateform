/**
 * Script de correction des prix aberrants Barrillet
 *
 * Probleme identifie:
 * - 446 panneaux ont un pricePerM2 > 1000 EUR (jusqu'a 6 millions!)
 * - 289 sont des chants (BANDE_DE_CHANT) vendus en rouleaux
 * - Le prix du rouleau complet a ete stocke en pricePerM2 au lieu de pricePerMl
 *
 * Logique de correction:
 * 1. Pour les CHANTS:
 *    - Extraire la longueur du rouleau depuis le nom (ex: "75ml", "60ml", "100ml")
 *    - Calculer pricePerMl = prixHT / longueurRouleau
 *    - Mettre pricePerM2 a null (pas pertinent pour les chants)
 *
 * 2. Pour les autres types (CONTREPLAQUE, SOLID_SURFACE, etc.):
 *    - Verifier si c'est un vrai panneau avec surface
 *    - Recalculer pricePerM2 = prixHT / surface_m2
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CorrectionStats {
  chants: {
    total: number;
    corrected: number;
    noRollLength: number;
    noPrixHT: number;
  };
  panels: {
    total: number;
    corrected: number;
    noSurface: number;
    noPrixHT: number;
  };
  errors: number;
}

/**
 * Extrait la longueur du rouleau depuis le nom du produit
 * Ex: "75ml" -> 75, "60ml" -> 60, "100ml" -> 100
 */
function extractRollLength(name: string): number | null {
  // Pattern: nombre suivi de "ml" (metres lineaires)
  const match = name.match(/(\d+)\s*ml\b/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extrait le prixHT depuis les metadata JSON
 */
function extractPrixHT(metadata: string | null): number | null {
  if (!metadata) return null;
  try {
    const data = JSON.parse(metadata);
    return data.prixHT || null;
  } catch {
    return null;
  }
}

async function fixAberrantPrices() {
  console.log('='.repeat(70));
  console.log(' CORRECTION DES PRIX ABERRANTS BARRILLET');
  console.log('='.repeat(70));
  console.log('');

  const stats: CorrectionStats = {
    chants: { total: 0, corrected: 0, noRollLength: 0, noPrixHT: 0 },
    panels: { total: 0, corrected: 0, noSurface: 0, noPrixHT: 0 },
    errors: 0,
  };

  // Recuperer tous les panneaux avec pricePerM2 > 1000
  const aberrantPanels = await prisma.panel.findMany({
    where: { pricePerM2: { gt: 1000 } },
    select: {
      id: true,
      reference: true,
      name: true,
      productType: true,
      pricePerM2: true,
      pricePerMl: true,
      defaultLength: true,
      defaultWidth: true,
      metadata: true,
      catalogue: { select: { slug: true, name: true } },
    },
  });

  console.log(`Total panneaux avec pricePerM2 > 1000: ${aberrantPanels.length}`);
  console.log('');

  // Separer chants et autres panneaux
  const chants = aberrantPanels.filter(
    (p) =>
      p.productType === 'BANDE_DE_CHANT' ||
      p.name.toLowerCase().includes('bande de chant') ||
      p.name.toLowerCase().includes('chant abs') ||
      p.name.toLowerCase().includes('chant pvc'),
  );

  const otherPanels = aberrantPanels.filter(
    (p) =>
      p.productType !== 'BANDE_DE_CHANT' &&
      !p.name.toLowerCase().includes('bande de chant') &&
      !p.name.toLowerCase().includes('chant abs') &&
      !p.name.toLowerCase().includes('chant pvc'),
  );

  console.log(`  - Chants: ${chants.length}`);
  console.log(`  - Autres panneaux: ${otherPanels.length}`);
  console.log('');

  // ================================================================
  // 1. CORRECTION DES CHANTS
  // ================================================================
  console.log('='.repeat(70));
  console.log(' 1. CORRECTION DES CHANTS');
  console.log('='.repeat(70));
  console.log('');

  stats.chants.total = chants.length;

  // Exemples avant correction
  console.log('--- Exemples de chants a corriger ---');
  for (const chant of chants.slice(0, 5)) {
    const rollLength = extractRollLength(chant.name);
    const prixHT = extractPrixHT(chant.metadata);
    const pricePerMl = rollLength && prixHT ? Math.round((prixHT / rollLength) * 100) / 100 : null;

    console.log(`Ref: ${chant.reference}`);
    console.log(`  Nom: ${chant.name.substring(0, 70)}...`);
    console.log(`  pricePerM2 actuel: ${chant.pricePerM2?.toLocaleString()} EUR (ABERRANT)`);
    console.log(`  prixHT metadata: ${prixHT} EUR (prix du rouleau)`);
    console.log(`  Longueur rouleau: ${rollLength}ml`);
    console.log(`  -> Nouveau pricePerMl: ${pricePerMl} EUR/ml`);
    console.log('');
  }

  // Correction des chants
  console.log('--- Mise a jour des chants ---');
  for (const chant of chants) {
    const rollLength = extractRollLength(chant.name);
    const prixHT = extractPrixHT(chant.metadata);

    if (!rollLength) {
      stats.chants.noRollLength++;
      continue;
    }

    if (!prixHT) {
      stats.chants.noPrixHT++;
      continue;
    }

    const newPricePerMl = Math.round((prixHT / rollLength) * 100) / 100;

    try {
      await prisma.panel.update({
        where: { id: chant.id },
        data: {
          pricePerMl: newPricePerMl,
          pricePerM2: null, // Pas pertinent pour les chants
        },
      });
      stats.chants.corrected++;
    } catch (err) {
      stats.errors++;
      console.log(`  Erreur sur ${chant.reference}: ${(err as Error).message}`);
    }
  }

  console.log(`  Chants corriges: ${stats.chants.corrected}/${stats.chants.total}`);
  console.log(`  Sans longueur de rouleau: ${stats.chants.noRollLength}`);
  console.log(`  Sans prixHT: ${stats.chants.noPrixHT}`);
  console.log('');

  // ================================================================
  // 2. CORRECTION DES AUTRES PANNEAUX
  // ================================================================
  console.log('='.repeat(70));
  console.log(' 2. CORRECTION DES AUTRES PANNEAUX');
  console.log('='.repeat(70));
  console.log('');

  stats.panels.total = otherPanels.length;

  // Analyser les autres panneaux
  console.log('--- Types de panneaux ---');
  const byType: Record<string, number> = {};
  otherPanels.forEach((p) => {
    const type = p.productType || 'null';
    byType[type] = (byType[type] || 0) + 1;
  });
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  console.log('');

  // Exemples
  console.log('--- Exemples de panneaux a corriger ---');
  for (const panel of otherPanels.slice(0, 5)) {
    const prixHT = extractPrixHT(panel.metadata);
    const surface = (panel.defaultLength * panel.defaultWidth) / 1_000_000;
    const newPricePerM2 = prixHT && surface > 0 ? Math.round((prixHT / surface) * 100) / 100 : null;

    console.log(`Ref: ${panel.reference}`);
    console.log(`  Nom: ${panel.name.substring(0, 60)}...`);
    console.log(`  Type: ${panel.productType}`);
    console.log(`  pricePerM2 actuel: ${panel.pricePerM2?.toLocaleString()} EUR (ABERRANT)`);
    console.log(`  prixHT metadata: ${prixHT} EUR`);
    console.log(`  Dims: ${panel.defaultLength}x${panel.defaultWidth}mm = ${surface.toFixed(4)}m2`);
    console.log(`  -> Nouveau pricePerM2: ${newPricePerM2} EUR/m2`);
    console.log('');
  }

  // Correction des panneaux
  console.log('--- Mise a jour des panneaux ---');
  for (const panel of otherPanels) {
    const prixHT = extractPrixHT(panel.metadata);
    const surface = (panel.defaultLength * panel.defaultWidth) / 1_000_000;

    if (surface <= 0) {
      stats.panels.noSurface++;
      continue;
    }

    if (!prixHT) {
      stats.panels.noPrixHT++;
      continue;
    }

    const newPricePerM2 = Math.round((prixHT / surface) * 100) / 100;

    // Verifier que le nouveau prix est raisonnable (< 500 EUR/m2 pour la plupart)
    // Les solid surface et compacts peuvent aller jusqu'a 200-400 EUR/m2
    if (newPricePerM2 > 1000) {
      console.log(`  Prix toujours aberrant pour ${panel.reference}: ${newPricePerM2} EUR/m2 - SKIPPED`);
      continue;
    }

    try {
      await prisma.panel.update({
        where: { id: panel.id },
        data: { pricePerM2: newPricePerM2 },
      });
      stats.panels.corrected++;
    } catch (err) {
      stats.errors++;
      console.log(`  Erreur sur ${panel.reference}: ${(err as Error).message}`);
    }
  }

  console.log(`  Panneaux corriges: ${stats.panels.corrected}/${stats.panels.total}`);
  console.log(`  Sans surface valide: ${stats.panels.noSurface}`);
  console.log(`  Sans prixHT: ${stats.panels.noPrixHT}`);
  console.log('');

  // ================================================================
  // 3. RESUME FINAL
  // ================================================================
  console.log('='.repeat(70));
  console.log(' RESUME FINAL');
  console.log('='.repeat(70));
  console.log('');
  console.log(`CHANTS:`);
  console.log(`  - Total: ${stats.chants.total}`);
  console.log(`  - Corriges: ${stats.chants.corrected}`);
  console.log(`  - Non corriges (pas de longueur rouleau): ${stats.chants.noRollLength}`);
  console.log(`  - Non corriges (pas de prixHT): ${stats.chants.noPrixHT}`);
  console.log('');
  console.log(`AUTRES PANNEAUX:`);
  console.log(`  - Total: ${stats.panels.total}`);
  console.log(`  - Corriges: ${stats.panels.corrected}`);
  console.log(`  - Non corriges (pas de surface): ${stats.panels.noSurface}`);
  console.log(`  - Non corriges (pas de prixHT): ${stats.panels.noPrixHT}`);
  console.log('');
  console.log(`ERREURS: ${stats.errors}`);
  console.log('');

  // Verification post-correction
  console.log('='.repeat(70));
  console.log(' VERIFICATION POST-CORRECTION');
  console.log('='.repeat(70));
  console.log('');

  const remainingAberrant = await prisma.panel.count({
    where: { pricePerM2: { gt: 1000 } },
  });
  console.log(`Panneaux avec pricePerM2 > 1000 restants: ${remainingAberrant}`);

  // Verifier quelques chants corriges
  console.log('');
  console.log('--- Exemples de chants apres correction ---');
  const correctedChants = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      pricePerMl: { not: null },
      pricePerM2: null,
    },
    select: {
      reference: true,
      name: true,
      pricePerMl: true,
      pricePerM2: true,
    },
    take: 5,
  });

  for (const chant of correctedChants) {
    console.log(`${chant.name.substring(0, 60)}...`);
    console.log(`  pricePerMl: ${chant.pricePerMl} EUR/ml`);
    console.log(`  pricePerM2: ${chant.pricePerM2} (null = correct)`);
  }

  await prisma.$disconnect();
}

fixAberrantPrices().catch((err) => {
  console.error('Erreur:', err);
  prisma.$disconnect();
});
