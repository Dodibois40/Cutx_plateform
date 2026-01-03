/**
 * Test sorting functionality
 * Run with: npx tsx scripts/test-sorting.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 TEST DU TRI\n');
  console.log('='.repeat(60) + '\n');

  // Test 1: Sort by price ASC - verify panels and edge bands are properly mixed
  console.log('📋 1. TRI PAR PRIX (ASC)\n');

  const priceAscResults = await prisma.$queryRaw<{ reference: string; name: string; pricePerM2: number | null; pricePerMl: number | null; productType: string }[]>`
    SELECT reference, name, "pricePerM2", "pricePerMl", "productType"
    FROM "Panel"
    WHERE "isActive" = true
    ORDER BY COALESCE("pricePerM2", "pricePerMl") ASC NULLS LAST, name ASC
    LIMIT 15
  `;

  console.log('   Top 15 par prix croissant (ASC):');
  priceAscResults.forEach((p, i) => {
    const price = p.pricePerM2 || p.pricePerMl;
    const unit = p.pricePerM2 ? '/m²' : '/ml';
    console.log(`   ${i + 1}. [${p.productType || 'N/A'}] ${p.reference}: ${price?.toFixed(2) || 'NULL'}€${unit} - ${p.name.substring(0, 40)}...`);
  });

  // Test 2: Sort by price DESC
  console.log('\n📋 2. TRI PAR PRIX (DESC)\n');

  const priceDescResults = await prisma.$queryRaw<{ reference: string; name: string; pricePerM2: number | null; pricePerMl: number | null; productType: string }[]>`
    SELECT reference, name, "pricePerM2", "pricePerMl", "productType"
    FROM "Panel"
    WHERE "isActive" = true
    ORDER BY COALESCE("pricePerM2", "pricePerMl") DESC NULLS FIRST, name ASC
    LIMIT 15
  `;

  console.log('   Top 15 par prix décroissant (DESC):');
  priceDescResults.forEach((p, i) => {
    const price = p.pricePerM2 || p.pricePerMl;
    const unit = p.pricePerM2 ? '/m²' : '/ml';
    console.log(`   ${i + 1}. [${p.productType || 'N/A'}] ${p.reference}: ${price?.toFixed(2) || 'NULL'}€${unit} - ${p.name.substring(0, 40)}...`);
  });

  // Test 3: Sort by thickness ASC
  console.log('\n📋 3. TRI PAR ÉPAISSEUR (ASC)\n');

  const thicknessAscResults = await prisma.$queryRaw<{ reference: string; name: string; defaultThickness: number | null; productType: string }[]>`
    SELECT reference, name, "defaultThickness", "productType"
    FROM "Panel"
    WHERE "isActive" = true
    ORDER BY COALESCE("defaultThickness", 0) ASC NULLS LAST, name ASC
    LIMIT 15
  `;

  console.log('   Top 15 par épaisseur croissante (ASC):');
  thicknessAscResults.forEach((p, i) => {
    console.log(`   ${i + 1}. [${p.productType || 'N/A'}] ${p.reference}: ${p.defaultThickness || 'NULL'}mm - ${p.name.substring(0, 40)}...`);
  });

  // Test 4: Sort by thickness DESC
  console.log('\n📋 4. TRI PAR ÉPAISSEUR (DESC)\n');

  const thicknessDescResults = await prisma.$queryRaw<{ reference: string; name: string; defaultThickness: number | null; productType: string }[]>`
    SELECT reference, name, "defaultThickness", "productType"
    FROM "Panel"
    WHERE "isActive" = true
    ORDER BY COALESCE("defaultThickness", 0) DESC NULLS FIRST, name ASC
    LIMIT 15
  `;

  console.log('   Top 15 par épaisseur décroissante (DESC):');
  thicknessDescResults.forEach((p, i) => {
    console.log(`   ${i + 1}. [${p.productType || 'N/A'}] ${p.reference}: ${p.defaultThickness || 'NULL'}mm - ${p.name.substring(0, 40)}...`);
  });

  // Test 5: Sort by name ASC
  console.log('\n📋 5. TRI PAR NOM (ASC)\n');

  const nameAscResults = await prisma.panel.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { reference: true, name: true },
    take: 10,
  });

  console.log('   Top 10 par nom (A-Z):');
  nameAscResults.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.reference}: ${p.name.substring(0, 50)}...`);
  });

  // Test 6: Sort by reference
  console.log('\n📋 6. TRI PAR RÉFÉRENCE (ASC)\n');

  const refAscResults = await prisma.panel.findMany({
    where: { isActive: true },
    orderBy: { reference: 'asc' },
    select: { reference: true, name: true },
    take: 10,
  });

  console.log('   Top 10 par référence (A-Z):');
  refAscResults.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.reference}: ${p.name.substring(0, 50)}...`);
  });

  // Verify stats
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 STATISTIQUES DE VÉRIFICATION\n');

  const stats = await prisma.$queryRaw<{ total: bigint; with_price_m2: bigint; with_price_ml: bigint; with_thickness: bigint }[]>`
    SELECT
      COUNT(*) as total,
      COUNT("pricePerM2") as with_price_m2,
      COUNT("pricePerMl") as with_price_ml,
      COUNT("defaultThickness") as with_thickness
    FROM "Panel"
    WHERE "isActive" = true
  `;

  console.log(`   Total panneaux actifs: ${stats[0].total}`);
  console.log(`   Avec pricePerM2: ${stats[0].with_price_m2}`);
  console.log(`   Avec pricePerMl: ${stats[0].with_price_ml}`);
  console.log(`   Avec defaultThickness: ${stats[0].with_thickness}`);

  const nullPrice = await prisma.panel.count({
    where: {
      isActive: true,
      pricePerM2: null,
      pricePerMl: null,
    },
  });
  console.log(`   Sans aucun prix: ${nullPrice}`);

  console.log('\n✅ Tests terminés!');

  await prisma.$disconnect();
}

main().catch(console.error);
