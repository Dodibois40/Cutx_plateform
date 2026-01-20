import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== RÉASSIGNATION DES PLACAGES RESTANTS ===\n');

  // Récupérer les catégories cibles
  const placageChene = await prisma.category.findFirst({
    where: { name: 'Placage Chêne' }
  });
  const placageAutres = await prisma.category.findFirst({
    where: { name: 'Placage Autres essences' }
  });

  if (!placageChene || !placageAutres) {
    console.error('Catégories cibles non trouvées!');
    return;
  }

  console.log(`Placage Chêne: ${placageChene.id}`);
  console.log(`Placage Autres essences: ${placageAutres.id}\n`);

  // 1. Querkus Flex (chêne) - sont des placages chêne fins
  const querkusFlex = await prisma.panel.findMany({
    where: {
      AND: [
        { name: { contains: 'querkus flex', mode: 'insensitive' } },
        { thickness: { hasSome: [0.6, 0.8, 1] } }
      ]
    },
    select: { id: true, reference: true, name: true }
  });

  console.log(`\n=== QUERKUS FLEX → Placage Chêne (${querkusFlex.length}) ===`);
  for (const p of querkusFlex) {
    await prisma.panel.update({
      where: { id: p.id },
      data: { categoryId: placageChene.id }
    });
    console.log(`✅ ${p.reference}: ${p.name.substring(0, 50)}`);
  }

  // 2. Décoflex iroko, sycomore, etc. non encore assignés
  const decoflex = await prisma.panel.findMany({
    where: {
      AND: [
        {
          OR: [
            { name: { contains: 'décoflex iroko', mode: 'insensitive' } },
            { name: { contains: 'décoflex sycomore', mode: 'insensitive' } },
            { name: { contains: 'decoflex iroko', mode: 'insensitive' } },
            { name: { contains: 'decoflex sycomore', mode: 'insensitive' } },
          ]
        },
        {
          category: { name: { not: { startsWith: 'Placage' } } }
        }
      ]
    },
    select: { id: true, reference: true, name: true }
  });

  console.log(`\n=== DÉCOFLEX IROKO/SYCOMORE → Placage Autres essences (${decoflex.length}) ===`);
  for (const p of decoflex) {
    await prisma.panel.update({
      where: { id: p.id },
      data: { categoryId: placageAutres.id }
    });
    console.log(`✅ ${p.reference}: ${p.name.substring(0, 50)}`);
  }

  // 3. Nuxe Naturals (placages fins)
  const nuxe = await prisma.panel.findMany({
    where: {
      AND: [
        { name: { contains: 'nuxe', mode: 'insensitive' } },
        { thickness: { hasSome: [0.6, 0.8, 1] } },
        {
          category: { name: { not: { startsWith: 'Placage' } } }
        }
      ]
    },
    select: { id: true, reference: true, name: true }
  });

  console.log(`\n=== NUXE NATURALS → Placage Autres essences (${nuxe.length}) ===`);
  for (const p of nuxe) {
    await prisma.panel.update({
      where: { id: p.id },
      data: { categoryId: placageAutres.id }
    });
    console.log(`✅ ${p.reference}: ${p.name.substring(0, 50)}`);
  }

  // Vérifier l'état final
  console.log('\n\n=== ÉTAT FINAL DES CATÉGORIES PLACAGE ===\n');

  const finalCats = await prisma.category.findMany({
    where: { name: { startsWith: 'Placage' } },
    select: {
      name: true,
      _count: { select: { panels: true } }
    },
    orderBy: { name: 'asc' }
  });

  let total = 0;
  for (const c of finalCats) {
    console.log(`${c.name}: ${c._count.panels} panneaux`);
    total += c._count.panels;
  }
  console.log(`\nTOTAL: ${total} placages bois`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
