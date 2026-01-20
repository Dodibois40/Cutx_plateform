import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Compter les Panneau Standard restants
  const genericCount = await prisma.panel.count({
    where: {
      productType: 'MDF',
      name: { contains: 'Panneau Standard' }
    }
  });

  console.log('═══ VÉRIFICATION MDF ═══\n');
  console.log(`Panneaux MDF avec nom générique "Panneau Standard": ${genericCount}`);

  // Voir quelques exemples de panneaux récemment mis à jour
  const recentUpdates = await prisma.panel.findMany({
    where: {
      productType: 'MDF',
      updatedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } // Dernières 10 minutes
    },
    select: { reference: true, name: true, pricePerM2: true, stockStatus: true, imageUrl: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  if (recentUpdates.length > 0) {
    console.log(`\nPanneaux mis à jour récemment (${recentUpdates.length}):`);
    for (const p of recentUpdates) {
      console.log(`\n  ${p.reference}:`);
      console.log(`    Nom: ${p.name?.substring(0, 50)}`);
      console.log(`    Prix: ${p.pricePerM2 ? p.pricePerM2 + '€/m²' : 'N/A'}`);
      console.log(`    Stock: ${p.stockStatus}`);
      console.log(`    Image: ${p.imageUrl ? 'OUI (' + p.imageUrl.substring(0, 40) + '...)' : 'NON'}`);
    }
  } else {
    console.log('\nAucun panneau mis à jour dans les 10 dernières minutes.');
  }

  // Distribution actuelle
  console.log('\n═══ DISTRIBUTION ACTUELLE ═══\n');
  const distribution = await prisma.panel.groupBy({
    by: ['categoryId'],
    where: { productType: 'MDF' },
    _count: true
  });

  const cats = await prisma.category.findMany({
    where: { id: { in: distribution.map(d => d.categoryId).filter(Boolean) as string[] } },
    select: { id: true, slug: true }
  });
  const catMap = new Map(cats.map(c => [c.id, c.slug]));

  for (const d of distribution.sort((a, b) => b._count - a._count)) {
    const slug = d.categoryId ? catMap.get(d.categoryId) || 'UNKNOWN' : 'AUCUNE';
    console.log(`  ${slug.padEnd(25)} ${d._count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
