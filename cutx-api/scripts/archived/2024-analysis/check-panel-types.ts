import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const kerrock = await prisma.panel.findFirst({
    where: { reference: 'BCB-PDT-76731' },
    select: { reference: true, name: true, productType: true, material: true, defaultLength: true, defaultWidth: true, defaultThickness: true }
  });

  const compact = await prisma.panel.findFirst({
    where: { manufacturerRef: 'F2253' },
    select: { reference: true, name: true, productType: true, material: true, defaultLength: true, defaultWidth: true, defaultThickness: true }
  });

  console.log('=== KERROCK (BCB-PDT-76731) ===');
  console.log(JSON.stringify(kerrock, null, 2));

  console.log('\n=== COMPACT (F2253) ===');
  console.log(JSON.stringify(compact, null, 2));

  // Test densités actuelles
  const densities: Record<string, number> = {
    COMPACT: 1400,
    STRATIFIE: 1400,
    MDF: 750,
    MELAMINE: 650,
    AGGLO_BRUT: 650,
    CONTREPLAQUE: 550,
    OSB: 600,
    MASSIF: 700,
    PLACAGE: 600,
  };

  if (kerrock) {
    const density = densities[kerrock.productType || ''] || 650;
    const weight = (kerrock.defaultLength! / 1000) * (kerrock.defaultWidth! / 1000) * (kerrock.defaultThickness! / 1000) * density;
    console.log('\n📊 KERROCK - Calcul actuel:');
    console.log(`   productType: ${kerrock.productType || 'NULL'}`);
    console.log(`   Densité utilisée: ${density} kg/m³`);
    console.log(`   Poids calculé: ${weight.toFixed(1)} kg`);
  }

  if (compact) {
    const density = densities[compact.productType || ''] || 650;
    const weight = (compact.defaultLength! / 1000) * (compact.defaultWidth! / 1000) * (compact.defaultThickness! / 1000) * density;
    console.log('\n📊 COMPACT - Calcul actuel:');
    console.log(`   productType: ${compact.productType || 'NULL'}`);
    console.log(`   Densité utilisée: ${density} kg/m³`);
    console.log(`   Poids calculé: ${weight.toFixed(1)} kg`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
