import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cutx = await prisma.catalogue.findFirst({ where: { slug: 'cutx' } });

  if (!cutx) {
    console.log('Catalogue cutx non trouvé');
    return;
  }

  console.log('Catalogue cutx ID:', cutx.id);

  const roots = await prisma.category.findMany({
    where: {
      catalogueId: cutx.id,
      parentId: null,
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  });

  console.log('\nCATÉGORIES RACINES DU CATALOGUE CUTX:');
  console.log('Total:', roots.length);
  roots.forEach((r, i) => console.log(`${i + 1}. ${r.name} (${r.slug})`));
}

main().finally(() => prisma.$disconnect());
