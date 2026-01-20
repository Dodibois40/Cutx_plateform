import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check for duplicate PDT Bois Massif
  const pdtBM = await prisma.category.findMany({
    where: { name: { contains: 'PDT Bois Massif' } },
    select: { id: true, name: true, slug: true, createdAt: true },
  });
  console.log('PDT Bois Massif entries:', pdtBM);

  // Get Panneaux Plaqués Bois children
  const ppb = await prisma.category.findFirst({
    where: { slug: 'panneaux-plaques-bois' },
    include: { children: { select: { id: true, name: true, slug: true } } },
  });
  console.log('\nPanneaux Plaqués Bois children:', ppb?.children);
}

main().finally(() => prisma.$disconnect());
