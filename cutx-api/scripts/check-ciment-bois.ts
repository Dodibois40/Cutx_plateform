import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher la catégorie Ciment-Bois
  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'ciment', mode: 'insensitive' } },
        { slug: { contains: 'ciment', mode: 'insensitive' } },
      ]
    },
    include: {
      _count: { select: { panels: true } },
      parent: { select: { name: true } }
    }
  });

  console.log('=== CATÉGORIES CIMENT ===\n');
  for (const cat of cats) {
    console.log(`Nom: ${cat.name}`);
    console.log(`  ID: ${cat.id}`);
    console.log(`  Slug: ${cat.slug}`);
    console.log(`  Parent: ${cat.parent?.name || 'ROOT'}`);
    console.log(`  Count panels: ${cat._count.panels}`);
    console.log('');
  }

  // Compter les panneaux qui ont 'ciment' ou 'viroc' dans le nom
  const panelsCiment = await prisma.panel.count({
    where: {
      OR: [
        { name: { contains: 'ciment', mode: 'insensitive' } },
        { name: { contains: 'viroc', mode: 'insensitive' } },
      ]
    }
  });

  console.log(`\nTotal panneaux ciment/viroc dans la DB: ${panelsCiment}`);

  // Voir où sont ces panneaux
  const panels = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'ciment', mode: 'insensitive' } },
        { name: { contains: 'viroc', mode: 'insensitive' } },
      ]
    },
    select: {
      reference: true,
      name: true,
      categoryId: true,
      category: { select: { name: true, id: true } }
    },
    take: 30
  });

  console.log(`\n=== PANNEAUX CIMENT/VIROC (${panels.length}) ===\n`);

  // Grouper par catégorie
  const byCategory = new Map<string, typeof panels>();
  for (const p of panels) {
    const catName = p.category?.name || 'SANS CATEGORIE';
    if (!byCategory.has(catName)) {
      byCategory.set(catName, []);
    }
    byCategory.get(catName)!.push(p);
  }

  for (const [cat, panelsList] of byCategory) {
    console.log(`${cat}: ${panelsList.length} panneaux`);
    for (const p of panelsList.slice(0, 3)) {
      console.log(`  - ${p.reference}: ${p.name.substring(0, 50)}`);
      console.log(`    categoryId: ${p.categoryId}`);
    }
    if (panelsList.length > 3) {
      console.log(`  ... et ${panelsList.length - 3} autres`);
    }
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
