const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  // Check decorCategory distribution for CHANT_ABS
  const chants = await prisma.panel.findMany({
    where: { panelSubType: 'CHANT_ABS' },
    select: { 
      reference: true, 
      name: true, 
      decorCategory: true,
      material: true
    },
    take: 30
  });
  
  console.log('=== Exemples de chants ABS ===');
  chants.forEach(c => {
    console.log(c.reference + ' | decor: ' + (c.decorCategory || 'NULL') + ' | ' + c.name.substring(0, 50));
  });
  
  // Group by decorCategory
  const byDecor = await prisma.panel.groupBy({
    by: ['decorCategory'],
    where: { panelSubType: 'CHANT_ABS' },
    _count: true
  });
  
  console.log('\n=== Distribution par decorCategory ===');
  byDecor.forEach(d => console.log((d.decorCategory || 'NULL') + ': ' + d._count));
  
  await prisma.$disconnect();
}

analyze().catch(console.error);
