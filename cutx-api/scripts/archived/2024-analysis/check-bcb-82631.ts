import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-82631' },
  });

  if (panel) {
    console.log('📋 Panel BCB-82631:\n');
    console.log('   reference:', panel.reference);
    console.log('   name:', panel.name);
    console.log('   productType:', panel.productType);
    console.log('   thickness:', panel.thickness);
    console.log('   defaultThickness:', panel.defaultThickness);
    console.log('   defaultLength:', panel.defaultLength);
    console.log('   defaultWidth:', panel.defaultWidth);
    console.log('   material:', panel.material);
    console.log('   manufacturerRef:', panel.manufacturerRef);
  } else {
    console.log('Panel not found');
  }

  // Check other H1180 chants
  console.log('\n📋 Autres chants H1180 Bouney:\n');
  const chants = await prisma.panel.findMany({
    where: {
      reference: { startsWith: 'BCB-' },
      manufacturerRef: 'H1180',
      productType: 'BANDE_DE_CHANT',
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

  chants.forEach(c => {
    console.log(`   ${c.reference}: thickness=${JSON.stringify(c.thickness)}, defaultThickness=${c.defaultThickness}, L×W=${c.defaultLength}×${c.defaultWidth}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
