const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function stats() {
  const total = await prisma.panel.count();
  const classified = await prisma.panel.count({ where: { panelType: { not: null } } });
  const unclassified = await prisma.panel.count({ where: { panelType: null } });

  console.log('=== STATISTIQUES FINALES ===');
  console.log('Total panneaux: ' + total);
  console.log('Classifiés: ' + classified + ' (' + ((classified/total)*100).toFixed(1) + '%)');
  console.log('Non classifiés: ' + unclassified);

  const byType = await prisma.panel.groupBy({
    by: ['panelType'],
    _count: true,
    orderBy: { _count: { panelType: 'desc' } }
  });

  console.log('\n=== REPARTITION PAR TYPE ===');
  byType.forEach(t => {
    const type = t.panelType || 'NON CLASSIFIE';
    console.log(type + ': ' + t._count);
  });

  await prisma.$disconnect();
}
stats();
