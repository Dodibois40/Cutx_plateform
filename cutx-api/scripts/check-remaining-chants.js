const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const remaining = await prisma.panel.findMany({
    where: {
      categoryId: null,
      OR: [
        { productType: 'CHANT' },
        { productType: 'BANDE_DE_CHANT' },
        { panelSubType: { in: ['CHANT_ABS', 'CHANT_PVC', 'CHANT_MELAMINE', 'CHANT_BOIS'] } }
      ]
    },
    select: { id: true, name: true, reference: true, productType: true, panelSubType: true }
  });

  console.log('=== CHANTS NON ASSIGNÉS (' + remaining.length + ') ===');
  for (const p of remaining) {
    console.log(p.reference + ' | ' + p.productType + ' | ' + p.panelSubType + ' | ' + p.name.substring(0, 50));
  }

  await prisma.$disconnect();
}
main();
