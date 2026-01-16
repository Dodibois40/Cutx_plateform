import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const bouney = await prisma.catalogue.findFirst({ where: { slug: 'bouney' } });

  // Total count
  const total = await prisma.panel.count({ where: { catalogueId: bouney?.id } });
  console.log('═'.repeat(50));
  console.log('📊 STATISTIQUES BOUNEY');
  console.log('═'.repeat(50));
  console.log('\nTotal panneaux:', total);

  // By product type
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    where: { catalogueId: bouney?.id },
    _count: true,
  });
  console.log('\nPar type:');
  byType.forEach(t => console.log(`   ${t.productType || 'N/A'}: ${t._count}`));

  // With price
  const withPrice = await prisma.panel.count({
    where: { catalogueId: bouney?.id, pricePerM2: { not: null } }
  });
  const withPriceMl = await prisma.panel.count({
    where: { catalogueId: bouney?.id, pricePerMl: { not: null } }
  });
  console.log(`\nAvec prix/m²: ${withPrice}`);
  console.log(`Avec prix/ml: ${withPriceMl}`);

  // Active
  const active = await prisma.panel.count({
    where: { catalogueId: bouney?.id, isActive: true }
  });
  console.log(`Actifs: ${active}`);

  // Verify contrebalancement products
  console.log('\n📦 Produits contrebalancement:');
  const contrebal = await prisma.panel.findMany({
    where: {
      catalogueId: bouney?.id,
      name: { contains: 'contrebalancement', mode: 'insensitive' }
    },
    select: { reference: true, name: true, pricePerM2: true, stockStatus: true }
  });
  contrebal.forEach(p => {
    console.log(`   ${p.reference}: ${p.name?.substring(0, 45)}`);
    console.log(`      Prix: ${p.pricePerM2 ?? 'N/A'}€/m² | Stock: ${p.stockStatus}`);
  });

  console.log('\n' + '═'.repeat(50));

  await prisma.$disconnect();
}
main().catch(console.error);
