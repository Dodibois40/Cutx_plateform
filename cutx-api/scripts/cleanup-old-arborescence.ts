/**
 * Script: Nettoyage et réorganisation de l'arborescence
 *
 * Ce script:
 * 1. Identifie les anciennes catégories racines qui ne font pas partie de la nouvelle structure
 * 2. Les réorganise sous les nouvelles catégories parents appropriées
 * 3. Supprime les doublons si possible
 *
 * Structure cible:
 * - Panneaux (racine)
 * - Plans de Travail (racine)
 * - Feuilles & Placages (racine)
 * - Chants (racine)
 *
 * Usage: npx ts-node scripts/cleanup-old-arborescence.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Les seules catégories racines autorisées dans la nouvelle structure
const ALLOWED_ROOT_SLUGS = [
  'panneaux',
  'plans-de-travail',
  'feuilles-placages',
  'chants',
];

// Mapping des anciennes catégories vers leur nouveau parent
const MIGRATION_MAP: Record<string, string> = {
  // Les anciennes catégories racines à déplacer
  'bois-massifs': 'panneaux', // Bois Massifs → sous Panneaux
  'panneaux-decores': 'panneaux', // Panneaux Décorés → fusionner avec Panneaux Décors
  'plaques-bois': 'panneaux', // Plaqués Bois → sous Panneaux Plaqués Bois
};

async function getCatalogueId(): Promise<string> {
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'cutx' },
  });

  if (!catalogue) {
    throw new Error('Catalogue "cutx" non trouvé');
  }

  return catalogue.id;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NETTOYAGE DE L\'ARBORESCENCE');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const catalogueId = await getCatalogueId();

    // 1. Identifier les catégories racines actuelles
    const rootCategories = await prisma.category.findMany({
      where: {
        catalogueId,
        parentId: null,
      },
      include: {
        children: true,
        _count: { select: { panels: true } },
      },
      orderBy: { name: 'asc' },
    });

    console.log('📊 Catégories racines actuelles:\n');
    for (const cat of rootCategories) {
      const isAllowed = ALLOWED_ROOT_SLUGS.includes(cat.slug);
      const status = isAllowed ? '✅' : '⚠️';
      console.log(
        `${status} ${cat.name} (${cat.slug}) - ${cat.children.length} enfants, ${cat._count.panels} panneaux`
      );
    }

    // 2. Identifier les catégories à déplacer
    const toMigrate = rootCategories.filter(
      (cat) => !ALLOWED_ROOT_SLUGS.includes(cat.slug)
    );

    console.log(`\n📦 Catégories à réorganiser: ${toMigrate.length}\n`);

    if (toMigrate.length === 0) {
      console.log('✅ Aucune migration nécessaire - arborescence déjà propre!\n');
      return;
    }

    // 3. Effectuer les migrations
    for (const oldCat of toMigrate) {
      console.log(`\n🔄 Traitement de "${oldCat.name}" (${oldCat.slug})...`);

      // Chercher le nouveau parent
      const newParentSlug = MIGRATION_MAP[oldCat.slug];

      if (newParentSlug) {
        const newParent = await prisma.category.findFirst({
          where: { slug: newParentSlug, catalogueId },
        });

        if (newParent) {
          // Déplacer cette catégorie sous le nouveau parent
          await prisma.category.update({
            where: { id: oldCat.id },
            data: { parentId: newParent.id },
          });
          console.log(`   → Déplacé sous "${newParent.name}"`);
        } else {
          console.log(`   ⚠️ Parent "${newParentSlug}" non trouvé`);
        }
      } else {
        // Pas de mapping défini - on le déplace sous "Panneaux" par défaut
        const defaultParent = await prisma.category.findFirst({
          where: { slug: 'panneaux', catalogueId },
        });

        if (defaultParent) {
          await prisma.category.update({
            where: { id: oldCat.id },
            data: { parentId: defaultParent.id },
          });
          console.log(`   → Déplacé sous "Panneaux" (par défaut)`);
        }
      }
    }

    // 4. Vérifier le résultat
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   RÉSULTAT APRÈS NETTOYAGE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const newRootCategories = await prisma.category.findMany({
      where: {
        catalogueId,
        parentId: null,
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
        _count: { select: { panels: true } },
      },
      orderBy: { name: 'asc' },
    });

    console.log('🌲 Nouvelles catégories racines:\n');
    for (const cat of newRootCategories) {
      console.log(`├── ${cat.name} (${cat.children.length} enfants)`);
      for (const child of cat.children) {
        const grandchildCount = child.children?.length || 0;
        console.log(`│   ├── ${child.name} (${grandchildCount} enfants)`);
      }
    }

    console.log('\n✅ Nettoyage terminé!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
