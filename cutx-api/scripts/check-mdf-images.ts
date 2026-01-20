import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== ANALYSE IMAGES MDF ===\n');

  // MDF sans images
  const noImage = await prisma.panel.findMany({
    where: {
      productType: 'MDF',
      OR: [
        { imageUrl: null },
        { imageUrl: '' }
      ]
    },
    select: { reference: true, name: true, imageUrl: true },
    orderBy: { reference: 'asc' }
  });

  // MDF avec images
  const withImage = await prisma.panel.count({
    where: {
      productType: 'MDF',
      imageUrl: { not: null },
      NOT: { imageUrl: '' }
    }
  });

  const total = noImage.length + withImage;

  console.log(`Total MDF: ${total}`);
  console.log(`  Avec image: ${withImage} (${Math.round(withImage/total*100)}%)`);
  console.log(`  Sans image: ${noImage.length} (${Math.round(noImage.length/total*100)}%)`);

  // Par catalogue
  const bcb = noImage.filter(p => p.reference.startsWith('BCB-'));
  const disp = noImage.filter(p => p.reference.startsWith('DISP-'));
  const other = noImage.filter(p => !p.reference.startsWith('BCB-') && !p.reference.startsWith('DISP-'));

  console.log('\nSans image par catalogue:');
  console.log(`  BCB: ${bcb.length}`);
  console.log(`  Dispano: ${disp.length}`);
  console.log(`  Autres: ${other.length}`);

  console.log('\n=== BCB SANS IMAGE ===\n');
  for (const p of bcb.slice(0, 20)) {
    console.log(`  ${p.reference}: ${p.name?.substring(0, 60)}`);
  }

  if (bcb.length > 20) {
    console.log(`  ... et ${bcb.length - 20} autres`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
