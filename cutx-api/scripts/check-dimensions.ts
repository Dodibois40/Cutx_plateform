/**
 * Vérification rapide des dimensions des panneaux
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Produits BCB avec dimensions
  const bcbWithDim = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      AND: [
        { defaultLength: { gt: 0 } },
        { defaultWidth: { gt: 0 } }
      ]
    }
  });

  // Produits BCB sans dimensions
  const bcbWithoutDim = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      OR: [
        { defaultLength: 0 },
        { defaultWidth: 0 }
      ]
    }
  });

  // Total BCB
  const totalBcb = await prisma.panel.count({
    where: { reference: { startsWith: 'BCB-' } }
  });

  console.log('📊 PANNEAUX BCB:');
  console.log('   Total:', totalBcb);
  console.log('   Avec dimensions L+W:', bcbWithDim);
  console.log('   Sans dimensions:', bcbWithoutDim);
  console.log('   Taux de succès:', ((bcbWithDim / totalBcb) * 100).toFixed(1) + '%');

  // Quelques exemples sans dimensions
  console.log('\n📋 Exemples sans dimensions:');
  const samples = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      OR: [{ defaultLength: 0 }, { defaultWidth: 0 }]
    },
    select: { reference: true, name: true, material: true },
    take: 10
  });
  samples.forEach(p => console.log('  -', p.reference, ':', p.name, `(${p.material})`));

  // Quelques exemples avec dimensions
  console.log('\n✅ Exemples avec dimensions:');
  const samplesWithDim = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      defaultLength: { gt: 0 },
      defaultWidth: { gt: 0 }
    },
    select: { reference: true, name: true, defaultLength: true, defaultWidth: true },
    take: 10
  });
  samplesWithDim.forEach(p => console.log(`  - ${p.reference}: ${p.defaultLength}x${p.defaultWidth}mm`));

  await prisma.$disconnect();
}

main();
