import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function audit() {
  console.log('=== AUDIT CHANTS SANS PRIX ===\n');

  // Chants BCB sans prix
  const bcbWithoutPrice = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      panelType: 'CHANT',
      pricePerMl: null,
      pricePerUnit: null,
    },
    select: {
      reference: true,
      name: true,
      supplierCode: true,
    },
    take: 20,
  });

  const totalBcbChants = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      panelType: 'CHANT',
    },
  });

  const bcbWithPrice = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      panelType: 'CHANT',
      OR: [{ pricePerMl: { not: null } }, { pricePerUnit: { not: null } }],
    },
  });

  console.log('📊 CHANTS BCB:');
  console.log('   Total:', totalBcbChants);
  console.log('   Avec prix:', bcbWithPrice);
  console.log('   Sans prix:', totalBcbChants - bcbWithPrice);

  if (bcbWithoutPrice.length > 0) {
    console.log('\n📦 Exemples de chants BCB sans prix:');
    bcbWithoutPrice.slice(0, 10).forEach((p) => {
      console.log('   -', p.reference, '|', p.name?.substring(0, 40));
    });
  }

  // Stats par préfixe de référence
  console.log('\n📊 PAR TYPE DE RÉFÉRENCE:');

  const prefixes = ['BCB-BOI-CHANT', 'BCB-MEL-', 'BCB-ABS-', 'BCB-QUERKUS-', 'BCB-CHANT-'];
  for (const prefix of prefixes) {
    const total = await prisma.panel.count({
      where: { reference: { startsWith: prefix }, panelType: 'CHANT' },
    });
    const withPrice = await prisma.panel.count({
      where: {
        reference: { startsWith: prefix },
        panelType: 'CHANT',
        OR: [{ pricePerMl: { not: null } }, { pricePerUnit: { not: null } }],
      },
    });
    if (total > 0) {
      console.log(`   ${prefix}*: ${withPrice}/${total} avec prix`);
    }
  }

  await prisma.$disconnect();
}

audit();
