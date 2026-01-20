/**
 * Script: RESET COMPLET de l'arborescence
 *
 * Ce script:
 * 1. Supprime TOUTES les catégories existantes
 * 2. Recrée l'arborescence EXACTE selon la spécification
 *
 * Structure cible:
 * 1. Panneaux
 * 2. Plans de Travail
 * 3. Feuilles & Placages
 * 4. Chants
 *
 * Usage: npx ts-node scripts/reset-arborescence-complete.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CategoryNode {
  name: string;
  slug: string;
  children?: CategoryNode[];
}

// ARBORESCENCE EXACTE selon la spécification du client
const ARBORESCENCE: CategoryNode[] = [
  {
    name: 'Panneaux',
    slug: 'panneaux',
    children: [
      {
        name: 'Panneaux Décors',
        slug: 'panneaux-decors',
        children: [
          { name: 'Décors Unis', slug: 'decors-unis' },
          { name: 'Décors Bois', slug: 'decors-bois' },
          { name: 'Décors Pierre/Béton', slug: 'decors-pierre-beton' },
          { name: 'Décors Métal', slug: 'decors-metal' },
          { name: 'Décors Fantaisie', slug: 'decors-fantaisie' },
          { name: 'Compacts HPL', slug: 'compacts-hpl' },
          { name: 'Fenix', slug: 'fenix' },
          { name: 'Cleaf', slug: 'cleaf' },
        ],
      },
      {
        name: 'Panneaux Plaqués Bois',
        slug: 'panneaux-plaques-bois',
        children: [
          { name: 'Chêne', slug: 'plaque-chene' },
          { name: 'Noyer', slug: 'plaque-noyer' },
          { name: 'Frêne', slug: 'plaque-frene' },
          { name: 'Hêtre', slug: 'plaque-hetre' },
          { name: 'Érable', slug: 'plaque-erable' },
          { name: 'Merisier', slug: 'plaque-merisier' },
          { name: 'Teck', slug: 'plaque-teck' },
          { name: 'Wengé', slug: 'plaque-wenge' },
          { name: 'Pin', slug: 'plaque-pin' },
          { name: 'Autres essences', slug: 'plaque-autres-essences' },
        ],
      },
      {
        name: 'Panneaux Bruts',
        slug: 'panneaux-bruts',
        children: [
          {
            name: 'MDF',
            slug: 'mdf',
            children: [
              { name: 'MDF Standard', slug: 'mdf-standard' },
              { name: 'MDF Hydrofuge', slug: 'mdf-hydrofuge' },
              { name: 'MDF Ignifuge', slug: 'mdf-ignifuge' },
              { name: 'MDF Teinté/Couleurs', slug: 'mdf-teinte-couleurs' },
              { name: 'MDF à Laquer', slug: 'mdf-a-laquer' },
              { name: 'MDF Léger', slug: 'mdf-leger' },
            ],
          },
          {
            name: 'Aggloméré',
            slug: 'agglomere',
            children: [
              { name: 'Agglo Standard', slug: 'agglo-standard' },
              { name: 'Agglo Hydrofuge', slug: 'agglo-hydrofuge' },
              { name: 'Agglo Ignifuge', slug: 'agglo-ignifuge' },
              { name: 'Agglo Dalles', slug: 'agglo-dalles' },
            ],
          },
          {
            name: 'OSB',
            slug: 'osb',
            children: [
              { name: 'OSB Standard', slug: 'osb-standard' },
              { name: 'OSB Hydrofuge', slug: 'osb-hydrofuge' },
            ],
          },
          {
            name: 'Latté',
            slug: 'latte',
            children: [
              { name: 'Latté Standard', slug: 'latte-standard' },
              { name: 'Latté Léger', slug: 'latte-leger' },
            ],
          },
        ],
      },
      {
        name: 'Contreplaqués',
        slug: 'contreplaques',
        children: [
          { name: 'CP Marine (CTBX)', slug: 'cp-marine-ctbx' },
          { name: 'CP Filmé', slug: 'cp-filme' },
          { name: 'CP Cintrable', slug: 'cp-cintrable' },
          { name: 'CP Antidérapant', slug: 'cp-antiderapant' },
          { name: 'CP Bouleau', slug: 'cp-bouleau' },
          { name: 'CP Okoumé', slug: 'cp-okoume' },
          { name: 'CP Peuplier', slug: 'cp-peuplier' },
          { name: 'CP Pin Maritime', slug: 'cp-pin-maritime' },
          { name: 'CP Exotique', slug: 'cp-exotique' },
        ],
      },
      {
        name: 'Panneaux Bois Massif',
        slug: 'panneaux-bois-massif',
        children: [
          {
            name: 'Lamellé-Collé',
            slug: 'lamelle-colle',
            children: [
              { name: 'LC Abouté Épicéa', slug: 'lc-aboute-epicea' },
              { name: 'LC Abouté Chêne', slug: 'lc-aboute-chene' },
              { name: 'LC Abouté Hêtre', slug: 'lc-aboute-hetre' },
              { name: 'LC Non Abouté Chêne', slug: 'lc-non-aboute-chene' },
              { name: 'LC Divers', slug: 'lc-divers' },
            ],
          },
          {
            name: '3 Plis',
            slug: '3-plis',
            children: [
              { name: '3 Plis Épicéa', slug: '3-plis-epicea' },
              { name: '3 Plis Chêne', slug: '3-plis-chene' },
              { name: '3 Plis Divers', slug: '3-plis-divers' },
            ],
          },
          { name: 'Panneautés', slug: 'panneautes' },
        ],
      },
      {
        name: 'Panneaux Muraux',
        slug: 'panneaux-muraux',
        children: [
          { name: 'Muraux Acoustiques', slug: 'muraux-acoustiques' },
          { name: 'Muraux Étanches', slug: 'muraux-etanches' },
          { name: 'Muraux Décoratifs', slug: 'muraux-decoratifs' },
        ],
      },
      {
        name: 'Panneaux Spéciaux',
        slug: 'panneaux-speciaux',
        children: [
          { name: 'Alvéolaires', slug: 'alveolaires' },
          { name: 'Isolants', slug: 'isolants' },
          { name: 'Ciment-Bois', slug: 'ciment-bois' },
        ],
      },
    ],
  },
  {
    name: 'Plans de Travail',
    slug: 'plans-de-travail',
    children: [
      { name: 'PDT Bois Massif', slug: 'pdt-bois-massif' },
      { name: 'PDT Compacts', slug: 'pdt-compacts' },
      { name: 'PDT Stratifiés', slug: 'pdt-stratifies' },
      {
        name: 'PDT Solid Surface',
        slug: 'pdt-solid-surface',
        children: [
          { name: 'Corian', slug: 'corian' },
          { name: 'Autres Solid Surface', slug: 'autres-solid-surface' },
        ],
      },
    ],
  },
  {
    name: 'Feuilles & Placages',
    slug: 'feuilles-placages',
    children: [
      {
        name: 'Feuilles Stratifiées',
        slug: 'feuilles-stratifiees',
        children: [
          { name: 'Strat Unis', slug: 'strat-unis' },
          { name: 'Strat Bois', slug: 'strat-bois' },
          { name: 'Strat Pierre/Métal', slug: 'strat-pierre-metal' },
          { name: 'Strat Fantaisie', slug: 'strat-fantaisie' },
        ],
      },
      {
        name: 'Placages Bois',
        slug: 'placages-bois',
        children: [
          { name: 'Placage Chêne', slug: 'placage-chene' },
          { name: 'Placage Noyer', slug: 'placage-noyer' },
          { name: 'Placage Frêne', slug: 'placage-frene' },
          { name: 'Placage Hêtre', slug: 'placage-hetre' },
          { name: 'Placage Autres essences', slug: 'placage-autres-essences' },
        ],
      },
    ],
  },
  {
    name: 'Chants',
    slug: 'chants',
    children: [
      {
        name: 'Chants ABS',
        slug: 'chants-abs',
        children: [
          { name: 'ABS Unis', slug: 'abs-unis' },
          {
            name: 'ABS Bois',
            slug: 'abs-bois',
            children: [
              { name: 'ABS Chêne', slug: 'abs-chene' },
              { name: 'ABS Noyer', slug: 'abs-noyer' },
              { name: 'ABS Frêne', slug: 'abs-frene' },
              { name: 'ABS Hêtre', slug: 'abs-hetre' },
            ],
          },
          { name: 'ABS Pierre', slug: 'abs-pierre' },
          { name: 'ABS Fantaisie', slug: 'abs-fantaisie' },
        ],
      },
      {
        name: 'Chants Plaqués Bois',
        slug: 'chants-plaques-bois',
        children: [
          { name: 'Chant Chêne', slug: 'chant-chene' },
          { name: 'Chant Noyer', slug: 'chant-noyer' },
          { name: 'Chant Divers', slug: 'chant-divers' },
        ],
      },
      { name: 'Chants Mélaminés', slug: 'chants-melamines' },
      { name: 'Chants PVC', slug: 'chants-pvc' },
    ],
  },
];

async function getCatalogueId(): Promise<string> {
  const catalogue = await prisma.catalogue.findFirst({
    where: { slug: 'cutx' },
  });

  if (!catalogue) {
    throw new Error('Catalogue "cutx" non trouvé');
  }

  return catalogue.id;
}

async function deleteAllCategories(catalogueId: string): Promise<number> {
  // D'abord, retirer les catégories des panneaux
  await prisma.panel.updateMany({
    where: { catalogueId },
    data: { categoryId: null },
  });

  // Supprimer toutes les catégories (en commençant par les enfants)
  // On doit le faire en plusieurs passes car les enfants référencent les parents
  let totalDeleted = 0;
  let deleted = 1;

  while (deleted > 0) {
    // Supprimer les catégories sans enfants
    const catsWithoutChildren = await prisma.category.findMany({
      where: {
        catalogueId,
        children: { none: {} },
      },
      select: { id: true },
    });

    if (catsWithoutChildren.length === 0) break;

    await prisma.category.deleteMany({
      where: {
        id: { in: catsWithoutChildren.map((c) => c.id) },
      },
    });

    deleted = catsWithoutChildren.length;
    totalDeleted += deleted;
    console.log(`   Supprimé ${deleted} catégories...`);
  }

  return totalDeleted;
}

async function createCategoryRecursive(
  node: CategoryNode,
  catalogueId: string,
  parentId: string | null = null,
  level: number = 0
): Promise<void> {
  const indent = '  '.repeat(level);

  const created = await prisma.category.create({
    data: {
      name: node.name,
      slug: node.slug,
      parentId,
      catalogueId,
    },
  });

  console.log(`${indent}✅ ${node.name}`);

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      await createCategoryRecursive(child, catalogueId, created.id, level + 1);
    }
  }
}

function countNodes(nodes: CategoryNode[]): number {
  return nodes.reduce((acc, node) => {
    return acc + 1 + (node.children ? countNodes(node.children) : 0);
  }, 0);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   RESET COMPLET DE L\'ARBORESCENCE');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const catalogueId = await getCatalogueId();
    console.log(`📦 Catalogue ID: ${catalogueId}\n`);

    // 1. Supprimer toutes les catégories existantes
    console.log('🗑️  Suppression des catégories existantes...');
    const deleted = await deleteAllCategories(catalogueId);
    console.log(`   Total supprimé: ${deleted} catégories\n`);

    // 2. Créer la nouvelle arborescence
    const totalToCreate = countNodes(ARBORESCENCE);
    console.log(`🌳 Création de ${totalToCreate} catégories...\n`);

    for (const rootNode of ARBORESCENCE) {
      await createCategoryRecursive(rootNode, catalogueId);
      console.log(''); // Ligne vide entre les sections
    }

    // 3. Vérification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   VÉRIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const roots = await prisma.category.findMany({
      where: { catalogueId, parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: {
                  include: { children: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    function printTree(cat: any, level = 0): void {
      const indent = '│  '.repeat(level);
      const prefix = level === 0 ? '🌳 ' : '├── ';
      const childCount = cat.children?.length || 0;
      const suffix = childCount > 0 ? ` (${childCount})` : '';
      console.log(`${indent}${prefix}${cat.name}${suffix}`);

      if (cat.children) {
        for (const child of cat.children) {
          printTree(child, level + 1);
        }
      }
    }

    for (const root of roots) {
      printTree(root);
      console.log('');
    }

    const totalCreated = await prisma.category.count({ where: { catalogueId } });
    const rootCount = roots.length;

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   ✅ ${totalCreated} catégories créées`);
    console.log(`   ✅ ${rootCount} catégories racines`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
