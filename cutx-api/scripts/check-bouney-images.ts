import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBouneyImages() {
  console.log('🔍 Vérification des images Bouney...\n');

  // Total Bouney panels
  const total = await prisma.panel.count({
    where: { reference: { startsWith: 'BCB-' } },
  });

  // Bouney panels with images
  const withImages = await prisma.panel.count({
    where: {
      reference: { startsWith: 'BCB-' },
      imageUrl: { not: null },
    },
  });

  // Bouney panels without images
  const withoutImages = total - withImages;

  console.log(`📊 Panels Bouney:`);
  console.log(`   Total: ${total}`);
  console.log(`   Avec images: ${withImages} (${((withImages / total) * 100).toFixed(1)}%)`);
  console.log(`   Sans images: ${withoutImages} (${((withoutImages / total) * 100).toFixed(1)}%)`);

  // Sample with images
  if (withImages > 0) {
    const sample = await prisma.panel.findMany({
      where: {
        reference: { startsWith: 'BCB-' },
        imageUrl: { not: null },
      },
      take: 5,
      select: { reference: true, name: true, imageUrl: true },
    });

    console.log('\n📋 Exemples avec images:');
    sample.forEach(p => {
      console.log(`   ${p.reference}: ${p.imageUrl}`);
    });
  }

  // Check Dispano for comparison
  const dispanoTotal = await prisma.panel.count({
    where: { reference: { startsWith: 'DISP-' } },
  });
  const dispanoWithImages = await prisma.panel.count({
    where: {
      reference: { startsWith: 'DISP-' },
      imageUrl: { not: null },
    },
  });

  console.log(`\n📊 Panels Dispano (comparaison):`);
  console.log(`   Total: ${dispanoTotal}`);
  console.log(`   Avec images: ${dispanoWithImages} (${((dispanoWithImages / dispanoTotal) * 100).toFixed(1)}%)`);
}

checkBouneyImages().catch(console.error).finally(() => prisma.$disconnect());
