import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fix() {
  // Trouver la catégorie placage-noyer
  const noyerCat = await prisma.category.findFirst({ where: { slug: 'placage-noyer' } });
  if (!noyerCat) {
    console.log('❌ Catégorie placage-noyer non trouvée');
    return;
  }

  console.log('✅ Catégorie placage-noyer trouvée:', noyerCat.id);

  // Trouver tous les panneaux avec "walnut" dans le nom qui ne sont pas déjà dans placage-noyer
  const walnutPanels = await prisma.panel.findMany({
    where: {
      name: { contains: 'walnut', mode: 'insensitive' },
      categoryId: { not: noyerCat.id },
      isActive: true
    },
    select: { id: true, name: true, category: { select: { slug: true } } }
  });

  console.log(`\nPanneaux "walnut" à déplacer: ${walnutPanels.length}`);
  walnutPanels.forEach(p => {
    console.log(`  ${p.category?.slug} → placage-noyer: ${p.name}`);
  });

  if (walnutPanels.length > 0) {
    const result = await prisma.panel.updateMany({
      where: {
        id: { in: walnutPanels.map(p => p.id) }
      },
      data: { categoryId: noyerCat.id }
    });
    console.log(`\n✅ ${result.count} panneaux déplacés vers placage-noyer`);
  }

  await prisma.$disconnect();
}

fix().catch(console.error);
