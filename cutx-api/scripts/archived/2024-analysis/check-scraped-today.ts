import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkToday() {
  console.log('🔍 Vérification des panels créés/MAJ aujourd\'hui...\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const panels = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-PDT-REF-' },
    },
    select: {
      reference: true,
      name: true,
      manufacturerRef: true,
      supplierCode: true,
      colorChoice: true,
      productType: true,
      material: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 20
  });

  console.log(`📊 ${panels.length} panels avec référence générée trouvés\n`);

  panels.forEach((p, idx) => {
    const shortName = p.name ? p.name.substring(0, 45) : '';
    console.log(`${idx + 1}. ${p.reference}`);
    console.log(`   ${shortName}`);
    console.log(`   Type: ${p.productType || 'NULL'} | Material: ${p.material || 'NULL'}`);
    console.log(`   manufacturerRef: ${p.manufacturerRef || 'NULL'}`);
    console.log(`   colorChoice: ${p.colorChoice || 'NULL'}`);
    console.log(`   MAJ: ${p.updatedAt.toISOString()}`);
    console.log('');
  });

  // Vérifier si ce sont des compacts
  const compactCount = panels.filter(p => p.productType === 'COMPACT').length;
  console.log(`\n📊 Panels de type COMPACT: ${compactCount}/${panels.length}`);

  const withManufRef = panels.filter(p => p.manufacturerRef).length;
  console.log(`✅ Avec manufacturerRef: ${withManufRef}/${panels.length}`);
}

checkToday()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
