import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-93869' },
  });
  console.log('BCB-93869 data:');
  console.log(JSON.stringify(panel, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
