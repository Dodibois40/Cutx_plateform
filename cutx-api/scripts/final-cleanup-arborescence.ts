/**
 * Script: Nettoyage final de l'arborescence
 *
 * Ce script:
 * 1. Fusionne les doublons de PDT Bois Massif
 * 2. Nettoie les vieilles catégories Placage X
 * 3. Réorganise Panneaux Décors
 *
 * Usage: npx ts-node scripts/final-cleanup-arborescence.ts
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

async function mergeCategoryBySlug(
  sourceSlug: string,
  targetSlug: string,
  catalogueId: string
): Promise<void> {
  const source = await prisma.category.findFirst({
    where: { slug: sourceSlug, catalogueId },
    include: { children: true, _count: { select: { panels: true } } },
  });

  const target = await prisma.category.findFirst({
    where: { slug: targetSlug, catalogueId },
  });

  if (!source) return;
  if (!target) {
    console.log(`   ⚪ Cible "${targetSlug}" non trouvée`);
    return;
  }

  console.log(
    `   📦 "${source.name}" (${source.slug}) → "${target.name}" (${target.slug})`
  );

  // Déplacer enfants
  if (source.children.length > 0) {
    await prisma.category.updateMany({
      where: { parentId: source.id },
      data: { parentId: target.id },
    });
    console.log(`      → ${source.children.length} enfants déplacés`);
  }

  // Déplacer panneaux
  if (source._count.panels > 0) {
    await prisma.panel.updateMany({
      where: { categoryId: source.id },
      data: { categoryId: target.id },
    });
    console.log(`      → ${source._count.panels} panneaux déplacés`);
  }

  // Supprimer la source
  await prisma.category.delete({ where: { id: source.id } });
  console.log(`      ✅ Supprimée`);
}

async function deleteCategoryIfEmpty(
  slug: string,
  catalogueId: string
): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { slug, catalogueId },
    include: { children: true, _count: { select: { panels: true } } },
  });

  if (!category) return;

  if (category.children.length > 0 || category._count.panels > 0) {
    console.log(
      `   ⚠️ "${category.name}" non vide (${category.children.length} enfants, ${category._count.panels} panneaux)`
    );
    return;
  }

  await prisma.category.delete({ where: { id: category.id } });
  console.log(`   ✅ "${category.name}" supprimée (était vide)`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NETTOYAGE FINAL DE L\'ARBORESCENCE');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const catalogueId = await getCatalogueId();

    // 1. Fusionner PDT Bois Massif doublons
    console.log('🔄 1. Fusion des doublons PDT Bois Massif');
    await mergeCategoryBySlug('pdt-bois', 'pdt-bois-massif', catalogueId);

    // 2. Nettoyer les vieux placages sous "Panneaux Plaqués Bois"
    console.log('\n🔄 2. Consolidation des Placages Bois');

    // Placage Chêne → Chêne (plaque-chene)
    await mergeCategoryBySlug('placage-chene', 'plaque-chene', catalogueId);

    // Placage Noyer → Noyer (plaque-noyer)
    await mergeCategoryBySlug('placage-noyer', 'plaque-noyer', catalogueId);

    // Tous les autres placages → Autres Essences
    const autresPlacages = [
      'placage-hetre',
      'placage-merisier',
      'placage-teck',
      'placage-erable',
      'placage-wenge',
      'placage-pin',
      'placage-frene',
      'placages-divers',
    ];

    for (const slug of autresPlacages) {
      await mergeCategoryBySlug(slug, 'plaque-autres-essences', catalogueId);
    }

    // 3. Nettoyer les vieilles catégories sous "Panneaux Décors"
    console.log('\n🔄 3. Consolidation des Panneaux Décors');

    // Les Mélaminés (anciens) → ils sont déjà une bonne structure, on les garde
    // Les Stratifiés HPL → ils sont déjà une bonne structure, on les garde
    // Compacts HPL → reste sous Panneaux Décors pour l'instant

    // 4. Supprimer les catégories vides redondantes
    console.log('\n🔄 4. Suppression des catégories vides');

    // Catégories potentiellement vides à vérifier
    const emptyCandidates = [
      'panneautes',
      '3-plis',
      'lamelles-colles',
      'lc-epicea',
      'lc-chene',
      'lc-hetre',
      'lc-divers',
      '3-plis-epicea',
      '3-plis-chene',
      '3-plis-divers',
    ];

    for (const slug of emptyCandidates) {
      await deleteCategoryIfEmpty(slug, catalogueId);
    }

    // 5. Afficher l'arborescence finale
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   ARBORESCENCE FINALE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const rootCategories = await prisma.category.findMany({
      where: { catalogueId, parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
                _count: { select: { panels: true } },
              },
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

    function printTree(cat: any, level = 0): void {
      const indent = '│  '.repeat(level);
      const prefix = level === 0 ? '' : '├── ';
      const childCount = cat.children?.length || 0;
      const panelCount = cat._count?.panels || 0;

      let info = '';
      if (childCount > 0 && panelCount > 0) {
        info = ` [${childCount} sous-cat, ${panelCount} panneaux]`;
      } else if (childCount > 0) {
        info = ` [${childCount} sous-cat]`;
      } else if (panelCount > 0) {
        info = ` [${panelCount} panneaux]`;
      }

      console.log(`${indent}${prefix}${cat.name}${info}`);

      if (cat.children) {
        for (const child of cat.children) {
          printTree(child, level + 1);
        }
      }
    }

    for (const root of rootCategories) {
      console.log(`\n🌳 ${root.name}`);
      for (const child of root.children) {
        printTree(child, 1);
      }
    }

    // Statistiques finales
    const totalCategories = await prisma.category.count({ where: { catalogueId } });
    const totalPanels = await prisma.panel.count({ where: { catalogueId } });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`   Total: ${totalCategories} catégories, ${totalPanels} panneaux`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
