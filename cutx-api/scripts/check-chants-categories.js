const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Catégories pour chants plaqués bois
  const chantsPlaqueBois = await prisma.category.findMany({
    where: {
      OR: [
        { slug: 'chants-plaques-bois' },
        { parent: { slug: 'chants-plaques-bois' } }
      ]
    },
    include: { parent: { select: { slug: true } } }
  });

  console.log('=== CHANTS PLAQUÉS BOIS ===');
  for (const c of chantsPlaqueBois) {
    console.log(c.slug + ' (parent: ' + (c.parent?.slug || 'root') + ')');
  }

  // Catégories pour chants mélaminés
  const chantsMel = await prisma.category.findMany({
    where: {
      OR: [
        { slug: 'chants-melamines' },
        { parent: { slug: 'chants-melamines' } }
      ]
    }
  });

  console.log('\n=== CHANTS MÉLAMINÉS ===');
  for (const c of chantsMel) {
    console.log(c.slug);
  }

  // Catégories pour chants PVC
  const chantsPvc = await prisma.category.findMany({
    where: {
      OR: [
        { slug: 'chants-pvc' },
        { parent: { slug: 'chants-pvc' } }
      ]
    }
  });

  console.log('\n=== CHANTS PVC ===');
  for (const c of chantsPvc) {
    console.log(c.slug);
  }

  // Exemples de chants BOIS non assignés
  console.log('\n=== EXEMPLES CHANTS BOIS (5) ===');
  const chantsBois = await prisma.panel.findMany({
    where: { panelSubType: 'CHANT_BOIS', categoryId: null },
    select: { id: true, name: true, reference: true, decorCategory: true },
    take: 10
  });
  for (const p of chantsBois) {
    console.log(`${p.reference} | ${p.name} | decor: ${p.decorCategory}`);
  }

  // Exemples de chants MELAMINE non assignés
  console.log('\n=== EXEMPLES CHANTS MELAMINE (5) ===');
  const chantsMelamine = await prisma.panel.findMany({
    where: { panelSubType: 'CHANT_MELAMINE', categoryId: null },
    select: { id: true, name: true, reference: true, decorCategory: true },
    take: 10
  });
  for (const p of chantsMelamine) {
    console.log(`${p.reference} | ${p.name} | decor: ${p.decorCategory}`);
  }

  // Exemples de chants PVC non assignés
  console.log('\n=== EXEMPLES CHANTS PVC (3) ===');
  const chantsPVC = await prisma.panel.findMany({
    where: { panelSubType: 'CHANT_PVC', categoryId: null },
    select: { id: true, name: true, reference: true, decorCategory: true },
    take: 5
  });
  for (const p of chantsPVC) {
    console.log(`${p.reference} | ${p.name} | decor: ${p.decorCategory}`);
  }

  // Exemples de BANDE_DE_CHANT sans panelSubType
  console.log('\n=== EXEMPLES BANDE_DE_CHANT sans subType (10) ===');
  const bandesChant = await prisma.panel.findMany({
    where: {
      productType: 'BANDE_DE_CHANT',
      categoryId: null,
      panelSubType: null
    },
    select: { id: true, name: true, reference: true, decorCategory: true },
    take: 10
  });
  for (const p of bandesChant) {
    console.log(`${p.reference} | ${p.name} | decor: ${p.decorCategory}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
