import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CORRECTION DES CHANTS MAL CLASSÉS ===\n');

  // Trouver la catégorie "Chants Plaqués Bois" ou similaire
  const chantCat = await prisma.category.findFirst({
    where: {
      OR: [
        { name: { contains: 'Chants Plaqués Bois', mode: 'insensitive' } },
        { name: { contains: 'Chant Bois', mode: 'insensitive' } },
        { slug: { contains: 'chant-plaque', mode: 'insensitive' } },
      ]
    }
  });

  // Si pas trouvé, chercher la catégorie parente des chants
  let targetCatId: string;

  if (chantCat) {
    targetCatId = chantCat.id;
    console.log(`Catégorie cible: ${chantCat.name} (${chantCat.id})`);
  } else {
    // Chercher une catégorie "Chants" générique
    const chantParent = await prisma.category.findFirst({
      where: { name: 'Chants' }
    });

    if (chantParent) {
      targetCatId = chantParent.id;
      console.log(`Catégorie cible (parent): Chants (${chantParent.id})`);
    } else {
      console.error('Aucune catégorie de chants trouvée!');
      return;
    }
  }

  // IDs des chants mal classés
  const chantIds = [
    'cmjx17k4c01k7byk0wpxn9lek',
    'cmjx1792g01k3byk07w027sy9',
    'cmjx180gp01kdbyk04lut1ssz',
    'cmjx173np01k1byk07uy1q6uk',
    'cmjx185ta01kfbyk0wlv7l7uz',
    'cmjx17eir01k5byk0tk5j8hkt',
    'cmjx17uxy01kbbyk0g1fxwwyu',
    'cmjx17pmh01k9byk07n5jmdoq',
  ];

  // Mettre à jour
  const result = await prisma.panel.updateMany({
    where: { id: { in: chantIds } },
    data: { categoryId: targetCatId }
  });

  console.log(`\n✅ ${result.count} chants déplacés vers la catégorie de chants`);

  // Vérifier l'état final des placages
  console.log('\n=== ÉTAT FINAL DES CATÉGORIES PLACAGE ===\n');

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
  console.log(`\nTOTAL PLACAGES BOIS: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
