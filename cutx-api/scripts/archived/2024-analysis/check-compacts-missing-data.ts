import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCompacts() {
  console.log('🔍 Vérification des plans de travail compacts Bouney...\n');

  const allCompacts = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-PDT-' },
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
  });

  const total = allCompacts.length;
  console.log('📊 Total plans de travail trouvés:', total, '\n');

  const missingData = allCompacts.filter(p => 
    !p.manufacturerRef || !p.supplierCode || !p.decorCode || !p.colorChoice
  );

  const missingCount = missingData.length;
  const completeCount = total - missingCount;

  console.log('❌ Avec données manquantes:', missingCount);
  console.log('✅ Avec données complètes:', completeCount, '\n');

  if (missingCount > 0) {
    console.log('🔴 Panels avec données manquantes:\n');
    missingData.forEach(p => {
      console.log(p.reference + ':', p.name);
      console.log('  manufacturerRef:', p.manufacturerRef || 'NULL');
      console.log('  supplierCode:', p.supplierCode || 'NULL');
      console.log('  decorCode:', p.decorCode || 'NULL');
      console.log('  colorChoice:', p.colorChoice || 'NULL');
      console.log('  certification:', p.certification || 'NULL');
      console.log('');
    });
  }

  const complete = allCompacts.filter(p => 
    p.manufacturerRef && p.supplierCode && p.decorCode && p.colorChoice
  );

  if (complete.length > 0) {
    console.log('✅ Échantillon avec données complètes (3 premiers):\n');
    complete.slice(0, 3).forEach(p => {
      console.log(p.reference + ':', p.name);
      console.log('  manufacturerRef:', p.manufacturerRef);
      console.log('  supplierCode:', p.supplierCode);
      console.log('');
    });
  }
}

checkCompacts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
