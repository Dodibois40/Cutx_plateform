/**
 * Find panels incorrectly marked as BANDE_DE_CHANT
 * (thickness >= 6mm means it's a panel, not an edge band)
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== FAUX CHANTS (épaisseur >= 6mm) ===\n');

  // Get all BANDE_DE_CHANT with thick measurements
  const falseChants = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      reference: true,
      thickness: true,
      category: {
        select: {
          slug: true,
          parent: { select: { slug: true } },
        },
      },
      catalogue: { select: { name: true } },
    },
  });

  // Filter to those with thickness >= 6mm
  const reallyFalse = falseChants.filter((p) => {
    if (!p.thickness || !Array.isArray(p.thickness)) return false;
    return p.thickness.some((t) => t >= 6);
  });

  console.log(`Total BANDE_DE_CHANT: ${falseChants.length}`);
  console.log(`Avec épaisseur >= 6mm: ${reallyFalse.length}\n`);

  // Group by category
  const byCategory = new Map<string, typeof reallyFalse>();
  for (const p of reallyFalse) {
    const catPath = p.category?.parent?.slug
      ? `${p.category.parent.slug}/${p.category.slug}`
      : p.category?.slug || 'null';

    if (!byCategory.has(catPath)) {
      byCategory.set(catPath, []);
    }
    byCategory.get(catPath)!.push(p);
  }

  // Display grouped
  console.log('Par catégorie actuelle:\n');
  for (const [cat, panels] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${cat}: ${panels.length} faux chants`);

    // Show first 3 examples
    for (const p of panels.slice(0, 3)) {
      const thicknessStr = Array.isArray(p.thickness) ? p.thickness.join(', ') : '-';
      console.log(`  - ${p.name?.substring(0, 40) || p.reference} (${thicknessStr}mm)`);
    }
    if (panels.length > 3) {
      console.log(`  ... et ${panels.length - 3} autres`);
    }
    console.log('');
  }

  // What productType should these be?
  console.log('\n=== SUGGESTION DE CORRECTION ===\n');
  console.log('Ces panneaux devraient probablement être:');
  console.log('- Dans catégorie melamines/* → productType=MELAMINE');
  console.log('- Dans catégorie stratifies-hpl/* → productType=STRATIFIE');
  console.log('- Dans catégorie mdf/* → productType=MDF');
  console.log('- Dans catégorie agglomere/* → productType=PARTICULE');
  console.log('- Dans catégorie osb/* → productType=OSB');
  console.log('- Dans catégorie contreplaque/* → productType=CONTREPLAQUE');

  // Count by probable correct type
  console.log('\n=== À CORRIGER ===\n');

  const corrections: Record<string, number> = {};

  for (const p of reallyFalse) {
    const catPath = p.category?.parent?.slug
      ? `${p.category.parent.slug}/${p.category.slug}`
      : p.category?.slug || 'null';

    let correctType = 'UNKNOWN';

    if (catPath.includes('melamin')) correctType = 'MELAMINE';
    else if (catPath.includes('stratif')) correctType = 'STRATIFIE';
    else if (catPath.includes('mdf')) correctType = 'MDF';
    else if (catPath.includes('agglom')) correctType = 'PARTICULE';
    else if (catPath.includes('osb')) correctType = 'OSB';
    else if (catPath.includes('contrepla')) correctType = 'CONTREPLAQUE';
    else if (catPath.includes('compact')) correctType = 'COMPACT';
    else if (catPath.includes('solid')) correctType = 'SOLID_SURFACE';

    corrections[correctType] = (corrections[correctType] || 0) + 1;
  }

  for (const [type, count] of Object.entries(corrections).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count} panneaux à corriger`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
