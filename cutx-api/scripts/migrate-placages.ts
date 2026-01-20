/**
 * Migration des panneaux plaqués vers les bonnes catégories
 *
 * Étape 1: Créer les catégories manquantes sous "Placages"
 * Étape 2: Migrer les panneaux selon leur material ou nom
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Mapping material → slug catégorie
const MATERIAL_TO_SLUG: Record<string, string> = {
  'Placage Chêne': 'placage-chene',
  'Placage Noyer': 'placage-noyer',
  'Placage Frêne': 'placage-frene',
  'Placage Hêtre': 'placage-hetre',
  'Placage Merisier': 'placage-merisier',
  'Placage Teck': 'placage-teck',
  'Placage Érable': 'placage-erable',
  'Placage Wengé': 'placage-wenge',
};

// Essences à détecter dans le nom (pour les NULL)
const ESSENCE_PATTERNS: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /ch[êe]ne/i, slug: 'placage-chene' },
  { pattern: /noyer/i, slug: 'placage-noyer' },
  { pattern: /fr[êe]ne/i, slug: 'placage-frene' },
  { pattern: /h[êe]tre/i, slug: 'placage-hetre' },
  { pattern: /merisier/i, slug: 'placage-merisier' },
  { pattern: /teck/i, slug: 'placage-teck' },
  { pattern: /[ée]rable/i, slug: 'placage-erable' },
  { pattern: /weng[ée]/i, slug: 'placage-wenge' },
  { pattern: /bouleau/i, slug: 'placages-divers' },
  { pattern: /ch[âa]taignier/i, slug: 'placages-divers' },
  { pattern: /pin\b/i, slug: 'placages-divers' },
  { pattern: /okoum[ée]/i, slug: 'placages-divers' },
];

// Nouvelles catégories à créer
const NEW_CATEGORIES = [
  { name: 'Placage Hêtre', slug: 'placage-hetre' },
  { name: 'Placage Merisier', slug: 'placage-merisier' },
  { name: 'Placage Teck', slug: 'placage-teck' },
  { name: 'Placage Érable', slug: 'placage-erable' },
  { name: 'Placage Wengé', slug: 'placage-wenge' },
];

async function migrate() {
  console.log('=== MIGRATION DES PLACAGES ===\n');

  // 1. Trouver la catégorie parent "Placages"
  const placagesParent = await prisma.category.findFirst({
    where: { slug: 'placages' },
    select: { id: true, catalogueId: true }
  });

  if (!placagesParent) {
    console.error('❌ Catégorie "placages" non trouvée !');
    return;
  }

  console.log('✓ Catégorie parent "placages" trouvée\n');

  // 2. Créer les catégories manquantes
  console.log('--- CRÉATION DES CATÉGORIES MANQUANTES ---');

  for (const cat of NEW_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { slug: cat.slug }
    });

    if (existing) {
      console.log(`  ⏭ ${cat.slug} existe déjà`);
    } else {
      await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          parentId: placagesParent.id,
          catalogueId: placagesParent.catalogueId,
        }
      });
      console.log(`  ✓ ${cat.slug} créée`);
    }
  }

  // 3. Récupérer toutes les catégories cibles
  const targetCategories = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'placage-' } },
        { slug: 'placages-divers' }
      ]
    },
    select: { id: true, slug: true }
  });

  const slugToId = new Map(targetCategories.map(c => [c.slug, c.id]));
  console.log(`\n✓ ${targetCategories.length} catégories cibles trouvées\n`);

  // 4. Récupérer tous les panneaux plaqués
  const placages = await prisma.panel.findMany({
    where: { productType: 'PLACAGE', isActive: true },
    select: {
      id: true,
      name: true,
      material: true,
      categoryId: true,
      category: { select: { slug: true } }
    }
  });

  console.log(`--- MIGRATION DE ${placages.length} PANNEAUX ---\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const panel of placages) {
    let targetSlug: string | null = null;

    // D'abord essayer par material
    if (panel.material && MATERIAL_TO_SLUG[panel.material]) {
      targetSlug = MATERIAL_TO_SLUG[panel.material];
    }
    // Sinon chercher dans le nom
    else if (panel.name) {
      for (const { pattern, slug } of ESSENCE_PATTERNS) {
        if (pattern.test(panel.name)) {
          targetSlug = slug;
          break;
        }
      }
    }

    // Si toujours pas trouvé, mettre dans divers
    if (!targetSlug) {
      targetSlug = 'placages-divers';
    }

    const targetCategoryId = slugToId.get(targetSlug);

    if (!targetCategoryId) {
      console.log(`  ❌ Catégorie ${targetSlug} non trouvée pour: ${panel.name?.substring(0, 40)}`);
      errors++;
      continue;
    }

    // Vérifier si déjà dans la bonne catégorie
    if (panel.categoryId === targetCategoryId) {
      skipped++;
      continue;
    }

    // Migrer
    await prisma.panel.update({
      where: { id: panel.id },
      data: { categoryId: targetCategoryId }
    });

    const shortName = panel.name?.substring(0, 50) || 'N/A';
    console.log(`  ✓ ${shortName}`);
    console.log(`    ${panel.category?.slug || 'NULL'} → ${targetSlug}`);
    migrated++;
  }

  console.log('\n=== RÉSUMÉ ===');
  console.log(`✓ Migrés: ${migrated}`);
  console.log(`⏭ Déjà OK: ${skipped}`);
  console.log(`❌ Erreurs: ${errors}`);

  // 5. Afficher le nouveau comptage
  console.log('\n=== NOUVEAU COMPTAGE PAR CATÉGORIE ===');

  const newCounts = await prisma.category.findMany({
    where: { parent: { slug: 'placages' } },
    select: {
      name: true,
      slug: true,
      _count: { select: { panels: { where: { isActive: true } } } }
    },
    orderBy: { name: 'asc' }
  });

  newCounts.forEach(c => {
    console.log(`  ${c.slug}: ${c._count.panels} panneaux`);
  });

  await prisma.$disconnect();
}

migrate().catch(console.error);
