import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const panels = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-BOI-' } },
    select: { reference: true, supplierCode: true, imageUrl: true, pricePerMl: true },
    take: 10
  });

  console.log('Exemples de chants BCB-BOI:');
  panels.forEach(p => {
    console.log('  Ref: ' + p.reference);
    console.log('    supplierCode: ' + p.supplierCode);
    console.log('    imageUrl: ' + (p.imageUrl || 'null'));
    console.log('    pricePerMl: ' + p.pricePerMl);
    console.log('');
  });

  await prisma.$disconnect();
}

check();
