import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Analyze actual products to understand what we have
  console.log('=== ANALYSE DES PRODUITS EXISTANTS ===\n');

  // Get productType distribution
  const byProductType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: { id: true },
    where: { isActive: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('📊 Par type de produit (productType):');
  for (const item of byProductType) {
    console.log(`  ${item.productType || 'NULL'}: ${item._count.id} produits`);
  }

  // Get panelType distribution
  const byPanelType = await prisma.panel.groupBy({
    by: ['panelType'],
    _count: { id: true },
    where: { isActive: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('\n📊 Par type de panneau (panelType):');
  for (const item of byPanelType) {
    console.log(`  ${item.panelType || 'NULL'}: ${item._count.id} produits`);
  }

  // Get panelSubType distribution
  const byPanelSubType = await prisma.panel.groupBy({
    by: ['panelSubType'],
    _count: { id: true },
    where: { isActive: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('\n📊 Par sous-type (panelSubType):');
  for (const item of byPanelSubType) {
    console.log(`  ${item.panelSubType || 'NULL'}: ${item._count.id} produits`);
  }

  // Get decorCategory distribution
  const byDecorCategory = await prisma.panel.groupBy({
    by: ['decorCategory'],
    _count: { id: true },
    where: { isActive: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('\n📊 Par catégorie décor (decorCategory):');
  for (const item of byDecorCategory) {
    console.log(`  ${item.decorCategory || 'NULL'}: ${item._count.id} produits`);
  }

  // Get manufacturer distribution
  const byManufacturer = await prisma.panel.groupBy({
    by: ['manufacturer'],
    _count: { id: true },
    where: { isActive: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('\n📊 Par fabricant:');
  for (const item of byManufacturer) {
    console.log(`  ${item.manufacturer || 'NULL'}: ${item._count.id} produits`);
  }

  // Get catalogue distribution
  const catalogues = await prisma.catalogue.findMany({
    include: {
      _count: { select: { panels: { where: { isActive: true } } } }
    }
  });

  console.log('\n📊 Par catalogue:');
  for (const cat of catalogues) {
    console.log(`  ${cat.name}: ${cat._count.panels} produits`);
  }

  // Total
  const total = await prisma.panel.count({ where: { isActive: true } });
  console.log(`\n✅ TOTAL: ${total} produits actifs`);

  await prisma.$disconnect();
}

main().catch(console.error);
