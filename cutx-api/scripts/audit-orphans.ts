import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== AUDIT DES CATÉGORIES ET PANNEAUX ORPHELINS ===\n');

  // 1. Catégories racines légitimes (celles qu'on veut garder)
  const legitimateRoots = [
    'Panneaux',
    'Chants',
    'Feuilles & Placages',
    'Compacts HPL',
    'Alvéolaires',
    'Isolants',
    'Plans de Travail',
  ];

  // 2. Trouver toutes les catégories sans parent (racines)
  const rootCats = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      _count: { select: { panels: true, children: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log('=== CATÉGORIES RACINES ===\n');

  const orphanRoots: typeof rootCats = [];
  const legitimateRootCats: typeof rootCats = [];

  for (const cat of rootCats) {
    if (legitimateRoots.includes(cat.name)) {
      legitimateRootCats.push(cat);
      console.log(`✅ ${cat.name}: ${cat._count.panels} panneaux, ${cat._count.children} enfants`);
    } else {
      orphanRoots.push(cat);
      console.log(`⚠️  ORPHELINE: ${cat.name} (${cat.slug}): ${cat._count.panels} panneaux, ${cat._count.children} enfants`);
      console.log(`   ID: ${cat.id}`);
    }
  }

  // 3. Trouver les catégories dupliquées (même nom)
  console.log('\n\n=== CATÉGORIES DUPLIQUÉES (même nom) ===\n');

  const allCats = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      parent: { select: { name: true } },
      _count: { select: { panels: true } }
    }
  });

  const nameCount = new Map<string, typeof allCats>();
  for (const cat of allCats) {
    if (!nameCount.has(cat.name)) {
      nameCount.set(cat.name, []);
    }
    nameCount.get(cat.name)!.push(cat);
  }

  let duplicatesFound = false;
  for (const [name, cats] of nameCount) {
    if (cats.length > 1) {
      duplicatesFound = true;
      console.log(`"${name}" - ${cats.length} occurrences:`);
      for (const c of cats) {
        const parent = c.parent?.name || 'ROOT';
        console.log(`  - ID: ${c.id} | Parent: ${parent} | ${c._count.panels} panneaux`);
      }
      console.log('');
    }
  }

  if (!duplicatesFound) {
    console.log('Aucune catégorie dupliquée trouvée ✅');
  }

  // 4. Panneaux sans catégorie
  console.log('\n=== PANNEAUX SANS CATÉGORIE ===\n');

  const panelsWithoutCategory = await prisma.panel.count({
    where: { categoryId: null }
  });

  console.log(`Panneaux sans catégorie: ${panelsWithoutCategory}`);

  if (panelsWithoutCategory > 0) {
    const examples = await prisma.panel.findMany({
      where: { categoryId: null },
      select: { reference: true, name: true, productType: true },
      take: 10
    });
    console.log('\nExemples:');
    for (const p of examples) {
      console.log(`  - ${p.reference}: ${p.name.substring(0, 50)} (${p.productType})`);
    }
  }

  // 5. Panneaux dans des catégories orphelines
  console.log('\n\n=== PANNEAUX DANS CATÉGORIES ORPHELINES ===\n');

  if (orphanRoots.length > 0) {
    const orphanCatIds = orphanRoots.map(c => c.id);

    // Aussi récupérer les enfants des catégories orphelines
    const orphanChildren = await prisma.category.findMany({
      where: { parentId: { in: orphanCatIds } },
      select: { id: true }
    });

    const allOrphanIds = [...orphanCatIds, ...orphanChildren.map(c => c.id)];

    const panelsInOrphans = await prisma.panel.count({
      where: { categoryId: { in: allOrphanIds } }
    });

    console.log(`Panneaux dans catégories orphelines: ${panelsInOrphans}`);

    if (panelsInOrphans > 0) {
      const examples = await prisma.panel.findMany({
        where: { categoryId: { in: allOrphanIds } },
        select: {
          reference: true,
          name: true,
          category: { select: { name: true } }
        },
        take: 15
      });

      // Grouper par catégorie
      const byCategory = new Map<string, typeof examples>();
      for (const p of examples) {
        const catName = p.category?.name || 'SANS';
        if (!byCategory.has(catName)) byCategory.set(catName, []);
        byCategory.get(catName)!.push(p);
      }

      for (const [cat, panels] of byCategory) {
        console.log(`\n${cat}:`);
        for (const p of panels.slice(0, 5)) {
          console.log(`  - ${p.reference}: ${p.name.substring(0, 50)}`);
        }
        if (panels.length > 5) console.log(`  ... et ${panels.length - 5} autres`);
      }
    }
  } else {
    console.log('Aucune catégorie racine orpheline ✅');
  }

  // 6. Résumé
  console.log('\n\n=== RÉSUMÉ ===\n');
  console.log(`Catégories racines légitimes: ${legitimateRootCats.length}`);
  console.log(`Catégories racines orphelines: ${orphanRoots.length}`);
  console.log(`Panneaux sans catégorie: ${panelsWithoutCategory}`);

  if (orphanRoots.length > 0) {
    console.log('\n⚠️  ACTION REQUISE: Fusionner ou supprimer les catégories orphelines');
    for (const cat of orphanRoots) {
      console.log(`  - "${cat.name}" (${cat._count.panels} panneaux)`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
