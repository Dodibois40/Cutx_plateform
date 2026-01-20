/**
 * Migration : Sortir "Placages" de "Panneaux Décorés"
 * et créer une nouvelle branche niveau 1 "Plaqués Bois"
 *
 * Étapes :
 * 1. Créer "Plaqués Bois" comme catégorie niveau 1
 * 2. Déplacer toutes les sous-catégories de "Placages" vers "Plaqués Bois"
 * 3. Supprimer l'ancienne catégorie "Placages" (elle sera vide)
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function migrate() {
  console.log('=== MIGRATION : CRÉATION BRANCHE PLAQUÉS BOIS ===\n');

  // 1. Trouver le catalogue CutX (c'est le catalogue partagé)
  const cutx = await prisma.catalogue.findFirst({
    where: { slug: 'cutx' },
    select: { id: true }
  });

  if (!cutx) {
    console.error('❌ Catalogue "cutx" non trouvé !');
    await prisma.$disconnect();
    return;
  }

  console.log('✓ Catalogue CutX trouvé\n');

  // 2. Trouver l'ancienne catégorie "Placages"
  const oldPlacages = await prisma.category.findFirst({
    where: { slug: 'placages' },
    include: {
      children: { select: { id: true, name: true, slug: true } }
    }
  });

  if (!oldPlacages) {
    console.error('❌ Catégorie "placages" non trouvée !');
    await prisma.$disconnect();
    return;
  }

  console.log(`✓ Ancienne catégorie "Placages" trouvée (ID: ${oldPlacages.id})`);
  console.log(`  ${oldPlacages.children.length} sous-catégories à déplacer\n`);

  // 3. Créer la nouvelle catégorie "Plaqués Bois" niveau 1
  let plaquesBois = await prisma.category.findFirst({
    where: { slug: 'plaques-bois' }
  });

  if (plaquesBois) {
    console.log('⏭ Catégorie "Plaqués Bois" existe déjà');
  } else {
    plaquesBois = await prisma.category.create({
      data: {
        name: 'Plaqués Bois',
        slug: 'plaques-bois',
        parentId: null, // Niveau 1
        catalogueId: cutx.id,
      }
    });
    console.log('✓ Catégorie "Plaqués Bois" créée (niveau 1)');
  }

  // 4. Déplacer les sous-catégories
  console.log('\n--- DÉPLACEMENT DES SOUS-CATÉGORIES ---\n');

  for (const child of oldPlacages.children) {
    await prisma.category.update({
      where: { id: child.id },
      data: { parentId: plaquesBois.id }
    });
    console.log(`  ✓ ${child.name} (${child.slug}) → Plaqués Bois`);
  }

  // 5. Vérifier qu'il n'y a plus de panneaux dans l'ancienne catégorie
  const remainingPanels = await prisma.panel.count({
    where: { categoryId: oldPlacages.id }
  });

  if (remainingPanels > 0) {
    console.log(`\n⚠️ ${remainingPanels} panneaux restent dans l'ancienne catégorie "Placages"`);
    console.log('   On ne peut pas la supprimer. Ils seront déplacés vers "Placages Divers".');

    const diversCat = await prisma.category.findFirst({
      where: { slug: 'placages-divers' }
    });

    if (diversCat) {
      await prisma.panel.updateMany({
        where: { categoryId: oldPlacages.id },
        data: { categoryId: diversCat.id }
      });
      console.log(`   ✓ ${remainingPanels} panneaux déplacés vers "Placages Divers"`);
    }
  }

  // 6. Supprimer l'ancienne catégorie "Placages"
  await prisma.category.delete({
    where: { id: oldPlacages.id }
  });
  console.log('\n✓ Ancienne catégorie "Placages" supprimée');

  // 7. Afficher la nouvelle structure
  console.log('\n\n=== NOUVELLE STRUCTURE ===\n');

  const newStructure = await prisma.category.findFirst({
    where: { slug: 'plaques-bois' },
    include: {
      children: {
        include: {
          _count: { select: { panels: { where: { isActive: true } } } }
        },
        orderBy: { name: 'asc' }
      }
    }
  });

  if (newStructure) {
    console.log(`📁 ${newStructure.name} (${newStructure.slug})`);
    let total = 0;
    for (const child of newStructure.children) {
      console.log(`   └── ${child.name} (${child.slug}) - ${child._count.panels} panneaux`);
      total += child._count.panels;
    }
    console.log(`\n   Total: ${total} panneaux`);
  }

  // 8. Vérifier "Panneaux Décorés" après migration
  console.log('\n\n=== PANNEAUX DÉCORÉS APRÈS MIGRATION ===\n');

  const decores = await prisma.category.findFirst({
    where: { slug: 'panneaux-decores' },
    include: {
      children: {
        include: {
          _count: { select: { panels: { where: { isActive: true } } } }
        },
        orderBy: { name: 'asc' }
      }
    }
  });

  if (decores) {
    console.log(`📁 ${decores.name}`);
    for (const child of decores.children) {
      console.log(`   └── ${child.name} (${child.slug}) - ${child._count.panels} panneaux`);
    }
  }

  await prisma.$disconnect();
  console.log('\n✅ Migration terminée !');
}

migrate().catch(console.error);
