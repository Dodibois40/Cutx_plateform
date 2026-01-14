import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const panels = await prisma.panel.findMany({
    where: {
      catalogue: { slug: 'bouney' },
      reference: { startsWith: 'BCB-79' },
    },
    select: { reference: true, name: true },
    orderBy: { reference: 'asc' },
  });

  console.log('All BCB-79xxx panels in Bouney:');
  panels.forEach(p => console.log(`  ${p.reference}: ${p.name.substring(0, 60)}`));

  await prisma.$disconnect();
}
main();
