import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  // Tous les panneaux avec productType = PLACAGE
  const placages = await prisma.panel.findMany({
    where: { productType: 'PLACAGE', isActive: true },
    select: {
      id: true,
      name: true,
      material: true,
      productType: true,
      category: { select: { name: true, slug: true } }
    }
  });

  console.log('=== PANNEAUX PLACAGE ===');
  console.log('Total:', placages.length);

  // Grouper par material
  const byMaterial: Record<string, any[]> = {};
  placages.forEach(p => {
    const mat = p.material || 'NULL';
    if (!byMaterial[mat]) byMaterial[mat] = [];
    byMaterial[mat].push(p);
  });

  console.log('\n=== PAR MATERIAL ===');
  Object.entries(byMaterial).sort((a,b) => b[1].length - a[1].length).forEach(([mat, items]) => {
    console.log(`${mat}: ${items.length}`);
  });

  // Grouper par catégorie actuelle
  const byCategory: Record<string, any[]> = {};
  placages.forEach(p => {
    const cat = p.category?.slug || 'NULL';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });

  console.log('\n=== PAR CATEGORIE ACTUELLE ===');
  Object.entries(byCategory).sort((a,b) => b[1].length - a[1].length).forEach(([cat, items]) => {
    console.log(`${cat}: ${items.length}`);
  });

  // Exemples par essence
  console.log('\n=== EXEMPLES PAR ESSENCE ===');
  Object.entries(byMaterial).slice(0, 5).forEach(([mat, items]) => {
    console.log(`\n--- ${mat} (${items.length} panneaux) ---`);
    items.slice(0, 3).forEach((p: any) => {
      const name = p.name ? p.name.substring(0, 60) : 'N/A';
      console.log(`  - ${name}`);
      console.log(`    cat actuelle: ${p.category?.slug}`);
    });
  });

  await prisma.$disconnect();
}
analyze();
