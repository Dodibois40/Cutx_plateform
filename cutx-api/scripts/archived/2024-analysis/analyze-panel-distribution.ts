import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
  console.log('=== ANALYSE DES PANNEAUX À CLASSIFIER ===\n');

  // Par productType
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    _count: true,
    where: { isActive: true },
  });
  console.log('Par productType:');
  byType
    .sort((a, b) => b._count - a._count)
    .forEach((t) => console.log(`  ${t.productType || 'NULL'}: ${t._count}`));

  // Par catalogue
  const byCatalogue = await prisma.panel.groupBy({
    by: ['catalogueId'],
    _count: true,
    where: { isActive: true },
  });
  console.log('\nPar catalogue:');
  for (const c of byCatalogue.sort((a, b) => b._count - a._count)) {
    const cat = await prisma.catalogue.findUnique({
      where: { id: c.catalogueId },
      select: { name: true },
    });
    console.log(`  ${cat?.name}: ${c._count}`);
  }

  // Panneaux déjà classifiés (ont un panelType)
  const classified = await prisma.panel.count({
    where: { isActive: true, panelType: { not: null } },
  });
  const total = await prisma.panel.count({ where: { isActive: true } });
  console.log('\n=== PROGRESSION ===');
  console.log(`Classifiés: ${classified} / ${total} (${(classified / total * 100).toFixed(1)}%)`);
  console.log(`Restants: ${total - classified}`);

  // Panneaux avec manufacturerRef (facilement classifiables)
  const withManufRef = await prisma.panel.count({
    where: { isActive: true, manufacturerRef: { not: null } },
  });
  console.log(`\nAvec ref fabricant: ${withManufRef} (plus faciles à classifier)`);

  // Échantillon de refs fabricant pour voir les patterns
  const sampleRefs = await prisma.panel.findMany({
    where: { isActive: true, manufacturerRef: { not: null } },
    select: { manufacturerRef: true },
    distinct: ['manufacturerRef'],
    take: 50,
  });
  console.log('\nExemples de refs fabricant:');
  console.log(sampleRefs.map((r) => r.manufacturerRef).join(', '));

  await prisma.$disconnect();
}

analyze().catch(console.error);
