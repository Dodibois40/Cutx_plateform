import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Trouver les catégories disponibles pour MELAMINE
  const melamineCategories = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { contains: 'melamine' } },
        { slug: { contains: 'decor' } },
        { slug: { contains: 'unis' } }
      ]
    },
    select: { id: true, slug: true, name: true }
  });

  console.log('=== Catégories MELAMINE/DECOR disponibles ===');
  for (const c of melamineCategories) {
    console.log(`${c.slug}: ${c.name} [${c.id}]`);
  }

  // Chercher aussi les catégories racines
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, slug: true, name: true }
  });

  console.log('\n=== Catégories racines ===');
  for (const c of roots) {
    console.log(`${c.slug}: ${c.name}`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
