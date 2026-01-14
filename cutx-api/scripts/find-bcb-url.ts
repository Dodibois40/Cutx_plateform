import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if we have sourceUrl stored for this panel
  const panel = await prisma.panel.findFirst({
    where: { reference: 'BCB-82631' },
  });

  console.log('Panel BCB-82631:');
  console.log(JSON.stringify(panel, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
