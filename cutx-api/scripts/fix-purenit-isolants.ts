import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CORRECTION: DÉPLACER PURENIT VERS ISOLANTS ===\n');

  // 1. Trouver ou créer la catégorie "Isolants"
  let isolants = await prisma.category.findFirst({
    where: { slug: 'isolants' }
  });

  if (!isolants) {
    // Chercher la catégorie "Panneaux Spéciaux" comme parent
    const panneauxSpeciaux = await prisma.category.findFirst({
      where: { slug: 'panneaux-speciaux' }
    });

    if (panneauxSpeciaux) {
      isolants = await prisma.category.create({
        data: {
          name: 'Isolants',
          slug: 'isolants',
          parentId: panneauxSpeciaux.id,
          catalogueId: panneauxSpeciaux.catalogueId
        }
      });
      console.log(`✓ Catégorie "Isolants" créée sous "Panneaux Spéciaux"`);
    } else {
      console.log('✗ Catégorie "Panneaux Spéciaux" non trouvée');
      return;
    }
  } else {
    console.log(`Catégorie "Isolants" existe déjà (${isolants.id})`);
  }

  // 2. Trouver les panneaux Purenit
  const purenit = await prisma.panel.findMany({
    where: {
      OR: [
        { name: { contains: 'purenit', mode: 'insensitive' } },
        { name: { contains: 'polyuréthane', mode: 'insensitive' } },
        { name: { contains: 'polyurethane', mode: 'insensitive' } }
      ]
    },
    select: { id: true, reference: true, name: true }
  });

  console.log(`\nPanneaux Purenit/Polyuréthane trouvés: ${purenit.length}`);

  // 3. Déplacer vers Isolants
  if (purenit.length > 0) {
    const result = await prisma.panel.updateMany({
      where: {
        id: { in: purenit.map(p => p.id) }
      },
      data: {
        categoryId: isolants.id,
        productType: 'PANNEAU_ISOLANT' // Corriger aussi le productType
      }
    });

    console.log(`\n✓ ${result.count} panneaux déplacés vers "Isolants"`);

    // Afficher les panneaux déplacés
    console.log('\nPanneaux déplacés:');
    for (const p of purenit) {
      console.log(`  ${p.reference} | ${p.name?.substring(0, 50)}`);
    }
  }

  // 4. Vérification
  const isolantsCount = await prisma.panel.count({
    where: { categoryId: isolants.id }
  });
  console.log(`\nVérification: "Isolants" contient maintenant ${isolantsCount} panneaux`);

  await prisma.$disconnect();
}

main().catch(console.error);
