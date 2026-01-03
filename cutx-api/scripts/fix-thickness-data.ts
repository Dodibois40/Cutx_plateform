/**
 * Fix thickness data issues
 * Run with: npx tsx scripts/fix-thickness-data.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 CORRECTION DES ÉPAISSEURS ABERRANTES\n');
  console.log('='.repeat(60) + '\n');

  // 1. Find products with thickness > 100mm (except SOLID_SURFACE/SANITAIRE which are 3D products)
  console.log('📋 1. ANALYSE DES ÉPAISSEURS > 100mm\n');

  const bigThickness = await prisma.panel.findMany({
    where: {
      defaultThickness: { gt: 100 },
      isActive: true,
      NOT: {
        productType: { in: ['SOLID_SURFACE', 'SANITAIRE'] }
      }
    },
    select: {
      id: true,
      reference: true,
      name: true,
      productType: true,
      defaultThickness: true,
      defaultWidth: true,
      defaultLength: true,
    },
    orderBy: { defaultThickness: 'desc' },
    take: 30
  });

  console.log(`   Trouvé ${bigThickness.length} panneaux avec épaisseur > 100mm:\n`);

  for (const panel of bigThickness) {
    console.log(`   [${panel.productType}] ${panel.reference}`);
    console.log(`      Name: ${panel.name.substring(0, 60)}...`);
    console.log(`      Thickness: ${panel.defaultThickness}mm, W: ${panel.defaultWidth}, L: ${panel.defaultLength}`);
    console.log('');
  }

  // 2. Fix MDF/PANNEAU_DECORATIF with unrealistic thickness
  console.log('\n📋 2. CORRECTION DES MDF/PANNEAU_DECORATIF\n');

  const mdfToFix = await prisma.panel.findMany({
    where: {
      productType: { in: ['MDF', 'PANNEAU_DECORATIF'] },
      defaultThickness: { gt: 50 },
      isActive: true,
    },
    select: {
      id: true,
      reference: true,
      name: true,
      defaultThickness: true,
    }
  });

  console.log(`   Found ${mdfToFix.length} MDF/PANNEAU_DECORATIF to fix\n`);

  for (const panel of mdfToFix) {
    // Try to extract real thickness from name
    let newThickness: number | null = null;

    // Pattern: "19 mm" or "19mm"
    const thicknessMatch = panel.name.match(/(\d+(?:[,\.]\d+)?)\s*mm/i);
    if (thicknessMatch) {
      const parsed = parseFloat(thicknessMatch[1].replace(',', '.'));
      if (parsed > 0 && parsed <= 50) {
        newThickness = parsed;
      }
    }

    // Common MDF thicknesses if not found
    if (!newThickness) {
      if (panel.name.toLowerCase().includes('fibracolour')) {
        newThickness = 19; // Common Fibracolour thickness
      } else {
        newThickness = 18; // Default MDF thickness
      }
    }

    await prisma.panel.update({
      where: { id: panel.id },
      data: {
        defaultThickness: newThickness,
        thickness: [newThickness],
      }
    });

    console.log(`   ✓ ${panel.reference}: ${panel.defaultThickness}mm → ${newThickness}mm`);
  }

  // 3. Set SOLID_SURFACE/SANITAIRE thickness to null (they're 3D products)
  console.log('\n📋 3. NETTOYAGE DES PRODUITS SANITAIRES (3D)\n');

  const sanitaire = await prisma.panel.updateMany({
    where: {
      productType: { in: ['SOLID_SURFACE', 'SANITAIRE'] },
      defaultThickness: { gt: 50 },
    },
    data: {
      defaultThickness: null,
      thickness: [],
    }
  });

  console.log(`   Nettoyé ${sanitaire.count} produits sanitaires (épaisseur non applicable)\n`);

  // 4. Check panels without any price
  console.log('\n📋 4. ANALYSE DES PANNEAUX SANS PRIX\n');

  const noPriceByType = await prisma.$queryRaw<{ productType: string | null; count: bigint }[]>`
    SELECT "productType", COUNT(*) as count
    FROM "Panel"
    WHERE "isActive" = true
      AND "pricePerM2" IS NULL
      AND "pricePerMl" IS NULL
      AND "pricePerUnit" IS NULL
    GROUP BY "productType"
    ORDER BY count DESC
  `;

  console.log('   Panneaux sans aucun prix par type:');
  let totalNoPrice = 0n;
  for (const row of noPriceByType) {
    console.log(`   - ${row.productType || 'NULL'}: ${row.count}`);
    totalNoPrice += row.count;
  }
  console.log(`\n   Total: ${totalNoPrice} panneaux sans prix`);

  // 5. Final stats
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 STATISTIQUES FINALES\n');

  const stats = await prisma.$queryRaw<{
    total: bigint;
    with_thickness: bigint;
    thick_under_50: bigint;
    with_price: bigint;
  }[]>`
    SELECT
      COUNT(*) as total,
      COUNT("defaultThickness") as with_thickness,
      COUNT(CASE WHEN "defaultThickness" > 0 AND "defaultThickness" <= 50 THEN 1 END) as thick_under_50,
      COUNT(CASE WHEN "pricePerM2" IS NOT NULL OR "pricePerMl" IS NOT NULL THEN 1 END) as with_price
    FROM "Panel"
    WHERE "isActive" = true
  `;

  console.log(`   Total panneaux actifs: ${stats[0].total}`);
  console.log(`   Avec épaisseur: ${stats[0].with_thickness}`);
  console.log(`   Épaisseur réaliste (≤50mm): ${stats[0].thick_under_50}`);
  console.log(`   Avec prix (m² ou ml): ${stats[0].with_price}`);

  console.log('\n✅ Corrections terminées!');

  await prisma.$disconnect();
}

main().catch(console.error);
