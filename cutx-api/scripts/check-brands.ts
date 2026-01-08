import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bouney = await prisma.catalogue.findUnique({ where: { slug: 'bouney' } });
  if (!bouney) {
    console.log('Bouney not found');
    return;
  }

  const brands = ['nebodesign', 'pfleiderer', 'polyrey', 'fenix', 'formica', 'unilin', 'rehau', 'rauvisio'];

  console.log('=== Panneaux STRATIFIE par marque chez Bouney ===\n');

  for (const brand of brands) {
    const count = await prisma.panel.count({
      where: {
        catalogueId: bouney.id,
        reference: { startsWith: 'BCB-' },
        productType: 'STRATIFIE',
        name: { contains: brand, mode: 'insensitive' },
      },
    });
    console.log(`${brand.padEnd(15)} : ${count}`);
  }

  // Total STRATIFIE restant
  const totalStratifie = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'STRATIFIE',
    },
  });
  console.log('\nTotal STRATIFIE restant:', totalStratifie);

  // Total MELAMINE actuel
  const totalMelamine = await prisma.panel.count({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'MELAMINE',
    },
  });
  console.log('Total MELAMINE actuel:', totalMelamine);

  // Sample de quelques panneaux STRATIFIE pour voir les noms
  console.log('\n=== Exemples de panneaux STRATIFIE restants ===');
  const samples = await prisma.panel.findMany({
    where: {
      catalogueId: bouney.id,
      reference: { startsWith: 'BCB-' },
      productType: 'STRATIFIE',
    },
    select: { reference: true, name: true },
    take: 20,
  });
  samples.forEach(p => console.log(`  ${p.reference} | ${p.name?.slice(0, 60)}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
