import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher tous les panneaux avec type PLACAGE ou FEUILLE
  const feuilles = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: 'PLACAGE' },
        { productType: { contains: 'feuille', mode: 'insensitive' } },
        { name: { contains: 'feuille', mode: 'insensitive' } },
      ]
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          parent: { select: { name: true } }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`=== PANNEAUX DE TYPE PLACAGE/FEUILLE ===`);
  console.log(`Total: ${feuilles.length}\n`);

  // Grouper par catégorie actuelle
  const byCategory = new Map<string, typeof feuilles>();
  for (const f of feuilles) {
    const catName = f.category?.name || 'SANS CATEGORIE';
    if (!byCategory.has(catName)) {
      byCategory.set(catName, []);
    }
    byCategory.get(catName)!.push(f);
  }

  console.log('=== PAR CATEGORIE ACTUELLE ===\n');
  for (const [cat, panels] of Array.from(byCategory.entries()).sort((a, b) => b[1].length - a[1].length)) {
    const parentName = panels[0]?.category?.parent?.name || 'ROOT';
    console.log(`${cat} (parent: ${parentName}): ${panels.length} panneaux`);
    // Montrer les 3 premiers
    for (const p of panels.slice(0, 3)) {
      const thick = p.thickness.join(', ');
      console.log(`  - ${p.reference}: ${p.name} (${thick}mm)`);
    }
    if (panels.length > 3) {
      console.log(`  ... et ${panels.length - 3} autres`);
    }
    console.log('');
  }

  // Spécifiquement les panneaux dans les catégories "Placage X"
  console.log('\n=== PANNEAUX DANS CATEGORIES "PLACAGE" ===\n');

  const placageCats = await prisma.category.findMany({
    where: { name: { startsWith: 'Placage' } },
    include: {
      panels: {
        select: {
          reference: true,
          name: true,
          thickness: true,
          productType: true
        }
      },
      parent: { select: { name: true } }
    }
  });

  for (const cat of placageCats) {
    console.log(`${cat.name} (parent: ${cat.parent?.name}): ${cat.panels.length} panneaux`);
    for (const p of cat.panels) {
      console.log(`  - ${p.reference}: ${p.name} (${p.thickness.join(',')}mm, type: ${p.productType})`);
    }
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
