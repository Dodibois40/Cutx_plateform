/**
 * Fix edge band thickness values by parsing from product name
 * The name contains the correct thickness (e.g., "ép. 0,8mm")
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing edge band (chant) thickness values...\n');

  // Find all edge bands
  const chants = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
    },
    select: {
      id: true,
      name: true,
      thickness: true,
      catalogue: { select: { name: true } },
    },
  });

  console.log(`Found ${chants.length} edge bands to check\n`);

  let fixed = 0;
  let correct = 0;
  let errors = 0;

  for (const chant of chants) {
    // Parse thickness from name - various patterns
    const patterns = [
      /[éeÉE]p(?:aisseur)?\.?\s*:?\s*([\d]+[,.]?\d*)\s*mm/i, // "ép. 0,8mm" or "épaisseur: 2mm"
      /-([\d]+[,.]?\d*)\s*mm\s/i, // "- 0,8mm "
      /\s([\d]+[,.]?\d*)\s*mm\s+(?:rlx|rouleau)/i, // "0,8mm rlx"
      /\s([\d]+[,.]?\d*)mm\s+(?:BANDE_DE_CHANT|STRATIFIE|MELAMINE)/i, // "0.8mm BANDE_DE_CHANT" (Bouney format)
      /\s(\d+[,.]?\d*)\s*mm$/i, // "... 0.8mm" at end of name
    ];

    let parsedThickness: number | null = null;
    for (const pattern of patterns) {
      const match = chant.name.match(pattern);
      if (match) {
        parsedThickness = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }

    if (parsedThickness === null) {
      console.log(`⚠️  Could not parse thickness from: "${chant.name.substring(0, 80)}..."`);
      errors++;
      continue;
    }

    // Check if current thickness is different (rounded up, wrong, etc.)
    const currentThickness = chant.thickness[0] || 0;
    const needsFix = Math.abs(currentThickness - parsedThickness) > 0.01;

    if (needsFix) {
      console.log(`📝 [${chant.catalogue.name}] Fixing: ${currentThickness}mm → ${parsedThickness}mm`);
      console.log(`   "${chant.name.substring(0, 70)}..."`);

      await prisma.panel.update({
        where: { id: chant.id },
        data: { thickness: [parsedThickness] },
      });
      fixed++;
    } else {
      correct++;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Already correct: ${correct}`);
  console.log(`   Could not parse: ${errors}`);

  // Show sample of fixed items
  if (fixed > 0) {
    console.log('\n📋 Sample of fixed items:');
    const samples = await prisma.panel.findMany({
      where: {
        productType: 'BANDE_DE_CHANT',
        name: { contains: 'U963' },
      },
      select: { name: true, thickness: true, catalogue: { select: { name: true } } },
    });
    samples.forEach(s => {
      console.log(`   [${s.catalogue.name}] ${s.thickness}mm - ${s.name.substring(0, 50)}...`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
