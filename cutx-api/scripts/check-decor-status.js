const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Stats par productType
  const types = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true,
    orderBy: { _count: { productType: 'desc' } }
  });
  
  console.log('=== État du champ decor par type ===\n');
  console.log('Type'.padEnd(20), '| Avec/Total |  %  | Status');
  console.log('-'.repeat(55));
  
  for (const t of types) {
    if (!t.productType) continue;
    
    const withDecor = await prisma.panel.count({
      where: { 
        productType: t.productType,
        decor: { not: null }
      }
    });
    
    const pct = t._count > 0 ? Math.round(withDecor / t._count * 100) : 0;
    const status = pct === 100 ? '✅' : pct > 80 ? '⚠️' : pct > 0 ? '🔶' : '❌';
    
    console.log(
      t.productType.padEnd(20), '|',
      String(withDecor).padStart(5), '/', String(t._count).padStart(5),
      '|', (pct + '%').padStart(4), '|', status
    );
  }
  
  await prisma.$disconnect();
}

main();
