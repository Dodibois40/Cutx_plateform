import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Données extraites des liens
const panelUpdates = [
  {
    id: 'cmjtw6hvu02hdbylw1emu6kq8',
    reference: 'BCB-74477',
    newData: {
      name: 'Stratifié T086 EXM Polyrey Textus gris',
      description: 'Stratifié Polyrey Textus Gris - Finition EXM - PEFC 70%',
      manufacturer: 'Polyrey',
      decorCode: 'T086',
      decorName: 'Textus gris',
      finishCode: 'EXM',
      productType: 'Stratifié',
    }
  },
  {
    id: 'cmjtw6cio02c5bylw9y21d167',
    reference: 'BCB-84468',
    newData: {
      name: 'Stratifié F417 ST10 Egger Textile gris',
      description: 'Stratifié Egger Textile Gris - Finition ST10 - PEFC 70%',
      manufacturer: 'Egger',
      decorCode: 'F417',
      decorName: 'Textile gris',
      finishCode: 'ST10',
      productType: 'Stratifié',
    }
  }
];

async function main() {
  // Trouver la catégorie destination "Strat Textile"
  const destCategory = await prisma.category.findFirst({
    where: {
      OR: [
        { name: { contains: 'Strat Textile', mode: 'insensitive' } },
        { slug: { contains: 'strat-textile', mode: 'insensitive' } },
        { name: { contains: 'Textile', mode: 'insensitive' } }
      ]
    },
    select: { id: true, name: true, slug: true }
  });

  if (!destCategory) {
    console.log('❌ Catégorie "Strat Textile" non trouvée!');
    // Chercher toutes les catégories Strat*
    const stratCategories = await prisma.category.findMany({
      where: { name: { startsWith: 'Strat', mode: 'insensitive' } },
      select: { id: true, name: true, slug: true }
    });
    console.log('\nCatégories Strat* disponibles:');
    stratCategories.forEach(c => console.log(`  - ${c.name} (${c.slug})`));
    return;
  }

  console.log(`✅ Catégorie destination: ${destCategory.name} (${destCategory.id})`);

  // Mettre à jour chaque panneau
  for (const update of panelUpdates) {
    console.log(`\n--- Traitement: ${update.reference} ---`);

    const panel = await prisma.panel.findUnique({
      where: { id: update.id },
      select: { id: true, reference: true, name: true, categoryId: true }
    });

    if (!panel) {
      console.log(`❌ Panneau ${update.id} non trouvé`);
      continue;
    }

    console.log(`Avant: ${panel.name}`);

    await prisma.panel.update({
      where: { id: update.id },
      data: {
        ...update.newData,
        categoryId: destCategory.id,
        verificationNote: null, // Effacer la note une fois traité
        reviewStatus: 'VERIFIE'
      }
    });

    console.log(`Après: ${update.newData.name}`);
    console.log(`→ Déplacé vers: ${destCategory.name}`);
  }

  console.log('\n✅ Mise à jour terminée!');

  // Vérification
  const remaining = await prisma.panel.count({
    where: {
      category: { name: { contains: 'vérifier', mode: 'insensitive' } }
    }
  });
  console.log(`\nPanneaux restants à vérifier: ${remaining}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
