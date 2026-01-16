import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countMissingDimensions() {
  console.log('🔍 Analyse des plans de travail - Dimensions manquantes\n');

  // Total de plans de travail
  const allPlansTravail = await prisma.panel.findMany({
    where: {
      OR: [
        { productType: 'PLAN_DE_TRAVAIL' },
        { material: 'Plan de travail' },
        { material: 'Plan de travail compact' },
        { category: { name: { contains: 'Plans de travail' } } },
      ],
    },
    select: {
      reference: true,
      name: true,
      defaultLength: true,
      defaultWidth: true,
      defaultThickness: true,
      productType: true,
      material: true,
      supplierCode: true,
    },
  });

  console.log(`📊 Total plans de travail: ${allPlansTravail.length}\n`);

  // Filtrer ceux sans dimensions
  const withoutDimensions = allPlansTravail.filter(p =>
    !p.defaultLength || !p.defaultWidth || !p.defaultThickness
  );

  const withDimensions = allPlansTravail.filter(p =>
    p.defaultLength && p.defaultWidth && p.defaultThickness
  );

  console.log(`✅ Avec dimensions complètes: ${withDimensions.length}`);
  console.log(`❌ Sans dimensions complètes: ${withoutDimensions.length}`);
  console.log(`📈 Taux incomplet: ${((withoutDimensions.length / allPlansTravail.length) * 100).toFixed(1)}%\n`);

  if (withoutDimensions.length > 0) {
    console.log('🚨 Exemples sans dimensions:\n');
    withoutDimensions.slice(0, 10).forEach((p, idx) => {
      const shortName = p.name.substring(0, 60);
      console.log(`${idx + 1}. ${p.reference}`);
      console.log(`   ${shortName}`);
      console.log(`   Type: ${p.productType || 'NULL'} | Material: ${p.material || 'NULL'}`);
      console.log(`   SupplierCode: ${p.supplierCode || 'NULL'}`);
      console.log(`   L: ${p.defaultLength || 'NULL'} | W: ${p.defaultWidth || 'NULL'} | T: ${p.defaultThickness || 'NULL'}`);
      console.log('');
    });

    if (withoutDimensions.length > 10) {
      console.log(`   ... et ${withoutDimensions.length - 10} autres\n`);
    }
  }

  // Grouper par productType
  const byType: Record<string, number> = {};
  withoutDimensions.forEach(p => {
    const type = p.productType || 'NULL';
    byType[type] = (byType[type] || 0) + 1;
  });

  console.log('📊 Plans sans dimensions par productType:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
}

countMissingDimensions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
