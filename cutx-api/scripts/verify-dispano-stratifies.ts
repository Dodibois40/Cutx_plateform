import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dispano = await prisma.catalogue.findFirst({ where: { slug: 'dispano' } });
  if (!dispano) {
    console.log('Catalogue Dispano non trouvé');
    return;
  }

  // Stats stratifiés HPL
  const total = await prisma.panel.count({
    where: { catalogueId: dispano.id, productType: 'STRATIFIE', reference: { startsWith: 'DISP-STR-' } }
  });

  const withPrice = await prisma.panel.count({
    where: { catalogueId: dispano.id, productType: 'STRATIFIE', reference: { startsWith: 'DISP-STR-' }, pricePerM2: { not: null } }
  });

  const withDimensions = await prisma.panel.count({
    where: { catalogueId: dispano.id, productType: 'STRATIFIE', reference: { startsWith: 'DISP-STR-' }, defaultLength: { gt: 0 } }
  });

  console.log('═'.repeat(60));
  console.log('📦 STRATIFIÉS DISPANO - VÉRIFICATION INTÉGRATION');
  console.log('═'.repeat(60));
  console.log(`\nTotal stratifiés HPL (DISP-STR-*): ${total}`);
  console.log(`Avec prix: ${withPrice} (${Math.round(withPrice/total*100)}%)`);
  console.log(`Avec dimensions: ${withDimensions} (${Math.round(withDimensions/total*100)}%)`);

  // Samples
  const samples = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      productType: 'STRATIFIE',
      reference: { startsWith: 'DISP-STR-' }
    },
    take: 5,
    select: {
      reference: true,
      name: true,
      thickness: true,
      defaultLength: true,
      defaultWidth: true,
      pricePerM2: true,
      decor: true,
      stockStatus: true,
      metadata: true,
    }
  });

  console.log('\n📋 Exemples de produits:');
  samples.forEach((s, i) => {
    const meta = s.metadata ? JSON.parse(s.metadata) : {};
    console.log(`\n[${i+1}] ${s.reference}`);
    console.log(`    Nom: ${(s.name || '').substring(0, 55)}`);
    console.log(`    Dimensions: ${s.defaultLength}x${s.defaultWidth}mm, ép: ${s.thickness?.[0] || 'N/A'}mm`);
    console.log(`    Prix: ${s.pricePerM2 ? s.pricePerM2 + '€/m²' : 'N/A'}`);
    console.log(`    Marque: ${meta.marque || 'N/A'}`);
    console.log(`    Décor: ${s.decor || 'N/A'}`);
  });

  // Test API search
  console.log('\n═'.repeat(60));
  console.log('🔍 TEST: Recherche "chene halifax stratifié"');
  const search = await prisma.panel.findMany({
    where: {
      catalogueId: dispano.id,
      productType: 'STRATIFIE',
      name: { contains: 'halifax', mode: 'insensitive' }
    },
    take: 3,
    select: { reference: true, name: true, pricePerM2: true }
  });
  search.forEach(s => {
    console.log(`   ${s.reference}: ${s.name?.substring(0, 45)}... | ${s.pricePerM2}€`);
  });

  console.log('\n═'.repeat(60));
  await prisma.$disconnect();
}

main().catch(console.error);
