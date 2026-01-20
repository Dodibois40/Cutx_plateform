/**
 * Script: Déplacement des catégories racines orphelines sous Panneaux
 *
 * Usage: npx ts-node scripts/move-orphaned-roots.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Les seules catégories autorisées à la racine
const ALLOWED_ROOT_SLUGS = [
  'panneaux',
  'plans-de-travail',
  'feuilles-placages',
  'chants',
];

// Mapping des catégories orphelines vers leur destination
const MIGRATION_MAP: Record<string, string> = {
  'ciment-bois': 'panneaux-speciaux', // Sous Panneaux Spéciaux
  'panneaux-3-plis': 'bois-massif', // Sous Bois Massif
  'panneaux-alveolaires': 'panneaux-speciaux', // Sous Panneaux Spéciaux (alvéolaire existe déjà)
  'panneaux-decoratifs': 'panneaux-decors', // Fusionner avec Panneaux Décors
  'panneaux-isolants': 'panneaux-speciaux', // Sous Panneaux Spéciaux
  'panneaux-lattes': 'panneaux-bruts', // Sous Panneaux Bruts (latté existe déjà)
  'panneaux-muraux': 'panneaux', // Il existe déjà un "Panneaux Muraux" sous Panneaux
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
  console.log('   DÉPLACEMENT DES CATÉGORIES RACINES ORPHELINES');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const catalogueId = await getCatalogueId();

    // Trouver toutes les catégories racines non autorisées
    const orphanedRoots = await prisma.category.findMany({
      where: {
        catalogueId,
        parentId: null,
        slug: { notIn: ALLOWED_ROOT_SLUGS },
      },
      include: {
        children: true,
        _count: { select: { panels: true } },
      },
      orderBy: { name: 'asc' },
    });

    console.log(`📦 ${orphanedRoots.length} catégories orphelines à traiter:\n`);

    for (const orphan of orphanedRoots) {
      console.log(
        `\n🔄 "${orphan.name}" (${orphan.slug}) - ${orphan._count.panels} panneaux`
      );

      const targetSlug = MIGRATION_MAP[orphan.slug];

      if (!targetSlug) {
        console.log(`   ⚠️ Pas de destination définie, déplacé sous "Panneaux"`);
        const panneaux = await prisma.category.findFirst({
          where: { slug: 'panneaux', catalogueId },
        });

        if (panneaux) {
          await prisma.category.update({
            where: { id: orphan.id },
            data: { parentId: panneaux.id },
          });
          console.log(`   ✅ Déplacé sous "Panneaux"`);
        }
        continue;
      }

      // Chercher la destination
      const target = await prisma.category.findFirst({
        where: { slug: targetSlug, catalogueId },
      });

      if (!target) {
        console.log(`   ⚠️ Destination "${targetSlug}" non trouvée`);
        continue;
      }

      // Pour les cas de fusion (même nom/slug similaire existe déjà)
      if (
        orphan.slug === 'panneaux-muraux' ||
        orphan.slug === 'panneaux-decoratifs'
      ) {
        // Fusionner les panneaux vers la catégorie existante et supprimer
        if (orphan._count.panels > 0) {
          await prisma.panel.updateMany({
            where: { categoryId: orphan.id },
            data: { categoryId: target.id },
          });
          console.log(`   → ${orphan._count.panels} panneaux déplacés vers "${target.name}"`);
        }

        // Déplacer les enfants
        if (orphan.children.length > 0) {
          await prisma.category.updateMany({
            where: { parentId: orphan.id },
            data: { parentId: target.id },
          });
          console.log(`   → ${orphan.children.length} enfants déplacés`);
        }

        await prisma.category.delete({ where: { id: orphan.id } });
        console.log(`   ✅ Fusionné avec "${target.name}" et supprimé`);
      } else {
        // Simple déplacement sous le parent
        await prisma.category.update({
          where: { id: orphan.id },
          data: { parentId: target.id },
        });
        console.log(`   ✅ Déplacé sous "${target.name}"`);
      }
    }

    // Vérification finale
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   VÉRIFICATION FINALE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const finalRoots = await prisma.category.findMany({
      where: { catalogueId, parentId: null },
      select: {
        name: true,
        slug: true,
        _count: { select: { children: true, panels: true } },
      },
      orderBy: { name: 'asc' },
    });

    console.log('Catégories racines finales:\n');
    for (const r of finalRoots) {
      const isAllowed = ALLOWED_ROOT_SLUGS.includes(r.slug);
      const status = isAllowed ? '✅' : '⚠️';
      console.log(
        `${status} ${r.name} (${r.slug}) - ${r._count.children} sous-cat, ${r._count.panels} panneaux`
      );
    }

    const total = await prisma.category.count({ where: { catalogueId } });
    console.log(`\nTotal: ${total} catégories`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
