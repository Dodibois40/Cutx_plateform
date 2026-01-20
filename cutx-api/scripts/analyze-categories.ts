import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all categories with their hierarchy
  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      catalogue: true,
      _count: { select: { panels: true } }
    },
    orderBy: [
      { catalogue: { name: 'asc' } },
      { name: 'asc' }
    ]
  });

  console.log('=== STRUCTURE DES CATÉGORIES ===\n');
  console.log(`Total: ${categories.length} catégories\n`);

  // Group by catalogue
  const byCatalogue = new Map<string, typeof categories>();
  for (const cat of categories) {
    const catName = cat.catalogue?.name || 'Sans catalogue';
    if (!byCatalogue.has(catName)) {
      byCatalogue.set(catName, []);
    }
    byCatalogue.get(catName)!.push(cat);
  }

  for (const [catalogueName, cats] of byCatalogue) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📁 CATALOGUE: ${catalogueName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find root categories
    const roots = cats.filter(c => !c.parentId);
    const children = cats.filter(c => c.parentId);

    for (const root of roots) {
      const count = root._count.panels;
      console.log(`📂 ${root.name} [${root.slug}] → ${count} panels`);

      // Find children of this root
      const kids = children.filter(c => c.parentId === root.id);
      for (const kid of kids) {
        const kidCount = kid._count.panels;
        console.log(`   └─ ${kid.name} [${kid.slug}] → ${kidCount} panels`);
      }
    }
  }

  // Find potential duplicates (similar names)
  console.log('\n\n=== DOUBLONS POTENTIELS ===\n');

  const nameMap = new Map<string, typeof categories>();
  for (const cat of categories) {
    // Normalize name for comparison
    const normalized = cat.name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/s$/g, '') // Remove trailing 's'
      .replace(/[^a-z0-9]/g, ''); // Remove special chars

    if (!nameMap.has(normalized)) {
      nameMap.set(normalized, []);
    }
    nameMap.get(normalized)!.push(cat);
  }

  let duplicateCount = 0;
  for (const [normalized, cats] of nameMap) {
    if (cats.length > 1) {
      duplicateCount++;
      console.log(`⚠️  "${normalized}" a ${cats.length} variantes:`);
      for (const cat of cats) {
        console.log(`   - "${cat.name}" [${cat.slug}] dans ${cat.catalogue?.name} → ${cat._count.panels} panels`);
      }
      console.log('');
    }
  }

  if (duplicateCount === 0) {
    console.log('✅ Aucun doublon détecté');
  } else {
    console.log(`\n⚠️  ${duplicateCount} groupes de doublons potentiels trouvés`);
  }

  // Check panels without category
  const orphanPanels = await prisma.panel.count({
    where: { categoryId: null }
  });
  console.log(`\n📊 Panels sans catégorie: ${orphanPanels}`);

  // Check empty categories
  const emptyCategories = categories.filter(c => c._count.panels === 0);
  if (emptyCategories.length > 0) {
    console.log(`\n📭 Catégories vides (${emptyCategories.length}):`);
    for (const cat of emptyCategories) {
      console.log(`   - "${cat.name}" [${cat.slug}] dans ${cat.catalogue?.name}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
