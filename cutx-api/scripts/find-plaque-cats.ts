import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher les catégories existantes pour plaqués
  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { contains: 'plaque' } },
        { slug: { contains: 'placage' } },
        { name: { contains: 'plaqué', mode: 'insensitive' } },
        { name: { contains: 'Plaqué', mode: 'insensitive' } },
      ]
    },
    select: { id: true, slug: true, name: true }
  });

  console.log('=== Catégories plaqué/placage existantes ===');
  for (const c of cats) {
    console.log(`${c.slug}: ${c.name}`);
  }

  // Lister toutes les catégories racines et leurs enfants directs
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        select: { slug: true, name: true }
      }
    }
  });

  console.log('\n=== Structure des catégories ===');
  for (const r of roots) {
    console.log(`\n📁 ${r.slug}: ${r.name}`);
    for (const c of r.children) {
      console.log(`   └─ ${c.slug}: ${c.name}`);
    }
  }

  await prisma.$disconnect();
}
main().catch(console.error);
