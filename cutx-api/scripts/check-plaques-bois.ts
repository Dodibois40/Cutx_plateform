import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher toutes les catégories avec 'bois' ou 'plaque'
  const allCats = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'plaque', mode: 'insensitive' } },
        { name: { contains: 'bois véritable', mode: 'insensitive' } },
        { slug: { contains: 'plaque' } },
      ]
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { panels: true } },
      parent: { select: { name: true } }
    }
  });

  console.log('=== CATEGORIES PLAQUES/BOIS ===\n');
  for (const c of allCats) {
    const parentName = c.parent?.name || 'ROOT';
    console.log(`- ${c.name}`);
    console.log(`  Parent: ${parentName}`);
    console.log(`  Panneaux: ${c._count.panels}`);
    console.log(`  ID: ${c.id}`);
    console.log('');
  }

  // Compter tous les panneaux qui ont "plaque" ou "bois véritable" dans le nom
  const panelsWithName = await prisma.panel.count({
    where: {
      OR: [
        { name: { contains: 'plaque', mode: 'insensitive' } },
        { productType: { contains: 'plaque', mode: 'insensitive' } },
      ]
    }
  });

  console.log(`\nPanneaux avec "plaque" dans le nom/type: ${panelsWithName}`);

  // Voir les panneaux de type "plaque"
  const plaquesPanels = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: { contains: 'plaque', mode: 'insensitive' } },
        { material: { contains: 'bois massif', mode: 'insensitive' } },
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      productType: true,
      material: true,
      category: { select: { name: true } }
    },
    take: 20
  });

  console.log('\n=== PANNEAUX PLAQUES (20 premiers) ===');
  for (const p of plaquesPanels) {
    console.log(`- ${p.reference}: ${p.name}`);
    console.log(`  Type: ${p.productType}, Material: ${p.material}`);
    console.log(`  Catégorie: ${p.category?.name || 'SANS CATEGORIE'}`);
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
