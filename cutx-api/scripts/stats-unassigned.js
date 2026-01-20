const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function stats() {
  const byType = await prisma.panel.groupBy({
    by: ['panelSubType'],
    where: { categoryId: null },
    _count: true,
    orderBy: { _count: { panelSubType: 'desc' } }
  });
  
  console.log('=== Panneaux SANS catégorie par subType ===');
  byType.forEach(t => console.log((t.panelSubType || 'NULL') + ': ' + t._count));
  
  const byProductType = await prisma.panel.groupBy({
    by: ['productType'],
    where: { categoryId: null },
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });
  
  console.log('\n=== Par productType ===');
  byProductType.forEach(t => console.log((t.productType || 'NULL') + ': ' + t._count));
  
  const total = await prisma.panel.count({ where: { categoryId: null } });
  console.log('\nTotal sans catégorie: ' + total);
  
  await prisma.$disconnect();
}

stats().catch(console.error);
