import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Lister toutes les catégories racines (sans parent)
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      _count: { select: { panels: true, children: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== CATÉGORIES RACINES ===');
  for (const cat of roots) {
    console.log(`${cat.name} (${cat.slug}) - ${cat._count.panels} panneaux, ${cat._count.children} enfants`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
