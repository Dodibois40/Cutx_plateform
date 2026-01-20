import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Vérifier PARTICULE - probablement les agglomérés
  console.log('=== PANNEAUX PARTICULE - OÙ SONT-ILS? ===');
  const particulePanels = await prisma.panel.findMany({
    where: { productType: 'PARTICULE' },
    include: { category: true }
  });

  const particuleByCat: Record<string, number> = {};
  for (const p of particulePanels) {
    const cat = p.category?.slug || 'AUCUNE';
    particuleByCat[cat] = (particuleByCat[cat] || 0) + 1;
  }

  const particuleEntries = Object.entries(particuleByCat).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of particuleEntries) {
    console.log(`  ${cat}: ${count}`);
  }

  // 2. Voir quelques exemples de panneaux PARTICULE
  console.log('\n=== EXEMPLES PARTICULE ===');
  const particuleExamples = await prisma.panel.findMany({
    where: { productType: 'PARTICULE' },
    select: {
      reference: true,
      name: true,
      productType: true,
      thickness: true,
      category: { select: { name: true, slug: true } }
    },
    take: 10
  });

  for (const p of particuleExamples) {
    console.log(`  ${p.reference} | ${p.name?.substring(0, 50)} | ép=${p.thickness}mm | cat=${p.category?.slug}`);
  }

  // 3. Vérifier ce qui est dans les catégories Agglo
  console.log('\n=== PANNEAUX DANS CATÉGORIES AGGLO ===');
  const aggloCats = await prisma.category.findMany({
    where: { slug: { startsWith: 'agglo' } },
    include: {
      panels: {
        select: {
          reference: true,
          name: true,
          productType: true
        },
        take: 5
      },
      _count: { select: { panels: true } }
    }
  });

  for (const cat of aggloCats) {
    console.log(`\n${cat.name} (${cat.slug}) - ${cat._count.panels} panneaux`);
    for (const p of cat.panels) {
      console.log(`  ${p.reference} | ${p.name?.substring(0, 40)} | type=${p.productType}`);
    }
  }

  // 4. Les types qui NE SONT PAS dans les bonnes catégories
  console.log('\n=== DISTRIBUTION PAR TYPE DANS "PANNEAUX BRUTS" ===');

  // Get all panels in panneaux-bruts subtree
  const panneauxBruts = await prisma.category.findFirst({
    where: { slug: 'panneaux-bruts' }
  });

  if (panneauxBruts) {
    const level1 = await prisma.category.findMany({
      where: { parentId: panneauxBruts.id },
      select: { id: true }
    });
    const level2 = await prisma.category.findMany({
      where: { parentId: { in: level1.map(c => c.id) } },
      select: { id: true }
    });

    const allBrutsIds = [panneauxBruts.id, ...level1.map(c => c.id), ...level2.map(c => c.id)];

    const brutsDistrib = await prisma.panel.groupBy({
      by: ['productType'],
      where: { categoryId: { in: allBrutsIds } },
      _count: true,
      orderBy: { _count: { productType: 'desc' } }
    });

    for (const t of brutsDistrib) {
      console.log(`  ${t.productType}: ${t._count}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
