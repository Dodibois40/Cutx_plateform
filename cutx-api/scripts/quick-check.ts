import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Tous les catalogues
  const catalogues = await prisma.catalogue.findMany({
    include: { _count: { select: { panels: true } } }
  });

  console.log('📚 CATALOGUES EN BASE:');
  catalogues.forEach(c => {
    console.log(`  - ${c.name} (${c.slug}): ${c._count.panels} panneaux`);
  });

  // Total global
  const total = await prisma.panel.count();
  console.log('\n📊 TOTAL GLOBAL:', total, 'panneaux');

  // Stock status
  const enStock = await prisma.panel.count({ where: { stockStatus: 'EN STOCK' } });
  const surCommande = await prisma.panel.count({ where: { stockStatus: 'Sur commande' } });
  const nullStock = await prisma.panel.count({ where: { stockStatus: null } });
  const otherStock = await prisma.panel.count({
    where: {
      stockStatus: { not: null },
      NOT: [
        { stockStatus: 'EN STOCK' },
        { stockStatus: 'Sur commande' }
      ]
    }
  });

  console.log('\n📦 RÉPARTITION STOCK:');
  console.log(`  - EN STOCK: ${enStock}`);
  console.log(`  - Sur commande: ${surCommande}`);
  console.log(`  - NULL: ${nullStock}`);
  console.log(`  - Autres valeurs: ${otherStock}`);

  // Échantillon des valeurs de stock
  const samples = await prisma.panel.findMany({
    select: { stockStatus: true },
    distinct: ['stockStatus'],
    take: 20
  });
  console.log('\n📋 Valeurs uniques de stockStatus:');
  samples.forEach(s => console.log(`  - "${s.stockStatus}"`));

  await prisma.$disconnect();
}

check();
