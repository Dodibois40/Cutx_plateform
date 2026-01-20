import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  // Analyser les PANNEAU_DECORATIF
  const decoratifs = await prisma.panel.findMany({
    where: { productType: 'PANNEAU_DECORATIF', isActive: true },
    select: {
      reference: true,
      name: true,
      material: true,
      decorName: true,
      finish: true,
      category: { select: { name: true, slug: true } },
      catalogue: { select: { name: true } }
    },
    take: 20
  });

  console.log('=== PANNEAU_DECORATIF (78 total) ===\n');
  console.log('Exemples:\n');

  for (const p of decoratifs) {
    console.log('Ref:', p.reference);
    console.log('  Nom:', (p.name || '').substring(0, 70));
    console.log('  Material:', p.material || 'NULL');
    console.log('  DecorName:', p.decorName || 'NULL');
    console.log('  Finish:', p.finish || 'NULL');
    console.log('  Catégorie:', p.category?.name || 'NULL');
    console.log('  Catalogue:', p.catalogue?.name || 'NULL');
    console.log('');
  }

  // Grouper par catalogue
  const byCatalogue = await prisma.panel.groupBy({
    by: ['catalogueId'],
    where: { productType: 'PANNEAU_DECORATIF', isActive: true },
    _count: true
  });

  const catalogueIds = byCatalogue.map(b => b.catalogueId).filter((id): id is string => id !== null);
  const catalogues = await prisma.catalogue.findMany({
    where: { id: { in: catalogueIds } },
    select: { id: true, name: true }
  });

  console.log('\nDistribution par catalogue:');
  for (const b of byCatalogue) {
    const cat = catalogues.find(c => c.id === b.catalogueId);
    console.log('  ' + (cat?.name || 'NULL') + ': ' + b._count);
  }

  // Grouper par catégorie
  const byCategory = await prisma.panel.groupBy({
    by: ['categoryId'],
    where: { productType: 'PANNEAU_DECORATIF', isActive: true },
    _count: true
  });

  const categoryIds = byCategory.map(b => b.categoryId).filter((id): id is string => id !== null);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, slug: true }
  });

  console.log('\nDistribution par catégorie:');
  for (const b of byCategory) {
    const cat = categories.find(c => c.id === b.categoryId);
    console.log('  ' + (cat?.name || 'Sans catégorie') + ': ' + b._count);
  }

  // Chercher des patterns dans les noms
  console.log('\n=== ANALYSE DES NOMS ===');

  const allDecoratifs = await prisma.panel.findMany({
    where: { productType: 'PANNEAU_DECORATIF', isActive: true },
    select: { name: true }
  });

  const withMelamine = allDecoratifs.filter(p =>
    p.name?.toLowerCase().includes('mélaminé') ||
    p.name?.toLowerCase().includes('melamine')
  );
  const withStratifie = allDecoratifs.filter(p =>
    p.name?.toLowerCase().includes('stratifié') ||
    p.name?.toLowerCase().includes('stratifie') ||
    p.name?.toLowerCase().includes('hpl')
  );
  const withPerfo = allDecoratifs.filter(p =>
    p.name?.toLowerCase().includes('perfor') ||
    p.name?.toLowerCase().includes('acousti')
  );

  console.log('Avec "mélaminé" dans le nom:', withMelamine.length);
  console.log('Avec "stratifié/HPL" dans le nom:', withStratifie.length);
  console.log('Avec "perforé/acoustique" dans le nom:', withPerfo.length);

  await prisma.$disconnect();
}

check().catch(console.error);
