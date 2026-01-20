import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Trouver la catégorie 'panneau-brut' et ses sous-catégories
  const panneauBrut = await prisma.category.findFirst({
    where: { slug: 'panneau-brut' },
    include: {
      children: {
        include: {
          children: {
            include: {
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

  if (!panneauBrut) {
    console.log('Catégorie panneau-brut non trouvée');
    return;
  }

  console.log('=== STRUCTURE PANNEAU BRUT ===');
  console.log(`Catégorie: ${panneauBrut.name} (${panneauBrut.slug})`);
  console.log(`Panneaux directement assignés: ${panneauBrut._count.panels}`);
  console.log('');
  console.log('Sous-catégories:');
  
  for (const child of panneauBrut.children) {
    console.log(`  - ${child.name} (${child.slug}) - ${child._count.panels} panneaux`);
    if (child.children.length > 0) {
      for (const subChild of child.children) {
        const count = (subChild as any)._count?.panels || 0;
        console.log(`    - ${subChild.name} (${subChild.slug}) - ${count} panneaux`);
      }
    }
  }
  
  // Regarder quelques exemples de panneaux assignés à panneau-brut
  console.log('\n=== EXEMPLES DE PANNEAUX DIRECTEMENT DANS PANNEAU-BRUT ===');
  const samples = await prisma.panel.findMany({
    where: { categoryId: panneauBrut.id },
    take: 20,
    select: {
      reference: true,
      name: true,
      productType: true,
      thickness: true
    }
  });
  
  for (const p of samples) {
    console.log(`  ${p.reference} | ${p.name} | type=${p.productType} | ép=${p.thickness}mm`);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
