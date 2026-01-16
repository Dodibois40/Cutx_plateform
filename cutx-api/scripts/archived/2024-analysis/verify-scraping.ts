/**
 * Vérification de la qualité des données scrapées
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.panel.count();

  const withDim = await prisma.panel.count({
    where: { defaultLength: { gt: 0 }, defaultWidth: { gt: 0 } }
  });

  const withPrice = await prisma.panel.count({
    where: {
      OR: [
        { pricePerM2: { gt: 0 } },
        { pricePerMl: { gt: 0 } },
        { pricePerUnit: { gt: 0 } }
      ]
    }
  });

  const withImage = await prisma.panel.count({
    where: { imageUrl: { not: null } }
  });

  const withStock = await prisma.panel.count({
    where: { stockStatus: { not: null } }
  });

  const withStockLocations = await prisma.panel.count({
    where: { stockLocations: { not: null } }
  });

  console.log('═'.repeat(60));
  console.log('📊 QUALITÉ DES DONNÉES SCRAPÉES');
  console.log('═'.repeat(60));
  console.log(`\n   Total panneaux: ${total}`);
  console.log(`   Avec dimensions: ${withDim} (${((withDim/total)*100).toFixed(1)}%)`);
  console.log(`   Avec prix: ${withPrice} (${((withPrice/total)*100).toFixed(1)}%)`);
  console.log(`   Avec image: ${withImage} (${((withImage/total)*100).toFixed(1)}%)`);
  console.log(`   Avec stock: ${withStock} (${((withStock/total)*100).toFixed(1)}%)`);
  console.log(`   Avec locations: ${withStockLocations} (${((withStockLocations/total)*100).toFixed(1)}%)`);

  // Par type de produit
  console.log('\n📦 Par type de produit:');
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true
  });
  byType.forEach(t => {
    console.log(`   ${t.productType || 'NULL'}: ${t._count}`);
  });

  // Par catégorie
  console.log('\n📁 Par catégorie:');
  const byCategory = await prisma.panel.groupBy({
    by: ['categoryId'],
    _count: true
  });

  for (const cat of byCategory) {
    if (cat.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: cat.categoryId }
      });
      console.log(`   ${category?.name || 'Inconnu'}: ${cat._count}`);
    }
  }

  // Exemples
  console.log('\n📋 Exemples de panneaux:');
  const samples = await prisma.panel.findMany({
    select: {
      reference: true,
      name: true,
      manufacturerRef: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      pricePerM2: true,
      stockStatus: true,
      stockLocations: true,
      productType: true,
      supportQuality: true
    },
    take: 3
  });

  samples.forEach((p, i) => {
    console.log(`\n   [${i + 1}] ${p.reference}`);
    console.log(`       Nom: ${p.name}`);
    console.log(`       Ref fab: ${p.manufacturerRef}`);
    console.log(`       Dimensions: ${p.defaultLength}x${p.defaultWidth}mm, ép ${p.defaultThickness}mm`);
    console.log(`       Support: ${p.supportQuality}`);
    console.log(`       Type: ${p.productType}`);
    console.log(`       Prix: ${p.pricePerM2 ? p.pricePerM2 + '€/m²' : '-'}`);
    console.log(`       Stock: ${p.stockStatus}`);
    if (p.stockLocations) {
      const locations = JSON.parse(p.stockLocations);
      console.log(`       Locations: ${locations.map((l: any) => `${l.location}(${l.inStock ? '✓' : '✗'})`).join(', ')}`);
    }
  });

  console.log('\n' + '═'.repeat(60));

  await prisma.$disconnect();
}

main();
