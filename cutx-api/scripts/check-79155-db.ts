import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check if BCB-79155 exists
  const p79155 = await prisma.panel.findFirst({
    where: { reference: 'BCB-79155' },
    select: { reference: true, name: true, pricePerM2: true, stockStatus: true }
  });
  console.log('BCB-79155 in DB:', p79155 ? 'YES' : 'NO');
  if (p79155) console.log(JSON.stringify(p79155, null, 2));

  // Count Bouney panels
  const bouney = await prisma.catalogue.findFirst({ where: { slug: 'bouney' } });
  const count = await prisma.panel.count({ where: { catalogueId: bouney?.id } });
  console.log('\nTotal Bouney panels:', count);

  // Check similar refs
  const similar = await prisma.panel.findMany({
    where: { reference: { startsWith: 'BCB-79' } },
    select: { reference: true, name: true },
    take: 10
  });
  console.log('\nRefs starting with BCB-79:');
  similar.forEach(p => console.log('  ', p.reference, '-', p.name?.substring(0, 50)));

  await prisma.$disconnect();
}
main().catch(console.error);
