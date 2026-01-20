import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. PANNEAU_CONSTRUCTION - où sont-ils?
  console.log('=== PANNEAUX CONSTRUCTION - OÙ SONT-ILS? ===');
  const constPanels = await prisma.panel.findMany({
    where: { productType: 'PANNEAU_CONSTRUCTION' },
    include: { category: { select: { name: true, slug: true } } }
  });

  const constByCat: Record<string, number> = {};
  for (const p of constPanels) {
    const cat = p.category?.slug || 'AUCUNE';
    constByCat[cat] = (constByCat[cat] || 0) + 1;
  }

  for (const [cat, count] of Object.entries(constByCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  // 2. Exemples détaillés
  console.log('\n=== EXEMPLES PANNEAU_CONSTRUCTION ===');
  for (const p of constPanels.slice(0, 15)) {
    console.log(`  ${p.reference} | ${p.name?.substring(0, 50)} | cat=${p.category?.slug}`);
  }

  // 3. Résumé global de "Panneaux Bruts"
  console.log('\n=== RÉSUMÉ PANNEAUX BRUTS ===');

  const panneauxBruts = await prisma.category.findFirst({
    where: { slug: 'panneaux-bruts' }
  });

  if (panneauxBruts) {
    const level1 = await prisma.category.findMany({
      where: { parentId: panneauxBruts.id },
      select: { id: true, slug: true, name: true }
    });

    for (const cat of level1) {
      const level2 = await prisma.category.findMany({
        where: { parentId: cat.id },
        include: { _count: { select: { panels: true } } }
      });

      const totalInSubcats = level2.reduce((sum, c) => sum + c._count.panels, 0);

      const directPanels = await prisma.panel.count({
        where: { categoryId: cat.id }
      });

      console.log(`\n${cat.name} (${cat.slug}):`);
      console.log(`  Panneaux directs: ${directPanels}`);

      for (const subCat of level2) {
        console.log(`  - ${subCat.name}: ${subCat._count.panels}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
