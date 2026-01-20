/**
 * Script: Consolidation finale de l'arborescence
 *
 * Ce script fusionne les catégories similaires et supprime les doublons:
 * - "Bois Massifs" → fusionner avec "Bois Massif" (enfants déplacés)
 * - "Panneaux Décorés" → fusionner avec "Panneaux Décors"
 * - "Plaqués Bois" → fusionner avec "Panneaux Plaqués Bois"
 * - Supprimer les catégories orphelines sous "Chants" qui sont hors structure
 * - Nettoyer les doublons dans "Plans de Travail"
 *
 * Usage: npx ts-node scripts/consolidate-arborescence.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getCatalogueId(): Promise<string> {
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'cutx' },
  });

  if (!catalogue) {
    throw new Error('Catalogue "cutx" non trouvé');
  }

  return catalogue.id;
}

async function moveChildrenAndDelete(
  sourceSlug: string,
  targetSlug: string,
  catalogueId: string
): Promise<boolean> {
  const source = await prisma.category.findFirst({
    where: { slug: sourceSlug, catalogueId },
    include: { children: true, _count: { select: { panels: true } } },
  });

  const target = await prisma.category.findFirst({
    where: { slug: targetSlug, catalogueId },
  });

  if (!source) {
    console.log(`   ⚪ Source "${sourceSlug}" non trouvée`);
    return false;
  }

  if (!target) {
    console.log(`   ⚪ Cible "${targetSlug}" non trouvée`);
    return false;
  }

  console.log(
    `   📦 "${source.name}" (${source.children.length} enfants, ${source._count.panels} panneaux)`
  );

  // Déplacer les enfants
  if (source.children.length > 0) {
    await prisma.category.updateMany({
      where: { parentId: source.id },
      data: { parentId: target.id },
    });
    console.log(`   → ${source.children.length} enfants déplacés vers "${target.name}"`);
  }

  // Déplacer les panneaux
  if (source._count.panels > 0) {
    await prisma.panel.updateMany({
      where: { categoryId: source.id },
      data: { categoryId: target.id },
    });
    console.log(`   → ${source._count.panels} panneaux déplacés vers "${target.name}"`);
  }

  // Supprimer la source
  await prisma.category.delete({ where: { id: source.id } });
  console.log(`   ✅ "${source.name}" supprimée`);

  return true;
}

async function moveOrphanedChants(catalogueId: string) {
  // Les chants orphelins directement sous "Chants" qui devraient être sous "Chants ABS"
  const orphanedChantSlugs = ['abs-chene', 'abs-noyer', 'abs-frene', 'abs-hetre'];

  const chantsAbs = await prisma.category.findFirst({
    where: { slug: 'chants-abs', catalogueId },
  });

  if (!chantsAbs) {
    console.log('   ⚪ "Chants ABS" non trouvé');
    return;
  }

  for (const slug of orphanedChantSlugs) {
    const orphan = await prisma.category.findFirst({
      where: { slug, catalogueId },
      include: { _count: { select: { panels: true } } },
    });

    if (orphan) {
      // Déplacer les panneaux vers une sous-catégorie appropriée ou la catégorie parent
      if (orphan._count.panels > 0) {
        await prisma.panel.updateMany({
          where: { categoryId: orphan.id },
          data: { categoryId: chantsAbs.id },
        });
        console.log(`   → ${orphan._count.panels} panneaux de "${orphan.name}" → "Chants ABS"`);
      }

      await prisma.category.delete({ where: { id: orphan.id } });
      console.log(`   ✅ Orphelin "${orphan.name}" supprimé`);
    }
  }
}

async function removeDuplicatePDT(catalogueId: string) {
  // Trouver les doublons de "PDT Bois Massif"
  const pdtBoisMassifs = await prisma.category.findMany({
    where: { slug: 'pdt-bois-massif', catalogueId },
    include: { _count: { select: { panels: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (pdtBoisMassifs.length <= 1) {
    console.log('   ⚪ Pas de doublon "PDT Bois Massif"');
    return;
  }

  // Garder le premier, supprimer les autres
  const [toKeep, ...toRemove] = pdtBoisMassifs;
  console.log(`   📦 Doublon trouvé: ${pdtBoisMassifs.length} "PDT Bois Massif"`);

  for (const dup of toRemove) {
    if (dup._count.panels > 0) {
      await prisma.panel.updateMany({
        where: { categoryId: dup.id },
        data: { categoryId: toKeep.id },
      });
      console.log(`   → ${dup._count.panels} panneaux fusionnés`);
    }
    await prisma.category.delete({ where: { id: dup.id } });
    console.log(`   ✅ Doublon supprimé`);
  }
}

async function removeOrphanedChantsBois(catalogueId: string) {
  // "Chants Bois" devrait être fusionné avec "Chants Plaqués Bois"
  const chantsBois = await prisma.category.findFirst({
    where: { slug: 'chants-bois', catalogueId },
    include: { children: true, _count: { select: { panels: true } } },
  });

  const chantsPlaqueBois = await prisma.category.findFirst({
    where: { slug: 'chants-plaques-bois', catalogueId },
  });

  if (chantsBois && chantsPlaqueBois) {
    // Déplacer enfants
    if (chantsBois.children.length > 0) {
      await prisma.category.updateMany({
        where: { parentId: chantsBois.id },
        data: { parentId: chantsPlaqueBois.id },
      });
      console.log(
        `   → ${chantsBois.children.length} enfants de "Chants Bois" → "Chants Plaqués Bois"`
      );
    }

    // Déplacer panneaux
    if (chantsBois._count.panels > 0) {
      await prisma.panel.updateMany({
        where: { categoryId: chantsBois.id },
        data: { categoryId: chantsPlaqueBois.id },
      });
      console.log(`   → ${chantsBois._count.panels} panneaux fusionnés`);
    }

    await prisma.category.delete({ where: { id: chantsBois.id } });
    console.log(`   ✅ "Chants Bois" fusionné avec "Chants Plaqués Bois"`);
  }
}

async function cleanupSolidSurface(catalogueId: string) {
  // "Solid Surface" devrait être fusionné avec "PDT Solid Surface"
  const solidSurface = await prisma.category.findFirst({
    where: { slug: 'solid-surface', catalogueId },
    include: { children: true, _count: { select: { panels: true } } },
  });

  const pdtSolidSurface = await prisma.category.findFirst({
    where: { slug: 'pdt-solid-surface', catalogueId },
  });

  if (solidSurface && pdtSolidSurface) {
    // Déplacer enfants
    if (solidSurface.children.length > 0) {
      await prisma.category.updateMany({
        where: { parentId: solidSurface.id },
        data: { parentId: pdtSolidSurface.id },
      });
      console.log(
        `   → ${solidSurface.children.length} enfants de "Solid Surface" → "PDT Solid Surface"`
      );
    }

    // Déplacer panneaux
    if (solidSurface._count.panels > 0) {
      await prisma.panel.updateMany({
        where: { categoryId: solidSurface.id },
        data: { categoryId: pdtSolidSurface.id },
      });
    }

    await prisma.category.delete({ where: { id: solidSurface.id } });
    console.log(`   ✅ "Solid Surface" fusionné avec "PDT Solid Surface"`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   CONSOLIDATION DE L\'ARBORESCENCE');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const catalogueId = await getCatalogueId();

    // 1. Fusionner "Bois Massifs" → "Bois Massif"
    console.log('\n🔄 Fusion: Bois Massifs → Bois Massif');
    await moveChildrenAndDelete('bois-massifs', 'bois-massif', catalogueId);

    // 2. Fusionner "Panneaux Décorés" → "Panneaux Décors"
    console.log('\n🔄 Fusion: Panneaux Décorés → Panneaux Décors');
    await moveChildrenAndDelete('panneaux-decores', 'panneaux-decors', catalogueId);

    // 3. Fusionner "Plaqués Bois" → "Panneaux Plaqués Bois"
    console.log('\n🔄 Fusion: Plaqués Bois → Panneaux Plaqués Bois');
    await moveChildrenAndDelete('plaques-bois', 'panneaux-plaques-bois', catalogueId);

    // 4. Nettoyer les chants orphelins
    console.log('\n🔄 Nettoyage: Chants orphelins');
    await moveOrphanedChants(catalogueId);

    // 5. Supprimer doublons PDT Bois Massif
    console.log('\n🔄 Nettoyage: Doublons PDT');
    await removeDuplicatePDT(catalogueId);

    // 6. Fusionner Chants Bois → Chants Plaqués Bois
    console.log('\n🔄 Fusion: Chants Bois → Chants Plaqués Bois');
    await removeOrphanedChantsBois(catalogueId);

    // 7. Fusionner Solid Surface → PDT Solid Surface
    console.log('\n🔄 Fusion: Solid Surface → PDT Solid Surface');
    await cleanupSolidSurface(catalogueId);

    // Afficher le résultat final
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   ARBORESCENCE FINALE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const rootCategories = await prisma.category.findMany({
      where: { catalogueId, parentId: null },
      include: {
        children: {
          include: {
            children: {
              orderBy: { name: 'asc' },
            },
            _count: { select: { panels: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { panels: true } },
      },
      orderBy: { name: 'asc' },
    });

    function printTree(cat: any, level = 0) {
      const indent = '  '.repeat(level);
      const prefix = level === 0 ? '🌳' : level === 1 ? '├──' : '│  ├──';
      const childCount = cat.children?.length || 0;
      const panelCount = cat._count?.panels || 0;
      const stats: string[] = [];
      if (childCount > 0) stats.push(`${childCount} sous-cat`);
      if (panelCount > 0) stats.push(`${panelCount} panneaux`);
      const suffix = stats.length > 0 ? ` (${stats.join(', ')})` : '';
      console.log(`${indent}${prefix} ${cat.name}${suffix}`);

      if (cat.children) {
        for (const child of cat.children) {
          printTree(child, level + 1);
        }
      }
    }

    for (const root of rootCategories) {
      printTree(root);
      console.log('');
    }

    // Statistiques finales
    const totalCategories = await prisma.category.count({ where: { catalogueId } });
    const rootCount = rootCategories.length;

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total: ${totalCategories} catégories, ${rootCount} racines`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
