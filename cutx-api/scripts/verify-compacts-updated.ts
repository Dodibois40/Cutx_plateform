import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Vérification des compacts mis à jour...\n');

  const compacts = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-PDT-' },
      productType: 'COMPACT'
    },
    select: {
      reference: true,
      name: true,
      manufacturerRef: true,
      supplierCode: true,
      decorCode: true,
      colorChoice: true,
      certification: true,
    },
    take: 10
  });

  console.log(`📊 Échantillon de 10 compacts:\n`);

  const withData = compacts.filter(p => p.manufacturerRef || p.colorChoice);
  const withoutData = compacts.filter(p => !p.manufacturerRef && !p.colorChoice);

  console.log(`✅ Avec données: ${withData.length}/10`);
  console.log(`❌ Sans données: ${withoutData.length}/10\n`);

  if (withData.length > 0) {
    console.log('✅ Échantillon AVEC données:\n');
    withData.slice(0, 5).forEach(p => {
      const shortName = p.name ? p.name.substring(0, 50) : '';
      console.log(`${p.reference}: ${shortName}`);
      console.log(`  manufacturerRef: ${p.manufacturerRef || 'NULL'}`);
      console.log(`  colorChoice: ${p.colorChoice || 'NULL'}`);
      console.log(`  certification: ${p.certification || 'NULL'}`);
      console.log('');
    });
  }

  if (withoutData.length > 0) {
    console.log('❌ Échantillon SANS données:\n');
    withoutData.slice(0, 3).forEach(p => {
      const shortName = p.name ? p.name.substring(0, 50) : '';
      console.log(`${p.reference}: ${shortName}`);
      console.log('');
    });
  }

  // Vérifier le total dans toute la DB
  const totalCompacts = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-PDT-' },
      productType: 'COMPACT'
    }
  });

  const totalWithData = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-PDT-' },
      productType: 'COMPACT',
      manufacturerRef: { not: null }
    }
  });

  console.log('\n📊 STATISTIQUES GLOBALES:');
  console.log(`Total compacts: ${totalCompacts}`);
  console.log(`Avec manufacturerRef: ${totalWithData}`);
  console.log(`Sans manufacturerRef: ${totalCompacts - totalWithData}`);
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
