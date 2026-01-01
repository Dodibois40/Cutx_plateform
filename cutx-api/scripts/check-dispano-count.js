const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dispanoCatalogue = await prisma.catalogue.findFirst({
    where: { name: { contains: 'Dispano' } }
  });

  if (!dispanoCatalogue) {
    console.log('Catalogue Dispano non trouvé');
    return;
  }

  console.log('Catalogue:', dispanoCatalogue.name, '(ID:', dispanoCatalogue.id, ')');

  const totalPanels = await prisma.panel.count({
    where: { catalogueId: dispanoCatalogue.id }
  });
  console.log('\n✅ Total panneaux Dispano:', totalPanels);

  // Par productType
  const byProductType = await prisma.panel.groupBy({
    by: ['productType'],
    where: { catalogueId: dispanoCatalogue.id },
    _count: true
  });
  console.log('\nPar productType:');
  byProductType.forEach(c => console.log('  -', c.productType || 'null', ':', c._count));

  // Échantillon de panneaux
  const samplePanels = await prisma.panel.findMany({
    where: { catalogueId: dispanoCatalogue.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { name: true, reference: true, prixM2: true, epaisseur: true }
  });
  console.log('\n10 derniers panneaux ajoutés:');
  samplePanels.forEach(p => {
    const price = p.prixM2 ? `${p.prixM2}€/m²` : 'N/A';
    const ep = p.epaisseur ? `${p.epaisseur}mm` : '';
    console.log(`  - ${p.reference}: ${p.name.substring(0, 45)}... [${ep}] ${price}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
