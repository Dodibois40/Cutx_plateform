import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
  // Vérifier le produit spécifique BCB-DEC-90052
  const specific = await prisma.panel.findFirst({
    where: { reference: 'BCB-DEC-90052' }
  });
  if (specific) {
    console.log('=== BCB-DEC-90052 ===');
    console.log('panelType:', specific.panelType);
    console.log('productCategory:', specific.productCategory);
    console.log('panelSubType:', specific.panelSubType);
    console.log('manufacturer:', specific.manufacturer);
    console.log('category (FK):', specific.categoryId);
    console.log('');
  }

  // Trouver les panneaux déco sans type
  const panneauxDeco = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'Latho', mode: 'insensitive' } },
        { name: { contains: 'panneau fraisé', mode: 'insensitive' } },
        { name: { contains: 'fraisé flex', mode: 'insensitive' } },
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      panelType: true,
      productCategory: true,
      manufacturer: true,
      defaultThickness: true
    },
    take: 30
  });

  console.log('=== Panneaux Déco (Latho/Fraisé) ===');
  console.log('Total:', panneauxDeco.length);
  panneauxDeco.slice(0, 10).forEach(p => {
    console.log(`- ${p.name.substring(0, 60)}`);
    console.log(`  Type: ${p.panelType || 'AUCUN'} | Category: ${p.productCategory} | Fab: ${p.manufacturer}`);
  });

  // Compter tous les panneaux sans type
  const sansType = await prisma.panel.count({
    where: { panelType: null }
  });
  console.log(`\nTotal panneaux sans type: ${sansType}`);

  // Types existants
  const types = await prisma.panel.groupBy({
    by: ['panelType'],
    _count: true,
    orderBy: { _count: { panelType: 'desc' } }
  });
  console.log('\n=== Types existants ===');
  types.forEach(t => console.log(`${t.panelType || 'NULL'}: ${t._count}`));

  // ProductCategory existants
  const categories = await prisma.panel.groupBy({
    by: ['productCategory'],
    _count: true,
    orderBy: { _count: { productCategory: 'desc' } }
  });
  console.log('\n=== ProductCategory existants ===');
  categories.forEach(c => console.log(`${c.productCategory || 'NULL'}: ${c._count}`));

  await prisma.$disconnect();
}

analyze();
