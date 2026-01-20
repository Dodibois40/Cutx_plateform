import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ordre souhaité:
// 1. Panneaux
// 2. Plans de Travail
// 3. Feuilles & Placages
// 4. Chants

const ROOT_ORDER: Record<string, number> = {
  panneaux: 1,
  'plans-de-travail': 2,
  'feuilles-placages': 3,
  chants: 4,
};

async function main() {
  console.log('Mise à jour de l\'ordre des catégories...\n');

  const cutx = await prisma.catalogue.findFirst({ where: { slug: 'cutx' } });
  if (!cutx) {
    console.log('Catalogue cutx non trouvé');
    return;
  }

  // Mettre à jour l'ordre des catégories racines
  for (const [slug, order] of Object.entries(ROOT_ORDER)) {
    const result = await prisma.category.updateMany({
      where: {
        slug,
        catalogueId: cutx.id,
        parentId: null,
      },
      data: { sortOrder: order },
    });
    console.log(`${order}. ${slug}: ${result.count} mis à jour`);
  }

  // Vérifier le résultat
  console.log('\nVérification:');
  const roots = await prisma.category.findMany({
    where: {
      catalogueId: cutx.id,
      parentId: null,
    },
    select: { name: true, slug: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  });

  roots.forEach((r, i) => console.log(`${i + 1}. ${r.name} (sortOrder: ${r.sortOrder})`));
}

main().finally(() => prisma.$disconnect());
