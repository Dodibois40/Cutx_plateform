/**
 * Verify chants quality - are they really chants?
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== VÉRIFICATION DE LA QUALITÉ DES BANDE_DE_CHANT ===\n');

  // Get a sample with full details
  const samples = await prisma.panel.findMany({
    where: { productType: 'BANDE_DE_CHANT', isActive: true },
    select: {
      id: true,
      name: true,
      reference: true,
      manufacturerRef: true,
      thickness: true,
      category: {
        select: {
          slug: true,
          name: true,
          parent: { select: { slug: true, name: true } },
        },
      },
      catalogue: { select: { name: true } },
    },
    take: 30,
  });

  console.log('30 premiers BANDE_DE_CHANT:\n');

  for (const p of samples) {
    const catPath = p.category?.parent?.slug
      ? `${p.category.parent.slug}/${p.category.slug}`
      : p.category?.slug || 'null';

    const isLikelyChant =
      (p.name && p.name.toLowerCase().includes('chant')) ||
      (p.reference && p.reference.toLowerCase().includes('chant')) ||
      (p.manufacturerRef && p.manufacturerRef.toLowerCase().includes('chant')) ||
      (p.thickness && Array.isArray(p.thickness) && p.thickness.some((t) => t <= 3)); // Chants are usually thin

    const marker = isLikelyChant ? '✅' : '❓';

    console.log(`${marker} [${p.catalogue?.name}] ${catPath}`);
    console.log(`   name: ${p.name?.substring(0, 50) || '-'}`);
    console.log(`   ref: ${p.reference || '-'}`);
    const thicknessStr = Array.isArray(p.thickness) ? p.thickness.join(', ') : '-';
    console.log(`   thickness: ${thicknessStr}mm`);
    console.log('');
  }

  // Statistics on thickness
  console.log('\n=== STATISTIQUES D\'ÉPAISSEUR ===\n');

  const thicknessGroups = await prisma.panel.groupBy({
    by: ['thickness'],
    where: { productType: 'BANDE_DE_CHANT', isActive: true },
    _count: true,
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('Épaisseurs des BANDE_DE_CHANT:');
  for (const g of thicknessGroups.slice(0, 15)) {
    console.log(`  ${g.thickness ?? 'null'}mm: ${g._count}`);
  }

  // Count ones with "chant" in name/ref
  const withChantInName = await prisma.panel.count({
    where: {
      productType: 'BANDE_DE_CHANT',
      isActive: true,
      OR: [
        { name: { contains: 'chant', mode: 'insensitive' } },
        { reference: { contains: 'chant', mode: 'insensitive' } },
        { manufacturerRef: { contains: 'chant', mode: 'insensitive' } },
      ],
    },
  });

  console.log(`\nChants avec "chant" dans le nom/ref: ${withChantInName} / 2586`);

  await prisma.$disconnect();
}

main().catch(console.error);
