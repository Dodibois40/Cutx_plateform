import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panel = await prisma.panel.findFirst({
    where: { reference: { contains: '4800739' } },
    select: {
      id: true,
      reference: true,
      name: true,
      description: true,
      productType: true,
      defaultLength: true,
      defaultWidth: true,
      isVariableLength: true,
      supportQuality: true,
      thickness: true,
    }
  });
  console.log('Panel 4800739:');
  console.log(JSON.stringify(panel, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
