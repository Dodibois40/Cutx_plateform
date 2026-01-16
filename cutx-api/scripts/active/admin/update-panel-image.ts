import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const panelId = process.argv[2];
  const imageUrl = process.argv[3];

  if (!panelId || !imageUrl) {
    console.error('Usage: npx ts-node scripts/update-panel-image.ts <panelId> <imageUrl>');
    process.exit(1);
  }

  const panel = await prisma.panel.update({
    where: { id: panelId },
    data: { imageUrl },
    select: { id: true, reference: true, name: true, imageUrl: true },
  });

  console.log('✅ Panel updated:');
  console.log(JSON.stringify(panel, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
