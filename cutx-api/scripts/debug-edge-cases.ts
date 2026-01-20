/**
 * Debug des cas limites avant exécution
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('=== VÉRIFICATION DES CAS LIMITES ===\n');

  // 1. Check peuplier → cintrable
  const peuplierCat = await prisma.category.findFirst({ where: { slug: 'cp-peuplier' } });
  if (peuplierCat) {
    const cintrables = await prisma.panel.findMany({
      where: {
        categoryId: peuplierCat.id,
        isActive: true,
        name: { contains: 'cintr', mode: 'insensitive' },
      },
      select: { name: true },
    });
    console.log('Panneaux peuplier qui contiennent "cintrable":');
    for (const p of cintrables) {
      console.log('  ' + p.name.substring(0, 60));
    }
    console.log(`  Total: ${cintrables.length}`);
  }

  // 2. Check abs-unis → mélaminé
  console.log('\n--- ABS vers Mélaminé ---');
  const absUnisCat = await prisma.category.findFirst({ where: { slug: 'abs-unis' } });
  if (absUnisCat) {
    const melas = await prisma.panel.findMany({
      where: {
        categoryId: absUnisCat.id,
        isActive: true,
        name: { contains: 'mélamin', mode: 'insensitive' },
      },
      select: { name: true, productType: true },
      take: 10,
    });
    console.log('Panneaux abs-unis qui contiennent "mélaminé":');
    for (const p of melas) {
      console.log(`  [${p.productType}] ${p.name.substring(0, 50)}`);
    }
  }

  // 3. Check "Panneau Mélaminé" in chants categories
  console.log('\n--- Panneaux nommés "Panneau Mélaminé" dans catégories chants ---');
  const chantsCategories = await prisma.category.findMany({
    where: { slug: { startsWith: 'chant' } },
  });
  const absCats = await prisma.category.findMany({
    where: { slug: { startsWith: 'abs-' } },
  });
  const allChantCatIds = [...chantsCategories, ...absCats].map((c) => c.id);

  const panneauMelamine = await prisma.panel.findMany({
    where: {
      categoryId: { in: allChantCatIds },
      isActive: true,
      name: { startsWith: 'Panneau Mélaminé' },
    },
    select: {
      name: true,
      productType: true,
      category: { select: { slug: true } },
    },
    take: 10,
  });
  console.log(`Trouvés: ${panneauMelamine.length}`);
  for (const p of panneauMelamine) {
    console.log(`  [${p.productType}] ${p.category?.slug} | ${p.name.substring(0, 40)}`);
  }

  // 4. MDF ignifuge → hydrofuge
  console.log('\n--- MDF ignifuge qui seraient hydrofuge ---');
  const mdfIgnifugeCat = await prisma.category.findFirst({ where: { slug: 'mdf-ignifuge' } });
  if (mdfIgnifugeCat) {
    const hydroInIgni = await prisma.panel.findMany({
      where: {
        categoryId: mdfIgnifugeCat.id,
        isActive: true,
        isHydrofuge: true,
      },
      select: { name: true, isHydrofuge: true, isIgnifuge: true },
    });
    console.log('Panneaux mdf-ignifuge avec isHydrofuge=true:');
    for (const p of hydroInIgni) {
      console.log(`  ${p.name.substring(0, 50)} | hydro=${p.isHydrofuge} igni=${p.isIgnifuge}`);
    }
  }

  await prisma.$disconnect();
}

check().catch(console.error);
