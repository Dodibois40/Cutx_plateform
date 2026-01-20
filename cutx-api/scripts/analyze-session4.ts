import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  // 1. Essences ABS bois les plus fréquentes
  const absChants = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      OR: [
        { decorCategory: 'BOIS' },
        { name: { contains: 'oak', mode: 'insensitive' } },
        { name: { contains: 'chêne', mode: 'insensitive' } },
        { name: { contains: 'noyer', mode: 'insensitive' } },
        { name: { contains: 'walnut', mode: 'insensitive' } },
        { name: { contains: 'frêne', mode: 'insensitive' } },
        { name: { contains: 'hêtre', mode: 'insensitive' } }
      ]
    },
    select: { name: true, decor: true }
  });

  const essences: Record<string, number> = { chene: 0, noyer: 0, frene: 0, erable: 0, hetre: 0, merisier: 0, teck: 0 };
  for (const c of absChants) {
    const n = (c.name + ' ' + (c.decor || '')).toLowerCase();
    if (/chêne|chene|oak/.test(n)) essences.chene++;
    if (/noyer|walnut/.test(n)) essences.noyer++;
    if (/frêne|frene|ash/.test(n)) essences.frene++;
    if (/érable|erable|maple/.test(n)) essences.erable++;
    if (/hêtre|hetre|beech/.test(n)) essences.hetre++;
    if (/merisier|cherry/.test(n)) essences.merisier++;
    if (/teck|teak/.test(n)) essences.teck++;
  }

  console.log('=== ESSENCES ABS BOIS ===');
  Object.entries(essences)
    .sort((a, b) => b[1] - a[1])
    .forEach(([e, c]) => console.log(`  ${e}: ${c}`));

  // 2. Dimensions du bellato gris
  const bellato = await prisma.panel.findFirst({
    where: { reference: 'BCB-XM' },
    select: { name: true, thickness: true, description: true, defaultLength: true, defaultWidth: true }
  });
  console.log('\n=== BELLATO GRIS #7 ===');
  console.log(JSON.stringify(bellato, null, 2));

  // 3. Compter feuilles vs panneaux stratifiés
  const thinStrats = await prisma.panel.count({
    where: {
      productType: 'STRATIFIE',
      thickness: { hasSome: [0.7, 0.8, 0.9, 1, 1.2] }
    }
  });
  const thickStrats = await prisma.panel.count({
    where: {
      productType: 'STRATIFIE',
      thickness: { hasSome: [10, 12, 16, 18, 19, 22, 25] }
    }
  });

  console.log('\n=== STRATIFIÉS ===');
  console.log(`Feuilles (0.7-1.2mm): ${thinStrats}`);
  console.log(`Panneaux (10mm+): ${thickStrats}`);

  // 4. Nuxe - vérifier la référence
  const nuxe = await prisma.panel.findFirst({
    where: { reference: 'BCB-ESS-105896' },
    select: { name: true, productType: true, description: true, decor: true, material: true }
  });
  console.log('\n=== NUXE #8 ===');
  console.log(JSON.stringify(nuxe, null, 2));

  await prisma.$disconnect();
}

analyze().catch(console.error);
