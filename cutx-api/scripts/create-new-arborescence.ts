/**
 * Script: Création de la nouvelle arborescence des catégories
 *
 * Ce script crée la structure hiérarchique des catégories selon
 * l'arborescence métier définie par le client.
 *
 * IMPORTANT: Ne pas assigner de panneaux pour l'instant.
 *
 * Usage: npx ts-node scripts/create-new-arborescence.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Structure hiérarchique de l'arborescence
interface CategoryNode {
  name: string;
  slug: string;
  children?: CategoryNode[];
}

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
          { name: 'Décors Fantaisie', slug: 'decors-fantaisie' },
        ],
      },
      {
        name: 'Panneaux Plaqués Bois',
        slug: 'panneaux-plaques-bois',
        children: [
          { name: 'Chêne', slug: 'plaque-chene' },
          { name: 'Noyer', slug: 'plaque-noyer' },
          { name: 'Autres Essences', slug: 'plaque-autres-essences' },
        ],
      },
      {
        name: 'Panneaux Bruts',
        slug: 'panneaux-bruts',
        children: [
          { name: 'MDF', slug: 'mdf' },
          { name: 'Aggloméré', slug: 'agglomere' },
          { name: 'OSB', slug: 'osb' },
        ],
      },
      {
        name: 'Contreplaqués',
        slug: 'contreplaques',
        children: [
          { name: 'Contreplaqué Peuplier', slug: 'contreplaque-peuplier' },
          { name: 'Contreplaqué Bouleau', slug: 'contreplaque-bouleau' },
          { name: 'Contreplaqué Okoumé', slug: 'contreplaque-okoume' },
        ],
      },
      {
        name: 'Bois Massif',
        slug: 'bois-massif',
      },
      {
        name: 'Panneaux Muraux',
        slug: 'panneaux-muraux',
      },
      {
        name: 'Panneaux Spéciaux',
        slug: 'panneaux-speciaux',
        children: [
          { name: 'Ignifugés', slug: 'ignifuges' },
          { name: 'Hydrofuges', slug: 'hydrofuges' },
          { name: 'Phoniques', slug: 'phoniques' },
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
      { name: 'PDT Solid Surface', slug: 'pdt-solid-surface' },
    ],
  },
  {
    name: 'Feuilles & Placages',
    slug: 'feuilles-placages',
    children: [
      { name: 'Feuilles Stratifiées', slug: 'feuilles-stratifiees' },
      { name: 'Placages Bois', slug: 'placages-bois' },
    ],
  },
  {
    name: 'Chants',
    slug: 'chants',
    children: [
      { name: 'Chants ABS', slug: 'chants-abs' },
      { name: 'Chants Plaqués Bois', slug: 'chants-plaques-bois' },
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

async function createCategoryRecursive(
  node: CategoryNode,
  catalogueId: string,
  parentId: string | null = null,
  level: number = 0
): Promise<void> {
  const indent = '  '.repeat(level);

  // Vérifier si la catégorie existe déjà
  const existing = await prisma.category.findFirst({
    where: { slug: node.slug, catalogueId },
  });

  let categoryId: string;

  if (existing) {
    console.log(`${indent}⚡ Existe déjà: ${node.name} (${node.slug})`);
    categoryId = existing.id;

    // Mettre à jour le parent si nécessaire
    if (existing.parentId !== parentId) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { parentId },
      });
      console.log(`${indent}   → Parent mis à jour`);
    }
  } else {
    const created = await prisma.category.create({
      data: {
        name: node.name,
        slug: node.slug,
        parentId,
        catalogueId,
      },
    });
    categoryId = created.id;
    console.log(`${indent}✅ Créé: ${node.name} (${node.slug})`);
  }

  // Créer les enfants récursivement
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      await createCategoryRecursive(child, catalogueId, categoryId, level + 1);
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   CRÉATION DE LA NOUVELLE ARBORESCENCE DES CATÉGORIES');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const catalogueId = await getCatalogueId();
    console.log(`📦 Catalogue ID: ${catalogueId}\n`);

    // Compter les catégories existantes
    const existingCount = await prisma.category.count({
      where: { catalogueId },
    });
    console.log(`📊 Catégories existantes: ${existingCount}\n`);

    console.log('🌳 Création de l\'arborescence...\n');

    for (const rootNode of ARBORESCENCE) {
      await createCategoryRecursive(rootNode, catalogueId);
      console.log(''); // Ligne vide entre les sections principales
    }

    // Compter les nouvelles catégories
    const newCount = await prisma.category.count({
      where: { catalogueId },
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   RÉSUMÉ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Catégories avant: ${existingCount}`);
    console.log(`   Catégories après: ${newCount}`);
    console.log(`   Nouvelles créées: ${newCount - existingCount}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Afficher l'arborescence finale
    console.log('🌲 Arborescence finale:\n');
    const rootCategories = await prisma.category.findMany({
      where: { catalogueId, parentId: null },
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
      },
      orderBy: { name: 'asc' },
    });

    function printTree(cats: any[], level = 0) {
      const indent = '  '.repeat(level);
      for (const cat of cats) {
        const childCount = cat.children?.length || 0;
        const suffix = childCount > 0 ? ` (${childCount} enfants)` : '';
        console.log(`${indent}├── ${cat.name}${suffix}`);
        if (cat.children && cat.children.length > 0) {
          printTree(cat.children, level + 1);
        }
      }
    }

    printTree(rootCategories);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
