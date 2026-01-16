import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check Bouney chants
  console.log('📋 Bandes de chant Bouney H1180:\n');
  const bouneyChants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
      manufacturerRef: 'H1180',
    },
    select: {
      reference: true,
      name: true,
      thickness: true,
      defaultThickness: true,
      defaultLength: true,
      defaultWidth: true,
    },
  });

  bouneyChants.forEach(c => {
    console.log(`   ${c.reference}:`);
    console.log(`      name: ${c.name}`);
    console.log(`      thickness: ${JSON.stringify(c.thickness)}, defaultThickness: ${c.defaultThickness}`);
    console.log(`      defaultLength: ${c.defaultLength}, defaultWidth: ${c.defaultWidth}`);
  });

  // Check Dispano chants for comparison (they have thickness in name)
  console.log('\n📋 Bandes de chant Dispano H1180 (pour comparaison):\n');
  const dispanoChants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'DISP-' },
      productType: 'BANDE_DE_CHANT',
      manufacturerRef: 'H1180',
    },
    select: {
      reference: true,
      name: true,
      thickness: true,
      defaultThickness: true,
      defaultLength: true,
      defaultWidth: true,
    },
  });

  dispanoChants.forEach(c => {
    console.log(`   ${c.reference}:`);
    console.log(`      name: ${c.name}`);
    console.log(`      thickness: ${JSON.stringify(c.thickness)}, defaultThickness: ${c.defaultThickness}`);
  });

  // Check if any BCB chants have thickness
  console.log('\n📊 Stats épaisseurs chants Bouney:\n');
  const withThickness = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
      OR: [
        { defaultThickness: { not: null } },
        { thickness: { isEmpty: false } },
      ],
    },
  });

  const totalChants = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
    },
  });

  console.log(`   Avec épaisseur: ${withThickness}/${totalChants}`);

  // Sample of BCB chants with thickness in name
  console.log('\n📋 Exemples de chants BCB avec épaisseur dans le nom:\n');
  const samples = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      productType: 'BANDE_DE_CHANT',
      name: { contains: 'x' },
    },
    take: 10,
    select: {
      reference: true,
      name: true,
      thickness: true,
      defaultThickness: true,
    },
  });

  samples.forEach(c => {
    console.log(`   ${c.reference}: ${c.name}`);
    console.log(`      thickness: ${JSON.stringify(c.thickness)}, defaultThickness: ${c.defaultThickness}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
