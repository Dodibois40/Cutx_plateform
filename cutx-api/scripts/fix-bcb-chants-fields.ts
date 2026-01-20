/**
 * Correction des champs BCB Libre-service chants
 *
 * Problèmes à corriger:
 * 1. productType: NULL → 'BANDE_DE_CHANT'
 * 2. defaultWidth: 0 → valeur correcte en mm (extraire du nom ou référence)
 * 3. decorName: NULL → extraire l'essence du bois du nom
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

// Décors connus à extraire du nom
const DECORS_BOIS = [
  'chêne', 'hêtre', 'frêne', 'érable', 'merisier', 'noyer', 'pin', 'sapin',
  'acajou', 'teck', 'wengé', 'orme', 'châtaignier', 'bouleau', 'aulne',
  'cerisier', 'olivier', 'tilleul', 'peuplier', 'mélèze', 'aniégré'
];

const DECORS_AUTRES = [
  'blanc', 'noir', 'gris', 'beige', 'aluminium'
];

function extractDecor(name: string): string | null {
  const lowerName = name.toLowerCase();

  // Chercher les décors bois
  for (const decor of DECORS_BOIS) {
    if (lowerName.includes(decor)) {
      return decor.charAt(0).toUpperCase() + decor.slice(1);
    }
  }

  // Chercher les décors autres
  for (const decor of DECORS_AUTRES) {
    if (lowerName.includes(decor)) {
      return decor.charAt(0).toUpperCase() + decor.slice(1);
    }
  }

  // Cas spéciaux
  if (lowerName.includes('givré')) return 'Blanc Givré';
  if (lowerName.includes('querkus')) return 'Chêne Querkus';
  if (lowerName.includes('shinnoki')) return 'Chêne Shinnoki';

  return null;
}

function extractWidthFromReference(reference: string): number | null {
  // Format: BCB-BOI-CHANTBOIS-W0.024-T0.6-70925
  const match = reference.match(/W([\d.]+)/);
  if (match) {
    const value = parseFloat(match[1]);
    // Si < 1, c'est en mètres, convertir en mm
    return value < 1 ? Math.round(value * 1000) : Math.round(value);
  }
  return null;
}

function extractWidthFromName(name: string): number | null {
  // Chercher des patterns comme "24 x 0.6" ou "23x0.8"
  const match = name.match(/(\d+)\s*x\s*[\d.]+/i);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}

async function fix() {
  console.log('═'.repeat(60));
  console.log(DRY_RUN ? '🔍 DRY-RUN' : '🚀 MODE RÉEL');
  console.log('═'.repeat(60));
  console.log('');

  const whereClause = {
    catalogueId: 'cmjqpjtly0000by4cnkga0kaq',
    OR: [
      { reference: { startsWith: 'BCB-BOI-' } },
      { reference: { startsWith: 'BCB-MEL-' } },
      { reference: { startsWith: 'BCB-ABS-' } },
      { reference: { startsWith: 'BCB-CHANT-' } },
      { reference: { startsWith: 'BCB-QUERKUS-' } }
    ]
  };

  const chants = await prisma.panel.findMany({
    where: whereClause,
    select: {
      id: true,
      reference: true,
      name: true,
      productType: true,
      defaultWidth: true,
      decorName: true
    }
  });

  console.log('Total chants à corriger: ' + chants.length);
  console.log('');

  let fixedProductType = 0;
  let fixedWidth = 0;
  let fixedDecor = 0;

  for (const chant of chants) {
    const updates: Record<string, unknown> = {};

    // 1. Corriger productType
    if (!chant.productType || chant.productType !== 'BANDE_DE_CHANT') {
      updates.productType = 'BANDE_DE_CHANT';
      fixedProductType++;
    }

    // 2. Corriger defaultWidth
    if (!chant.defaultWidth || chant.defaultWidth < 10) {
      let width = extractWidthFromReference(chant.reference);
      if (!width) {
        width = extractWidthFromName(chant.name);
      }
      if (width && width >= 10 && width <= 100) {
        updates.defaultWidth = width;
        fixedWidth++;
      }
    }

    // 3. Extraire decorName
    if (!chant.decorName) {
      const decor = extractDecor(chant.name);
      if (decor) {
        updates.decorName = decor;
        fixedDecor++;
      }
    }

    if (Object.keys(updates).length > 0) {
      console.log('📦 ' + chant.reference.substring(0, 40));
      Object.entries(updates).forEach(([key, value]) => {
        console.log('   ' + key + ': ' + value);
      });

      if (!DRY_RUN) {
        await prisma.panel.update({
          where: { id: chant.id },
          data: updates
        });
      }
    }
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('   productType corrigés: ' + fixedProductType);
  console.log('   defaultWidth corrigés: ' + fixedWidth);
  console.log('   decorName ajoutés: ' + fixedDecor);

  await prisma.$disconnect();
}

fix();
