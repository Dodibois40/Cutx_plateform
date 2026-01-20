/**
 * Find target categories for reassignment
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find all categories containing 'chant' in their slug
  const chantCats = await prisma.category.findMany({
    where: { slug: { contains: 'chant' } },
    include: {
      catalogue: { select: { name: true, slug: true } },
      parent: { select: { slug: true } },
    },
    orderBy: { catalogueId: 'asc' },
  });

  console.log('=== Catégories contenant "chant" ===\n');
  for (const cat of chantCats) {
    const parent = cat.parent?.slug || '-';
    console.log(cat.catalogue.name.padEnd(12) + ' ' + parent.padEnd(20) + ' > ' + cat.slug);
  }

  // Find categories for plans-de-travail
  console.log('\n=== Catégories pour plans de travail ===\n');
  const pdtCats = await prisma.category.findMany({
    where: {
      OR: [{ slug: { contains: 'plan' } }, { slug: { contains: 'travail' } }, { slug: { contains: 'pdt' } }],
    },
    include: {
      catalogue: { select: { name: true } },
      parent: { select: { slug: true } },
    },
  });

  if (pdtCats.length === 0) {
    console.log('  Aucune catégorie trouvée!');
  }
  for (const cat of pdtCats) {
    const parent = cat.parent?.slug || '-';
    console.log(cat.catalogue.name.padEnd(12) + ' ' + parent.padEnd(20) + ' > ' + cat.slug);
  }

  // Check if "chants" (level 1) exists in each catalogue
  console.log('\n=== Catégorie "chants" niveau 1 par catalogue ===\n');
  const catalogues = await prisma.catalogue.findMany();

  for (const catalogue of catalogues) {
    const chantsCat = await prisma.category.findFirst({
      where: {
        catalogueId: catalogue.id,
        slug: 'chants',
        parentId: null, // niveau 1
      },
    });

    if (chantsCat) {
      console.log(`  ${catalogue.name}: ✅ Existe (id=${chantsCat.id})`);
    } else {
      console.log(`  ${catalogue.name}: ❌ N'existe pas`);
    }
  }

  // Check where each catalogue's panels are actually stored
  console.log('\n=== Distribution des chants mal classés ===\n');

  for (const catalogue of catalogues) {
    const wrongChants = await prisma.panel.findMany({
      where: {
        catalogueId: catalogue.id,
        productType: 'BANDE_DE_CHANT',
        isActive: true,
        NOT: {
          category: {
            slug: { contains: 'chant' },
          },
        },
      },
      select: {
        category: {
          select: { slug: true, parent: { select: { slug: true } } },
        },
      },
    });

    if (wrongChants.length > 0) {
      console.log(`${catalogue.name}: ${wrongChants.length} chants mal classés`);

      // Group by current category
      const byCat = new Map<string, number>();
      for (const p of wrongChants) {
        const path = p.category?.parent?.slug
          ? `${p.category.parent.slug}/${p.category.slug}`
          : p.category?.slug || 'null';
        byCat.set(path, (byCat.get(path) || 0) + 1);
      }

      for (const [cat, count] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${cat}: ${count}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
