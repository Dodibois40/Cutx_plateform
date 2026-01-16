import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Search for contrebalancement products
  console.log('🔍 Searching for contrebalancement products...\n');

  const panels = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'contrebalancement', mode: 'insensitive' } },
        { name: { contains: 'contre-balancement', mode: 'insensitive' } },
        { name: { contains: 'contreba', mode: 'insensitive' } },
      ],
    },
    include: {
      catalogue: { select: { name: true, slug: true } },
    },
  });

  console.log(`Found ${panels.length} contrebalancement panels:`);
  panels.forEach(p => {
    console.log(`  - ${p.catalogue.name}: ${p.reference} - ${p.name.substring(0, 60)}`);
  });

  // Also search for "stratifié" products in Bouney around reference 79xxx
  console.log('\n🔍 Searching for stratifié in Bouney...');
  const stratifies = await prisma.panel.findMany({
    where: {
      catalogue: { slug: 'bouney' },
      name: { contains: 'stratifié', mode: 'insensitive' },
    },
    select: { reference: true, name: true },
    take: 10,
  });

  console.log(`Found ${stratifies.length} stratifié panels in Bouney:`);
  stratifies.forEach(p => {
    console.log(`  - ${p.reference}: ${p.name.substring(0, 50)}`);
  });

  // Check if we have any 79xxx references at all
  console.log('\n🔍 All Bouney refs starting with 79...');
  const refs79 = await prisma.panel.findMany({
    where: {
      catalogue: { slug: 'bouney' },
      reference: { contains: '79' },
    },
    select: { reference: true },
    orderBy: { reference: 'asc' },
    take: 20,
  });
  console.log(`Found ${refs79.length}:`, refs79.map(r => r.reference).join(', '));

  await prisma.$disconnect();
}
main();
