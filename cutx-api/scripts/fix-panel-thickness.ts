/**
 * Fix panel thickness values by parsing from product name
 * The name contains the correct thickness (e.g., "ép. 8mm")
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing panel thickness values...\n');

  // Find all Dispano panels (excluding edge bands which were already fixed)
  const panels = await prisma.panel.findMany({
    where: {
      catalogue: { slug: 'dispano' },
      NOT: { productType: 'BANDE_DE_CHANT' },
    },
    select: {
      id: true,
      reference: true,
      name: true,
      thickness: true,
      productType: true,
    },
  });

  console.log(`Found ${panels.length} Dispano panels to check\n`);

  let fixed = 0;
  let correct = 0;
  let errors = 0;

  for (const panel of panels) {
    // Parse thickness from name - various patterns for panels
    const patterns = [
      /[éeÉE]p(?:aisseur)?\.?\s*:?\s*([\d]+(?:[,.]?\d+)?)\s*mm/i, // "ép. 8mm" or "épaisseur: 16mm"
      /-\s*([\d]+(?:[,.]?\d+)?)\s*mm\s*-/i, // "- 8mm -" (in title)
      /([\d]+(?:[,.]?\d+)?)\s*mm\s*$/i, // "... 19mm" at end
    ];

    let parsedThickness: number | null = null;
    for (const pattern of patterns) {
      const match = panel.name.match(pattern);
      if (match) {
        parsedThickness = parseFloat(match[1].replace(',', '.'));
        // Validate: common panel thicknesses are 3, 6, 8, 10, 12, 16, 18, 19, 22, 25, 30, 38, 50
        if (parsedThickness >= 3 && parsedThickness <= 100) {
          break;
        }
        parsedThickness = null; // Invalid, try next pattern
      }
    }

    if (parsedThickness === null) {
      // This is normal for some panels that don't have thickness in name
      continue;
    }

    // Check if current thickness is different
    const currentThickness = panel.thickness[0] || 0;
    const needsFix = Math.abs(currentThickness - parsedThickness) > 0.01;

    if (needsFix) {
      console.log(`📝 [${panel.productType || 'N/A'}] ${panel.reference}`);
      console.log(`   Fixing: ${currentThickness}mm → ${parsedThickness}mm`);
      console.log(`   "${panel.name.substring(0, 70)}..."`);

      await prisma.panel.update({
        where: { id: panel.id },
        data: {
          thickness: [parsedThickness],
          defaultThickness: parsedThickness,
        },
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

  // Verify U963 panels
  console.log('\n📋 Verifying U963 panels:');
  const u963Panels = await prisma.panel.findMany({
    where: {
      name: { contains: 'U963' },
      NOT: { productType: 'BANDE_DE_CHANT' },
    },
    select: { reference: true, name: true, thickness: true, productType: true },
  });
  u963Panels.forEach(p => {
    console.log(`  [${p.productType || 'N/A'}] ${p.reference}: ${JSON.stringify(p.thickness)}mm - ${p.name.substring(0, 60)}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
