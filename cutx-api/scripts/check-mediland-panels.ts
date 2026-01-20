import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== RECHERCHE PANNEAUX MDF ===\n');

  // Chercher les panneaux par référence
  const refs = ['BCB-72943', 'BCB-86610', 'BOUNEY-72943', 'BOUNEY-86610'];
  for (const ref of refs) {
    const panel = await prisma.panel.findFirst({
      where: { reference: ref },
      select: {
        reference: true,
        name: true,
        productType: true,
        thickness: true,
        defaultLength: true,
        defaultWidth: true,
        metadata: true
      }
    });
    if (panel) {
      console.log(`${ref}:`);
      console.log(`  Nom: ${panel.name}`);
      console.log(`  Dims: ${panel.thickness?.[0]}mm ${panel.defaultLength}x${panel.defaultWidth}`);
      console.log(`  Metadata: ${JSON.stringify(panel.metadata)}`);
    }
  }

  // Voir tous les MDF "Standard" actuels pour comprendre le problème
  console.log('\n=== MDF STANDARD ACTUELS (échantillon) ===\n');
  const mdfStandard = await prisma.panel.findMany({
    where: {
      productType: 'MDF',
      name: { startsWith: 'MDF Standard' }
    },
    select: { reference: true, name: true, metadata: true },
    take: 20,
    orderBy: { reference: 'asc' }
  });

  console.log(`Total trouvés: ${mdfStandard.length}`);
  for (const m of mdfStandard) {
    console.log(`  ${m.reference}: ${m.name}`);
  }

  // Chercher les MDF avec Mediland dans le nom
  console.log('\n=== MDF MEDILAND ===\n');
  const mediland = await prisma.panel.findMany({
    where: {
      productType: 'MDF',
      name: { contains: 'Mediland', mode: 'insensitive' }
    },
    select: { reference: true, name: true },
    take: 20
  });

  console.log(`Mediland trouvés: ${mediland.length}`);
  for (const m of mediland) {
    console.log(`  ${m.reference}: ${m.name}`);
  }

  // Voir tous les noms distincts de MDF pour comprendre les gammes
  console.log('\n=== NOMS MDF UNIQUES (prefixes) ===\n');
  const allMdf = await prisma.panel.findMany({
    where: { productType: 'MDF' },
    select: { name: true }
  });

  const prefixes = new Map<string, number>();
  for (const m of allMdf) {
    // Extraire le premier mot du nom
    const firstWord = m.name?.split(' ')[0] || 'Unknown';
    prefixes.set(firstWord, (prefixes.get(firstWord) || 0) + 1);
  }

  // Trier par count
  const sorted = [...prefixes.entries()].sort((a, b) => b[1] - a[1]);
  for (const [prefix, count] of sorted.slice(0, 20)) {
    console.log(`  ${prefix}: ${count}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
