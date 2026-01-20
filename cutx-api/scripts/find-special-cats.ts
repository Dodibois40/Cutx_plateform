import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher panneaux-speciaux
  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { contains: 'speciaux' } },
        { slug: { contains: 'special' } },
        { name: { contains: 'spéci', mode: 'insensitive' } },
      ]
    },
    select: { id: true, slug: true, name: true, parentId: true }
  });

  console.log('=== Catégories spéciales ===');
  for (const c of cats) {
    console.log(`  ${c.slug}: ${c.name} [${c.id}]`);
  }

  // Chercher aussi sous "panneaux"
  const panneauxParent = await prisma.category.findFirst({
    where: { slug: 'panneaux' },
    include: { children: { select: { id: true, slug: true, name: true } } }
  });

  if (panneauxParent) {
    console.log('\n=== Sous-catégories de "panneaux" ===');
    for (const c of panneauxParent.children) {
      console.log(`  ${c.slug}: ${c.name}`);
    }
  }

  await prisma.$disconnect();
}
main().catch(console.error);
