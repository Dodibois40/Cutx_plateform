import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Trouver "Panneaux" et explorer sa structure
  const panneaux = await prisma.category.findFirst({
    where: { slug: 'panneaux', parentId: null },
    include: {
      children: {
        include: {
          children: {
            include: {
              children: {
                include: {
                  _count: { select: { panels: true } }
                }
              },
              _count: { select: { panels: true } }
            }
          },
          _count: { select: { panels: true } }
        },
        orderBy: { name: 'asc' }
      },
      _count: { select: { panels: true } }
    }
  });

  if (!panneaux) {
    console.log('Catégorie panneaux non trouvée');
    return;
  }

  console.log('=== STRUCTURE COMPLÈTE "PANNEAUX" ===\n');
  
  function printTree(cat: any, indent = 0) {
    const prefix = '  '.repeat(indent);
    const count = cat._count?.panels || 0;
    console.log(`${prefix}${cat.name} (${cat.slug}) - ${count} panneaux`);
    
    if (cat.children && cat.children.length > 0) {
      for (const child of cat.children) {
        printTree(child, indent + 1);
      }
    }
  }
  
  printTree(panneaux);
  
  await prisma.$disconnect();
}

main().catch(console.error);
