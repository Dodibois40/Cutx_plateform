import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 BRIEFING CATALOGUE DISPANO');
  console.log('='.repeat(60));

  const dispano = await prisma.catalogue.findUnique({
    where: { slug: 'dispano' }
  });

  if (!dispano) {
    console.log('❌ Catalogue Dispano non trouvé');
    return;
  }

  const total = await prisma.panel.count({ where: { catalogueId: dispano.id } });
  console.log(`\n📊 Total panneaux Dispano: ${total}`);

  // Par type de produit
  const byType = await prisma.panel.groupBy({
    by: ['productType'],
    where: { catalogueId: dispano.id },
    _count: { _all: true }
  });

  console.log('\n🏷️  Par type de produit:');
  byType.sort((a, b) => b._count._all - a._count._all);
  byType.forEach(t => console.log(`   - ${t.productType || 'N/A'}: ${t._count._all}`));

  // Par matériau
  const byMaterial = await prisma.panel.groupBy({
    by: ['material'],
    where: { catalogueId: dispano.id },
    _count: { _all: true }
  });

  console.log('\n🪵 Par matériau/support:');
  byMaterial.sort((a, b) => b._count._all - a._count._all);
  byMaterial.slice(0, 10).forEach(m => console.log(`   - ${m.material || 'N/A'}: ${m._count._all}`));

  // Par finish
  const byFinish = await prisma.panel.groupBy({
    by: ['finish'],
    where: { catalogueId: dispano.id },
    _count: { _all: true }
  });

  console.log('\n✨ Par finition:');
  byFinish.sort((a, b) => b._count._all - a._count._all);
  byFinish.slice(0, 10).forEach(f => console.log(`   - ${f.finish || 'N/A'}: ${f._count._all}`));

  // Par décor
  const byDecor = await prisma.panel.groupBy({
    by: ['decor'],
    where: { catalogueId: dispano.id },
    _count: { _all: true }
  });

  console.log('\n🎨 Par décor (top 15):');
  byDecor.sort((a, b) => b._count._all - a._count._all);
  byDecor.slice(0, 15).forEach(d => console.log(`   - ${d.decor || 'N/A'}: ${d._count._all}`));

  // Extraire les marques depuis metadata
  const panelsWithMeta = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      metadata: { not: null }
    },
    select: { metadata: true }
  });

  const brandCounts: Record<string, number> = {};
  panelsWithMeta.forEach(p => {
    try {
      const meta = JSON.parse(p.metadata || '{}');
      const brand = meta.marque || 'Sans marque';
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    } catch (e) {}
  });

  console.log('\n🏭 Top marques (depuis metadata):');
  Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([brand, count]) => console.log(`   - ${brand}: ${count}`));

  // Quelques exemples
  const samples = await prisma.panel.findMany({
    where: { catalogueId: dispano.id },
    take: 5,
    select: {
      reference: true,
      name: true,
      productType: true,
      pricePerM2: true,
      metadata: true
    }
  });

  console.log('\n📋 Exemples de produits:');
  samples.forEach(s => {
    const price = s.pricePerM2 ? `${s.pricePerM2.toFixed(2)}€/m²` : 'N/A';
    let brand = '';
    try {
      const meta = JSON.parse(s.metadata || '{}');
      brand = meta.marque || '';
    } catch (e) {}
    console.log(`   - [${s.reference}] ${s.name.substring(0, 40)}... | ${brand} | ${price}`);
  });

  // Comparaison avec Bouney
  const bouney = await prisma.panel.count({ where: { catalogue: { slug: 'bouney' } } });

  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARAISON CATALOGUES:');
  console.log(`   📌 Dispano: ${total} panneaux`);
  console.log(`   📌 Bouney: ${bouney} panneaux`);
  console.log(`   📌 TOTAL: ${total + bouney} panneaux`);
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
