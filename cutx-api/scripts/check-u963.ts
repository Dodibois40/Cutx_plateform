import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({
    where: { name: { contains: 'U963' } },
    select: { reference: true, name: true, thickness: true },
  });

  console.log('U963 panels:');
  panels.forEach(p => {
    console.log(`${p.reference}: thickness=${JSON.stringify(p.thickness)} - ${p.name.substring(0, 70)}`);
  });

  await prisma.$disconnect();
}

main();
