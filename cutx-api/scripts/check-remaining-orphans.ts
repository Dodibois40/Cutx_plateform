import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher Isolants et Alvéolaires
  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'isolant', mode: 'insensitive' } },
        { name: { contains: 'alvéol', mode: 'insensitive' } },
        { name: { contains: 'alveol', mode: 'insensitive' } },
      ]
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      parent: { select: { name: true } },
      _count: { select: { panels: true } }
    }
  });

  console.log('=== CATÉGORIES ISOLANTS/ALVÉOLAIRES ===\n');
  for (const c of cats) {
    const parent = c.parent?.name || 'ROOT';
    console.log(`${c.name} (parent: ${parent}) - ${c._count.panels} panneaux`);
    console.log(`  ID: ${c.id}`);
    console.log(`  parentId: ${c.parentId || 'null'}`);
    console.log('');
  }

  // Vérifier toutes les catégories racines
  console.log('\n=== TOUTES LES CATÉGORIES RACINES ===\n');
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true, _count: { select: { panels: true, children: true } } },
    orderBy: { name: 'asc' }
  });

  for (const r of roots) {
    console.log(`${r.name}: ${r._count.panels} panneaux, ${r._count.children} enfants`);
    console.log(`  ID: ${r.id}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
