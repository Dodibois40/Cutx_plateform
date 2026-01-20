const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const withCategory = await prisma.panel.count({
    where: { categoryId: { not: null } }
  });
  console.log('Panneaux avec categoryId:', withCategory);
  
  const chantsAbs = await prisma.category.findFirst({
    where: { slug: 'chants-abs' }
  });
  
  if (chantsAbs) {
    const count = await prisma.panel.count({
      where: { categoryId: chantsAbs.id }
    });
    console.log('Panneaux dans chants-abs:', count);
  }
  
  const samples = await prisma.panel.findMany({
    where: { categoryId: { not: null } },
    take: 5,
    select: { reference: true, categoryId: true }
  });
  console.log('Exemples:', JSON.stringify(samples, null, 2));
  
  await prisma.$disconnect();
}

check().catch(console.error);
