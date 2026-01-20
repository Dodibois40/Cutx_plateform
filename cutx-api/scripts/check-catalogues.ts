import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Vérifier les catalogues existants
  const catalogues = await prisma.catalogue.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('=== CATALOGUES ===');
  catalogues.forEach(c => console.log(`${c.slug} - ${c.name}`));

  // Vérifier les catégories placage par catalogue
  const placagesCats = await prisma.category.findMany({
    where: { slug: { startsWith: 'placage' } },
    select: {
      name: true,
      slug: true,
      catalogue: { select: { name: true, slug: true } }
    }
  });
  console.log('\n=== CATEGORIES PLACAGE ===');
  placagesCats.forEach(c => console.log(`${c.slug} | catalogue: ${c.catalogue?.slug || 'GLOBAL'}`));

  // Vérifier si les panneaux plaqués viennent de différents catalogues
  const placagesByCat = await prisma.panel.groupBy({
    by: ['catalogueId'],
    where: { productType: 'PLACAGE', isActive: true },
    _count: true
  });

  console.log('\n=== PANNEAUX PLACAGE PAR CATALOGUE ===');
  for (const p of placagesByCat) {
    const cat = await prisma.catalogue.findUnique({
      where: { id: p.catalogueId },
      select: { name: true }
    });
    console.log(`${cat?.name || 'N/A'}: ${p._count} panneaux`);
  }

  // Structure des catégories - vérifier si elles sont partagées
  const allCats = await prisma.category.findMany({
    where: { parent: { slug: 'placages' } },
    select: {
      name: true,
      slug: true,
      catalogueId: true,
      catalogue: { select: { name: true } },
      _count: { select: { panels: true } }
    }
  });

  console.log('\n=== SOUS-CATEGORIES DE PLACAGES ===');
  allCats.forEach(c => {
    console.log(`${c.slug}: ${c._count.panels} panneaux | cat: ${c.catalogue?.name || 'SHARED'}`);
  });

  await prisma.$disconnect();
}
check();
