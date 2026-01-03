/**
 * Calculate pricePerMl for edge bands that have pricePerUnit but no pricePerMl
 * pricePerMl = pricePerUnit / longueurRouleau (in meters)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('💰 Calculating pricePerMl for edge bands...\n');

  // Find edge bands with pricePerUnit but no pricePerMl
  const chants = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      pricePerUnit: { not: null },
      pricePerMl: null,
    },
    select: {
      id: true,
      reference: true,
      name: true,
      pricePerUnit: true,
      defaultLength: true,
      metadata: true,
    },
  });

  console.log(`Found ${chants.length} edge bands to fix\n`);

  let fixed = 0;
  let noLength = 0;
  let errors = 0;

  for (const chant of chants) {
    // Get roll length from metadata, defaultLength, or parse from name
    let longueurRouleauM: number | null = null;

    // Try metadata first
    if (chant.metadata) {
      try {
        const meta = JSON.parse(chant.metadata);
        if (meta.longueurRouleau && meta.longueurRouleau > 0) {
          longueurRouleauM = meta.longueurRouleau;
        }
      } catch {}
    }

    // Fallback to defaultLength (stored in mm, convert to m)
    if (!longueurRouleauM && chant.defaultLength > 0) {
      longueurRouleauM = chant.defaultLength / 1000;
    }

    // Try to parse from product name: "rlx de 75m", "rouleau 150m", etc.
    if (!longueurRouleauM) {
      const patterns = [
        /(?:rlx|rouleau|roul\.?)\s*(?:de\s*)?(\d+)\s*m\b/i, // "rlx de 75m" or "rouleau 150m"
        /\s(\d+)\s*m\s+(?:Egger|Rehau|Ostermann)/i, // "75m Egger"
        /(\d{2,3})m\b/i, // "75m" - 2-3 digit number followed by 'm'
      ];
      for (const pattern of patterns) {
        const match = chant.name.match(pattern);
        if (match) {
          const len = parseInt(match[1]);
          // Valid roll lengths are typically 25, 50, 75, 100, 150, 200m
          if (len >= 10 && len <= 500) {
            longueurRouleauM = len;
            break;
          }
        }
      }
    }

    // Skip if no length available
    if (!longueurRouleauM || longueurRouleauM <= 0) {
      console.log(`⚠️ No length for ${chant.reference} - pricePerUnit: ${chant.pricePerUnit} - "${chant.name.substring(0, 50)}..."`);
      noLength++;
      continue;
    }

    // Calculate pricePerMl
    const pricePerMl = chant.pricePerUnit! / longueurRouleauM;

    // Update the record
    try {
      await prisma.panel.update({
        where: { id: chant.id },
        data: { pricePerMl },
      });
      console.log(`✓ ${chant.reference}: ${chant.pricePerUnit}€ / ${longueurRouleauM}m = ${pricePerMl.toFixed(4)}€/ml`);
      fixed++;
    } catch (error) {
      console.log(`✗ Error updating ${chant.reference}: ${error}`);
      errors++;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   No length available: ${noLength}`);
  console.log(`   Errors: ${errors}`);

  // Verify U963 specifically
  console.log('\n📋 Verifying U963 edge bands:');
  const u963Chants = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      name: { contains: 'U963' },
    },
    select: {
      reference: true,
      pricePerMl: true,
      pricePerUnit: true,
      defaultLength: true,
    },
  });

  u963Chants.forEach((c) => {
    console.log(`  ${c.reference}: ${c.pricePerMl?.toFixed(4) ?? 'null'}€/ml (unit: ${c.pricePerUnit}€, length: ${c.defaultLength / 1000}m)`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
