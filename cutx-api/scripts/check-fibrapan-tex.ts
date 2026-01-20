import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Chercher tous les FibraPan Tex ou panneaux texturés/cannelés
  const panels = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'tex', mode: 'insensitive' } },
        { name: { contains: 'flute', mode: 'insensitive' } },
        { name: { contains: 'cannelé', mode: 'insensitive' } },
        { name: { contains: 'rainuré', mode: 'insensitive' } },
        { name: { contains: 'texturé', mode: 'insensitive' } },
        { name: { contains: 'ondulé', mode: 'insensitive' } },
      ]
    },
    include: { category: { select: { slug: true, name: true } } }
  });

  console.log('=== Panneaux texturés/cannelés trouvés ===');
  console.log(`Total: ${panels.length}\n`);

  // Grouper par catégorie
  const byCategory: Record<string, typeof panels> = {};
  for (const p of panels) {
    const catSlug = p.category?.slug || 'AUCUNE';
    if (!byCategory[catSlug]) byCategory[catSlug] = [];
    byCategory[catSlug].push(p);
  }

  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`\n📁 ${cat} (${items.length})`);
    for (const p of items.slice(0, 5)) {
      console.log(`   ${p.reference}: ${(p.name || '').substring(0, 50)}`);
      console.log(`      ProductType: ${p.productType}`);
    }
    if (items.length > 5) {
      console.log(`   ... et ${items.length - 5} autres`);
    }
  }

  // Chercher les catégories muraux
  const murauxCats = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { contains: 'muraux' } },
        { slug: { contains: 'mural' } },
        { slug: { contains: 'decoratif' } },
      ]
    },
    select: { id: true, slug: true, name: true }
  });

  console.log('\n\n=== Catégories muraux/décoratifs disponibles ===');
  for (const c of murauxCats) {
    console.log(`   ${c.slug}: ${c.name}`);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
