/**
 * Script to fix panels in "Références à vérifier" category
 * Run with: npx ts-node scripts/fix-panels-to-verify.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Fetching panels to verify...\n');

  // Get category IDs
  const categories = await prisma.category.findMany({
    where: {
      slug: {
        in: ['ref-a-verifier', 'decors-unis', 'decors-fantaisie', 'strat-fantaisie', 'abs-unis']
      }
    },
    select: { id: true, slug: true, name: true }
  });

  const catMap = Object.fromEntries(categories.map(c => [c.slug, c.id]));
  console.log('Categories:', catMap);

  // Get all panels in "ref-a-verifier"
  const panels = await prisma.panel.findMany({
    where: { categoryId: catMap['ref-a-verifier'] },
    select: {
      id: true,
      name: true,
      reference: true,
      manufacturerRef: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      material: true,
      productType: true,
    }
  });

  console.log(`\nFound ${panels.length} panels to process\n`);

  const updates: { id: string; name: string; categoryId: string; productType: string; material: string }[] = [];

  for (const panel of panels) {
    const len = panel.defaultLength || 0;
    const wid = panel.defaultWidth || 0;
    const thick = panel.defaultThickness || 0;
    const mfRef = panel.manufacturerRef || '';

    // Determine panel type based on dimensions
    if (wid === 23 && thick <= 1) {
      // Real edge band (chant) - 23mm wide, 0.8-1mm thick
      updates.push({
        id: panel.id,
        name: `Chant ABS ${mfRef}`.trim(),
        categoryId: catMap['abs-unis'],
        productType: 'CHANT',
        material: 'ABS',
      });
      console.log(`✓ CHANT: ${panel.reference} → Chant ABS ${mfRef}`);
    } else if (thick >= 16 && thick <= 25 && len >= 2000) {
      // Full melamine panel (19mm, large dimensions)
      const decor = mfRef || 'Décor';
      updates.push({
        id: panel.id,
        name: `Mélaminé ${decor} ${thick}mm`,
        categoryId: catMap['decors-fantaisie'], // Décors Fantaisie for now
        productType: 'MELAMINE',
        material: 'Mélaminé',
      });
      console.log(`✓ MELAMINE: ${panel.reference} → Mélaminé ${decor} ${thick}mm`);
    } else if (thick < 2 && len >= 2000) {
      // Thin laminate sheet (stratifié)
      const decor = mfRef || 'Décor';
      updates.push({
        id: panel.id,
        name: `Stratifié ${decor}`,
        categoryId: catMap['strat-fantaisie'],
        productType: 'STRATIFIE',
        material: 'Stratifié HPL',
      });
      console.log(`✓ STRATIFIE: ${panel.reference} → Stratifié ${decor}`);
    } else if (panel.name === 'Panneau Mélaminé') {
      // Generic "Panneau Mélaminé" - rename based on manufacturerRef
      const decor = mfRef || 'Décor';
      updates.push({
        id: panel.id,
        name: `Mélaminé ${decor} ${thick}mm`,
        categoryId: catMap['decors-fantaisie'],
        productType: 'MELAMINE',
        material: 'Mélaminé',
      });
      console.log(`✓ MELAMINE: ${panel.reference} → Mélaminé ${decor} ${thick}mm`);
    } else {
      console.log(`? SKIP: ${panel.reference} - ${panel.name} (${len}x${wid} ép.${thick}mm)`);
    }
  }

  console.log(`\n📝 Applying ${updates.length} updates...\n`);

  // Apply updates
  for (const update of updates) {
    await prisma.panel.update({
      where: { id: update.id },
      data: {
        name: update.name,
        categoryId: update.categoryId,
        productType: update.productType,
        material: update.material,
      }
    });
  }

  console.log('✅ Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
