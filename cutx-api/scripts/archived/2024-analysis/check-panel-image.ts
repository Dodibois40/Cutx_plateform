import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Search for panel with reference containing "639 98 40"
  const panel = await prisma.panel.findFirst({
    where: {
      OR: [
        { reference: { contains: '639 98 40' } },
        { reference: { contains: '6399840' } },
        { reference: { contains: '639-98-40' } },
      ]
    },
    select: {
      id: true,
      reference: true,
      name: true,
      imageUrl: true,
      catalogueId: true,
    }
  });

  if (panel) {
    console.log('Panel found:');
    console.log(JSON.stringify(panel, null, 2));
  } else {
    console.log('Panel not found with reference containing "639 98 40"');

    // Try searching by name
    const byName = await prisma.panel.findFirst({
      where: { name: { contains: '639' } },
      select: {
        id: true,
        reference: true,
        name: true,
        imageUrl: true,
      }
    });
    if (byName) {
      console.log('Found by name:', JSON.stringify(byName, null, 2));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
