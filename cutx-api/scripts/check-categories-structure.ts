/**
 * Check existing category structure by catalogue
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Liste des catégories par catalogue
  const cats = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      slug: true,
      name: true,
      catalogue: { select: { name: true } },
      _count: { select: { panels: { where: { isActive: true } } } },
    },
    orderBy: [{ catalogueId: 'asc' }, { slug: 'asc' }],
  });

  console.log('=== CATÉGORIES NIVEAU 1 PAR CATALOGUE ===\n');

  let currentCat = '';
  for (const cat of cats) {
    if (cat.catalogue?.name !== currentCat) {
      currentCat = cat.catalogue?.name || '';
      console.log('\n' + currentCat);
      console.log('-'.repeat(50));
    }
    const count = cat._count.panels.toString().padStart(4);
    console.log(`  ${cat.slug.padEnd(35)} ${count} panels`);
  }

  // Aussi montrer où sont les chants
  console.log('\n\n=== OÙ SONT LES CHANTS (BANDE_DE_CHANT) ? ===\n');

  const chantPanels = await prisma.panel.groupBy({
    by: ['categoryId'],
    where: { productType: 'BANDE_DE_CHANT', isActive: true },
    _count: true,
  });

  for (const group of chantPanels) {
    if (!group.categoryId) continue;
    const cat = await prisma.category.findUnique({
      where: { id: group.categoryId },
      include: {
        catalogue: { select: { name: true } },
        parent: { select: { slug: true } },
      },
    });

    const path = cat?.parent?.slug ? `${cat.parent.slug}/${cat.slug}` : cat?.slug;
    console.log(`  ${cat?.catalogue?.name}: ${path} → ${group._count} chants`);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
