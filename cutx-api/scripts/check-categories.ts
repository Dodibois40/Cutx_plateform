import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Panneaux avec/sans catégorie
  const withCategory = await prisma.panel.count({ where: { categoryId: { not: null } } });
  const withoutCategory = await prisma.panel.count({ where: { categoryId: null } });
  const total = await prisma.panel.count();

  console.log('=== ÉTAT DES CATÉGORIES ===');
  console.log('Total panneaux:', total);
  console.log('Avec catégorie:', withCategory, '(' + Math.round(withCategory/total*100) + '%)');
  console.log('SANS catégorie:', withoutCategory, '(' + Math.round(withoutCategory/total*100) + '%)');

  // Catégories existantes
  const categories = await prisma.category.findMany({
    include: { _count: { select: { panels: true } } },
    orderBy: { name: 'asc' }
  });

  console.log('\n=== CATÉGORIES EXISTANTES (' + categories.length + ') ===');
  categories.forEach(c => {
    console.log('  ' + c.name + ': ' + c._count.panels + ' panneaux');
  });

  // Répartition par productType
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  console.log('\n=== RÉPARTITION PAR PRODUCT TYPE ===');
  byType.forEach(t => {
    console.log('  ' + t.productType + ': ' + t._count.id);
  });

  await prisma.$disconnect();
}

main();
