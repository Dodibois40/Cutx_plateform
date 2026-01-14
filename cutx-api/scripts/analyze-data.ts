import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Product Types
  const types = await prisma.panel.groupBy({
    by: ['productType'],
    _count: { id: true },
    where: { isActive: true },
    orderBy: { _count: { id: 'desc' } }
  });
  console.log('=== PRODUCT TYPES ===');
  types.forEach(t => console.log(`  ${t.productType}: ${t._count.id}`));

  // Materials
  const mats = await prisma.panel.groupBy({
    by: ['material'],
    _count: { id: true },
    where: { isActive: true, material: { not: null } },
    orderBy: { _count: { id: 'desc' } }
  });
  console.log('\n=== MATERIALS ===');
  mats.forEach(m => console.log(`  ${m.material}: ${m._count.id}`));

  // Finishes (top 40)
  const fins = await prisma.panel.groupBy({
    by: ['finish'],
    _count: { id: true },
    where: { isActive: true, finish: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 40
  });
  console.log('\n=== TOP FINISHES ===');
  fins.forEach(f => console.log(`  ${f.finish}: ${f._count.id}`));

  // Sample panel names for color analysis
  const samples = await prisma.panel.findMany({
    where: { isActive: true },
    select: { name: true, finish: true },
    take: 100
  });
  console.log('\n=== SAMPLE NAMES ===');
  samples.slice(0, 20).forEach(s => console.log(`  ${s.name}`));

  await prisma.$disconnect();
}

main();
