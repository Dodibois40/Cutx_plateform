import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Toutes les catégories avec leur nombre de panneaux
  const cats = await prisma.category.findMany({
    select: {
      name: true,
      slug: true,
      _count: { select: { panels: true } },
      parent: { select: { name: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== CATEGORIES AVEC 1-10 PANNEAUX ===\n');
  for (const c of cats) {
    if (c._count.panels >= 1 && c._count.panels <= 10) {
      const parentName = c.parent?.name || 'ROOT';
      console.log(`${c._count.panels} panneaux - ${c.name} (parent: ${parentName})`);
    }
  }

  // Chercher aussi "bois véritable" ou "5 panneaux"
  console.log('\n\n=== CATEGORIES AVEC EXACTEMENT 5 PANNEAUX ===\n');
  for (const c of cats) {
    if (c._count.panels === 5) {
      const parentName = c.parent?.name || 'ROOT';
      console.log(`${c.name} - parent: ${parentName}`);
      console.log(`  Slug: ${c.slug}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
