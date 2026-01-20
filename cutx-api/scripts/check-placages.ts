import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher les catégories de placage
  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'placage', mode: 'insensitive' } },
        { name: { contains: 'feuille', mode: 'insensitive' } },
        { slug: { contains: 'placage' } },
      ]
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { panels: true, children: true } },
      parent: { select: { name: true } },
      children: {
        select: {
          name: true,
          _count: { select: { panels: true } }
        }
      }
    }
  });

  console.log('=== CATEGORIES PLACAGE/FEUILLES ===\n');
  for (const c of cats) {
    const parentName = c.parent?.name || 'ROOT';
    console.log(`${c.name}`);
    console.log(`  ID: ${c.id}`);
    console.log(`  Parent: ${parentName}`);
    console.log(`  Panneaux directs: ${c._count.panels}`);
    console.log(`  Sous-catégories: ${c._count.children}`);
    if (c.children.length > 0) {
      for (const child of c.children) {
        console.log(`    - ${child.name}: ${child._count.panels} panneaux`);
      }
    }
    console.log('');
  }

  // Compter les panneaux de type placage
  const placagePanels = await prisma.panel.count({
    where: {
      OR: [
        { productType: { contains: 'placage', mode: 'insensitive' } },
        { productType: { contains: 'feuille', mode: 'insensitive' } },
        { name: { contains: 'placage', mode: 'insensitive' } },
      ]
    }
  });

  console.log(`\nTotal panneaux avec "placage" ou "feuille" dans type/nom: ${placagePanels}`);

  // Montrer quelques exemples
  const examples = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: { contains: 'placage', mode: 'insensitive' } },
        { productType: { contains: 'feuille', mode: 'insensitive' } },
        { name: { contains: 'placage', mode: 'insensitive' } },
      ]
    },
    select: {
      reference: true,
      name: true,
      productType: true,
      thickness: true,
      category: { select: { name: true } }
    },
    take: 30
  });

  console.log('\n=== EXEMPLES DE PLACAGES ===\n');
  for (const p of examples) {
    console.log(`${p.reference}: ${p.name}`);
    console.log(`  Type: ${p.productType}, Épaisseur: ${p.thickness}mm`);
    console.log(`  Catégorie: ${p.category?.name || 'SANS'}`);
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
