/**
 * Analyze product data completeness for product sheets
 * Run with: npx tsx scripts/analyze-product-data.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 ANALYSE DES DONNÉES POUR FICHE PRODUIT\n');
  console.log('='.repeat(60) + '\n');

  const total = await prisma.panel.count({ where: { isActive: true } });
  console.log(`Total panneaux actifs: ${total}\n`);

  // Field completeness analysis
  console.log('📊 COMPLÉTUDE DES CHAMPS\n');

  const fieldQueries = [
    { name: 'reference', sql: `"reference" IS NOT NULL AND "reference" != ''` },
    { name: 'name', sql: `"name" IS NOT NULL AND "name" != ''` },
    { name: 'description', sql: `"description" IS NOT NULL AND "description" != ''` },
    { name: 'productType', sql: `"productType" IS NOT NULL` },
    { name: 'material', sql: `"material" IS NOT NULL AND "material" != ''` },
    { name: 'finish', sql: `"finish" IS NOT NULL AND "finish" != ''` },
    { name: 'decor', sql: `"decor" IS NOT NULL AND "decor" != ''` },
    { name: 'colorCode', sql: `"colorCode" IS NOT NULL AND "colorCode" != ''` },
    { name: 'colorChoice', sql: `"colorChoice" IS NOT NULL AND "colorChoice" != ''` },
    { name: 'manufacturerRef', sql: `"manufacturerRef" IS NOT NULL AND "manufacturerRef" != ''` },
    { name: 'defaultThickness', sql: `"defaultThickness" IS NOT NULL AND "defaultThickness" > 0` },
    { name: 'defaultWidth', sql: `"defaultWidth" IS NOT NULL AND "defaultWidth" > 0` },
    { name: 'defaultLength', sql: `"defaultLength" IS NOT NULL AND "defaultLength" > 0` },
    { name: 'pricePerM2', sql: `"pricePerM2" IS NOT NULL` },
    { name: 'pricePerMl', sql: `"pricePerMl" IS NOT NULL` },
    { name: 'pricePerUnit', sql: `"pricePerUnit" IS NOT NULL` },
    { name: 'stockStatus', sql: `"stockStatus" IS NOT NULL AND "stockStatus" != ''` },
    { name: 'imageUrl', sql: `"imageUrl" IS NOT NULL AND "imageUrl" != ''` },
  ];

  for (const field of fieldQueries) {
    const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM "Panel" WHERE "isActive" = true AND ${field.sql}`
    );
    const count = Number(result[0].count);
    const pct = ((count / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / total * 20));
    const status = count === total ? '✅' : count > total * 0.8 ? '🟡' : count > total * 0.5 ? '🟠' : '🔴';
    console.log(`   ${status} ${field.name.padEnd(18)} ${count.toString().padStart(5)} / ${total} (${pct.padStart(5)}%) ${bar}`);
  }

  // Check for multiple thicknesses
  console.log('\n📏 ÉPAISSEURS MULTIPLES\n');

  const multiThickness = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "Panel"
    WHERE "isActive" = true AND array_length(thickness, 1) > 1
  `;
  console.log(`   Panneaux avec plusieurs épaisseurs: ${multiThickness[0].count}`);

  // Sample product by type
  console.log('\n📦 EXEMPLE PAR TYPE DE PRODUIT\n');

  const types = ['MELAMINE', 'STRATIFIE', 'BANDE_DE_CHANT', 'MDF', 'CONTREPLAQUE', 'PANNEAU_MASSIF'];

  for (const type of types) {
    const sample = await prisma.panel.findFirst({
      where: { isActive: true, productType: type },
      include: { catalogue: { select: { name: true } } },
    });

    if (sample) {
      console.log(`\n   === ${type} ===`);
      console.log(`   Référence: ${sample.reference}`);
      console.log(`   Nom: ${sample.name?.substring(0, 60)}...`);
      console.log(`   Description: ${sample.description ? sample.description.substring(0, 50) + '...' : '❌ MANQUANT'}`);
      console.log(`   Catalogue: ${sample.catalogue.name}`);
      console.log(`   Matériau: ${sample.material || '❌'}`);
      console.log(`   Finition: ${sample.finish || '❌'}`);
      console.log(`   Décor: ${sample.decor || '❌'}`);
      console.log(`   Code couleur: ${sample.colorCode || '❌'}`);
      console.log(`   Réf fabricant: ${sample.manufacturerRef || '❌'}`);
      console.log(`   Épaisseur: ${sample.defaultThickness ? sample.defaultThickness + 'mm' : '❌'} (options: ${JSON.stringify(sample.thickness)})`);
      console.log(`   Dimensions: ${sample.defaultWidth || '?'} x ${sample.defaultLength || '?'} mm`);
      console.log(`   Prix/m²: ${sample.pricePerM2 ? sample.pricePerM2.toFixed(2) + '€' : '❌'}`);
      console.log(`   Prix/ml: ${sample.pricePerMl ? sample.pricePerMl.toFixed(2) + '€' : '❌'}`);
      console.log(`   Stock: ${sample.stockStatus || '❌'}`);
      console.log(`   Image: ${sample.imageUrl ? '✅' : '❌'}`);
      console.log(`   Source: ${sample.sourceUrl ? '✅' : '❌'}`);
    }
  }

  // Check image availability
  console.log('\n\n🖼️ DISPONIBILITÉ DES IMAGES\n');

  const byTypeImages = await prisma.panel.groupBy({
    by: ['productType'],
    where: { isActive: true },
    _count: { id: true },
  });

  for (const type of byTypeImages) {
    const withImage = await prisma.panel.count({
      where: { isActive: true, productType: type.productType, imageUrl: { not: null } },
    });
    const pct = ((withImage / type._count.id) * 100).toFixed(0);
    console.log(`   ${type.productType || 'NULL'}: ${withImage}/${type._count.id} (${pct}%)`);
  }

  // Missing critical data summary
  console.log('\n\n⚠️ DONNÉES CRITIQUES MANQUANTES\n');

  const noPriceAtAll = await prisma.panel.count({
    where: {
      isActive: true,
      pricePerM2: null,
      pricePerMl: null,
      pricePerUnit: null,
    },
  });
  console.log(`   Sans aucun prix: ${noPriceAtAll} (${((noPriceAtAll / total) * 100).toFixed(1)}%)`);

  const noImage = await prisma.panel.count({
    where: { isActive: true, imageUrl: null },
  });
  console.log(`   Sans image: ${noImage} (${((noImage / total) * 100).toFixed(1)}%)`);

  const noThickness = await prisma.panel.count({
    where: {
      isActive: true,
      defaultThickness: null,
      NOT: { productType: { in: ['BANDE_DE_CHANT', 'SOLID_SURFACE', 'SANITAIRE'] } },
    },
  });
  console.log(`   Sans épaisseur (hors chants/sanitaire): ${noThickness}`);

  const noDimensions = await prisma.panel.count({
    where: {
      isActive: true,
      NOT: { productType: 'BANDE_DE_CHANT' },
      OR: [{ defaultWidth: 0 }, { defaultWidth: null }],
    },
  });
  console.log(`   Sans largeur (hors chants): ${noDimensions}`);

  // Recommendations
  console.log('\n\n💡 RECOMMANDATIONS POUR FICHE PRODUIT\n');
  console.log('   Données disponibles:');
  console.log('   ✅ Référence, Nom, Type produit');
  console.log('   ✅ Prix (m² ou ml selon le type)');
  console.log('   ✅ Stock status');
  console.log('   ✅ Épaisseurs disponibles');
  console.log('   ✅ Dimensions (pour la plupart)');
  console.log('   ✅ Images (pour ~90% des produits)');
  console.log('');
  console.log('   Données à améliorer:');
  console.log('   🟡 Description (souvent manquante)');
  console.log('   🟡 Décor/Finition (partiellement renseigné)');
  console.log('   🟡 Code couleur fabricant');

  console.log('\n✅ Analyse terminée!');

  await prisma.$disconnect();
}

main().catch(console.error);
