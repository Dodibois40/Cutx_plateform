import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Compter par startsWith pour éviter les faux positifs
  const firebase = await prisma.panel.count({
    where: { imageUrl: { startsWith: 'https://firebasestorage' }}
  });

  const bcommebois = await prisma.panel.count({
    where: { imageUrl: { startsWith: 'https://www.bcommebois' }}
  });

  const noImage = await prisma.panel.count({
    where: { OR: [{ imageUrl: null }, { imageUrl: '' }] }
  });

  const total = await prisma.panel.count();

  console.log('\n📊 RÉPARTITION DES IMAGES\n');
  console.log(`   🔥 Firebase Storage:  ${firebase}`);
  console.log(`   🌐 bcommebois.fr:     ${bcommebois}`);
  console.log(`   ❌ Sans image:        ${noImage}`);
  console.log(`   📦 Total panneaux:    ${total}\n`);

  await prisma.$disconnect();
}

main();
