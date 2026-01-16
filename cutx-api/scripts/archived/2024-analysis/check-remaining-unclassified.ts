import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({
    where: { isActive: true, panelType: null },
    select: {
      reference: true,
      name: true,
      productType: true,
      defaultThickness: true,
      defaultWidth: true,
      defaultLength: true,
    },
    take: 50,
  });

  console.log('=== PANNEAUX NON CLASSIFIES RESTANTS ===\n');
  console.log(`Total: ${await prisma.panel.count({ where: { isActive: true, panelType: null } })}\n`);

  panels.forEach((p, i) => {
    console.log(`${i + 1}. [${(p.productType || 'NULL').padEnd(15)}] ${p.reference}`);
    console.log(`   Nom: ${p.name.substring(0, 60)}`);
    console.log(`   Dims: ${p.defaultWidth}x${p.defaultLength} ep.${p.defaultThickness || '?'}mm`);
    console.log('');
  });

  await prisma.$disconnect();
}

main();
