const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Categories parentes
  const cats = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: { include: { _count: { select: { panels: true } } } },
      _count: { select: { panels: true } }
    }
  });

  console.log('=== CATEGORIES PARENTES ===');
  for (const c of cats) {
    console.log(`${c.name}: ${c._count.panels} panels directs`);
    for (const child of c.children) {
      console.log(`  - ${child.name}: ${child._count.panels}`);
    }
  }

  // Product types
  const types = await prisma.panel.groupBy({ by: ['productType'], _count: true });
  console.log('\n=== PRODUCT TYPES ===');
  for (const t of types) {
    console.log(`${t.productType || 'null'}: ${t._count}`);
  }

  // Finishes (marques)
  const finishes = await prisma.panel.groupBy({
    by: ['finish'],
    _count: true,
    orderBy: { _count: { finish: 'desc' } },
    take: 15
  });
  console.log('\n=== TOP FINISHES (Marques) ===');
  for (const f of finishes) {
    console.log(`${f.finish || 'null'}: ${f._count}`);
  }

  // Epaisseurs disponibles
  const panels = await prisma.panel.findMany({ select: { thickness: true } });
  const thicknessSet = new Set();
  for (const p of panels) {
    if (p.thickness && Array.isArray(p.thickness)) {
      p.thickness.forEach(t => thicknessSet.add(t));
    }
  }
  const thicknesses = [...thicknessSet].sort((a, b) => a - b);
  console.log('\n=== EPAISSEURS DISPONIBLES ===');
  console.log(thicknesses.join(', ') + ' mm');

  // Total
  const total = await prisma.panel.count();
  console.log(`\n=== TOTAL: ${total} panels ===`);

  await prisma.$disconnect();
}

main().catch(console.error);
