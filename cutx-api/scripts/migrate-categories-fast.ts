/**
 * Migration RAPIDE vers la nouvelle structure de catégories unifiée
 *
 * Utilise updateMany pour des updates par lot au lieu d'updates individuels
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Nouvelle structure de catégories
interface CategoryDef {
  name: string;
  slug: string;
  children?: CategoryDef[];
}

const NEW_CATEGORIES: CategoryDef[] = [
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
          { name: 'MDF Ignifugé', slug: 'mdf-ignifuge' },
          { name: 'MDF Léger', slug: 'mdf-leger' },
          { name: 'MDF Teinté masse', slug: 'mdf-teinte' },
          { name: 'MDF à laquer', slug: 'mdf-laquer' },
        ],
      },
      {
        name: 'Aggloméré',
        slug: 'agglomere',
        children: [
          { name: 'Agglo Standard', slug: 'agglo-standard' },
          { name: 'Agglo Hydrofuge', slug: 'agglo-hydrofuge' },
          { name: 'Agglo Ignifugé', slug: 'agglo-ignifuge' },
        ],
      },
      {
        name: 'Contreplaqué',
        slug: 'contreplaque',
        children: [
          { name: 'CP Okoumé', slug: 'cp-okoume' },
          { name: 'CP Peuplier', slug: 'cp-peuplier' },
          { name: 'CP Bouleau', slug: 'cp-bouleau' },
          { name: 'CP Pin Maritime', slug: 'cp-pin' },
          { name: 'CP Marine (CTBX)', slug: 'cp-marine' },
          { name: 'CP Filmé', slug: 'cp-filme' },
          { name: 'CP Cintrable', slug: 'cp-cintrable' },
          { name: 'CP Exotique', slug: 'cp-exotique' },
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
      {
        name: 'Panneaux Spéciaux',
        slug: 'panneaux-speciaux',
        children: [
          { name: 'Bois-Ciment', slug: 'bois-ciment' },
          { name: 'Isolant', slug: 'isolant' },
          { name: 'Alvéolaire', slug: 'alveolaire' },
        ],
      },
    ],
  },
  {
    name: 'Panneaux Décorés',
    slug: 'panneaux-decores',
    children: [
      {
        name: 'Mélaminés',
        slug: 'melamines',
        children: [
          { name: 'Méla Unis', slug: 'mela-unis' },
          { name: 'Méla Bois', slug: 'mela-bois' },
          { name: 'Méla Fantaisie', slug: 'mela-fantaisie' },
          { name: 'Méla Pierre/Béton', slug: 'mela-pierre' },
        ],
      },
      {
        name: 'Stratifiés HPL',
        slug: 'stratifies-hpl',
        children: [
          { name: 'Strat Unis', slug: 'strat-unis' },
          { name: 'Strat Bois', slug: 'strat-bois' },
          { name: 'Strat Fantaisie', slug: 'strat-fantaisie' },
          { name: 'Strat Pierre/Métal', slug: 'strat-pierre' },
        ],
      },
      {
        name: 'Compacts HPL',
        slug: 'compacts-hpl',
      },
      {
        name: 'Placages',
        slug: 'placages',
        children: [
          { name: 'Placage Chêne', slug: 'placage-chene' },
          { name: 'Placage Noyer', slug: 'placage-noyer' },
          { name: 'Placage Frêne', slug: 'placage-frene' },
          { name: 'Placages Divers', slug: 'placages-divers' },
        ],
      },
      {
        name: 'Panneaux Déco Spéciaux',
        slug: 'deco-speciaux',
        children: [
          { name: 'Fenix', slug: 'fenix' },
          { name: 'Cleaf', slug: 'cleaf' },
          { name: 'Autres Déco', slug: 'autres-deco' },
        ],
      },
    ],
  },
  {
    name: 'Bois Massifs',
    slug: 'bois-massifs',
    children: [
      {
        name: '3 Plis',
        slug: '3-plis',
        children: [
          { name: '3 Plis Épicéa', slug: '3-plis-epicea' },
          { name: '3 Plis Chêne', slug: '3-plis-chene' },
          { name: '3 Plis Divers', slug: '3-plis-divers' },
        ],
      },
      {
        name: 'Lamellés-Collés',
        slug: 'lamelles-colles',
        children: [
          { name: 'LC Épicéa', slug: 'lc-epicea' },
          { name: 'LC Chêne', slug: 'lc-chene' },
          { name: 'LC Hêtre', slug: 'lc-hetre' },
          { name: 'LC Divers', slug: 'lc-divers' },
        ],
      },
      {
        name: 'Panneautés',
        slug: 'panneautes',
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
          { name: 'ABS Bois', slug: 'abs-bois' },
          { name: 'ABS Fantaisie', slug: 'abs-fantaisie' },
        ],
      },
      {
        name: 'Chants PVC',
        slug: 'chants-pvc',
      },
      {
        name: 'Chants Mélaminés',
        slug: 'chants-melamines',
      },
      {
        name: 'Chants Bois',
        slug: 'chants-bois',
        children: [
          { name: 'Chant Chêne', slug: 'chant-chene' },
          { name: 'Chant Noyer', slug: 'chant-noyer' },
          { name: 'Chants Bois Divers', slug: 'chants-bois-divers' },
        ],
      },
    ],
  },
  {
    name: 'Plans de Travail',
    slug: 'plans-de-travail',
    children: [
      {
        name: 'PDT Stratifiés',
        slug: 'pdt-stratifies',
      },
      {
        name: 'PDT Compacts',
        slug: 'pdt-compacts',
      },
      {
        name: 'Solid Surface',
        slug: 'solid-surface',
        children: [
          { name: 'Corian', slug: 'corian' },
          { name: 'Autres Solid Surface', slug: 'autres-ss' },
        ],
      },
      {
        name: 'PDT Bois Massif',
        slug: 'pdt-bois',
      },
    ],
  },
  {
    name: 'Panneaux Muraux',
    slug: 'panneaux-muraux',
    children: [
      { name: 'Muraux Étanches', slug: 'muraux-etanches' },
      { name: 'Muraux Acoustiques', slug: 'muraux-acoustiques' },
    ],
  },
];

// Map pour stocker les IDs des nouvelles catégories par slug
const categoryIdMap = new Map<string, string>();

async function createCategories(
  catalogueId: string,
  categories: CategoryDef[],
  parentId: string | null = null
) {
  for (const cat of categories) {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        catalogueId,
        parentId,
      },
    });

    categoryIdMap.set(cat.slug, created.id);
    console.log(`  ✅ ${cat.name} [${cat.slug}]`);

    if (cat.children) {
      await createCategories(catalogueId, cat.children, created.id);
    }
  }
}

// Règles de migration par lot (SQL brut pour performance)
interface BatchRule {
  categorySlug: string;
  description: string;
  where: Prisma.PanelWhereInput;
}

const BATCH_RULES: BatchRule[] = [
  // === CHANTS ABS ===
  {
    categorySlug: 'abs-unis',
    description: 'Chants ABS Unis',
    where: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_ABS',
      OR: [{ decorCategory: 'UNIS' }, { decorCategory: 'SANS_DECOR' }],
    },
  },
  {
    categorySlug: 'abs-bois',
    description: 'Chants ABS Bois',
    where: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_ABS',
      decorCategory: 'BOIS',
    },
  },
  {
    categorySlug: 'abs-fantaisie',
    description: 'Chants ABS Fantaisie',
    where: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_ABS',
      decorCategory: { in: ['FANTAISIE', 'PIERRE', 'METAL'] },
    },
  },
  {
    categorySlug: 'chants-abs',
    description: 'Chants ABS (reste)',
    where: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_ABS',
      categoryId: null,
    },
  },
  {
    categorySlug: 'chants-pvc',
    description: 'Chants PVC',
    where: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_PVC',
    },
  },
  {
    categorySlug: 'chants-melamines',
    description: 'Chants Mélaminés',
    where: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_MELAMINE',
    },
  },
  {
    categorySlug: 'chants-bois-divers',
    description: 'Chants Bois',
    where: {
      panelType: 'CHANT',
      panelSubType: 'CHANT_BOIS',
    },
  },
  {
    categorySlug: 'chants',
    description: 'Chants (reste)',
    where: {
      panelType: 'CHANT',
      categoryId: null,
    },
  },

  // === MÉLAMINÉS ===
  {
    categorySlug: 'mela-unis',
    description: 'Mélaminés Unis',
    where: {
      panelType: 'MELAMINE',
      decorCategory: 'UNIS',
    },
  },
  {
    categorySlug: 'mela-bois',
    description: 'Mélaminés Bois',
    where: {
      panelType: 'MELAMINE',
      decorCategory: 'BOIS',
    },
  },
  {
    categorySlug: 'mela-fantaisie',
    description: 'Mélaminés Fantaisie',
    where: {
      panelType: 'MELAMINE',
      decorCategory: 'FANTAISIE',
    },
  },
  {
    categorySlug: 'mela-pierre',
    description: 'Mélaminés Pierre',
    where: {
      panelType: 'MELAMINE',
      decorCategory: { in: ['PIERRE', 'BETON', 'METAL'] },
    },
  },
  {
    categorySlug: 'melamines',
    description: 'Mélaminés (reste)',
    where: {
      panelType: 'MELAMINE',
      categoryId: null,
    },
  },

  // === STRATIFIÉS ===
  {
    categorySlug: 'strat-unis',
    description: 'Stratifiés Unis',
    where: {
      panelType: 'STRATIFIE',
      decorCategory: 'UNIS',
    },
  },
  {
    categorySlug: 'strat-bois',
    description: 'Stratifiés Bois',
    where: {
      panelType: 'STRATIFIE',
      decorCategory: 'BOIS',
    },
  },
  {
    categorySlug: 'strat-fantaisie',
    description: 'Stratifiés Fantaisie',
    where: {
      panelType: 'STRATIFIE',
      decorCategory: 'FANTAISIE',
    },
  },
  {
    categorySlug: 'strat-pierre',
    description: 'Stratifiés Pierre',
    where: {
      panelType: 'STRATIFIE',
      decorCategory: { in: ['PIERRE', 'BETON', 'METAL'] },
    },
  },
  {
    categorySlug: 'stratifies-hpl',
    description: 'Stratifiés (reste)',
    where: {
      panelType: 'STRATIFIE',
      categoryId: null,
    },
  },

  // === COMPACTS ===
  {
    categorySlug: 'compacts-hpl',
    description: 'Compacts HPL',
    where: {
      panelType: 'COMPACT',
    },
  },

  // === PLACAGES ===
  {
    categorySlug: 'placages-divers',
    description: 'Placages',
    where: {
      panelType: 'PLACAGE',
    },
  },

  // === DÉCO SPÉCIAUX ===
  {
    categorySlug: 'fenix',
    description: 'Fenix',
    where: {
      OR: [
        { manufacturer: 'Fenix' },
        { name: { contains: 'fenix', mode: 'insensitive' } },
      ],
      panelType: { not: 'CHANT' },
    },
  },
  {
    categorySlug: 'cleaf',
    description: 'Cleaf',
    where: {
      OR: [
        { manufacturer: 'Cleaf' },
        { name: { contains: 'cleaf', mode: 'insensitive' } },
      ],
    },
  },
  {
    categorySlug: 'autres-deco',
    description: 'Panneaux Déco',
    where: {
      panelType: 'PANNEAU_DECO',
      categoryId: null,
    },
  },

  // === MDF ===
  {
    categorySlug: 'mdf-hydrofuge',
    description: 'MDF Hydrofuge',
    where: {
      panelType: 'MDF',
      isHydrofuge: true,
    },
  },
  {
    categorySlug: 'mdf-ignifuge',
    description: 'MDF Ignifugé',
    where: {
      panelType: 'MDF',
      isIgnifuge: true,
    },
  },
  {
    categorySlug: 'mdf-laquer',
    description: 'MDF à laquer',
    where: {
      panelType: 'MDF',
      panelSubType: 'MDF_LAQUE',
    },
  },
  {
    categorySlug: 'mdf-standard',
    description: 'MDF Standard',
    where: {
      panelType: 'MDF',
      categoryId: null,
    },
  },

  // === AGGLOMÉRÉ ===
  {
    categorySlug: 'agglo-hydrofuge',
    description: 'Agglo Hydrofuge',
    where: {
      panelType: 'AGGLO_BRUT',
      isHydrofuge: true,
    },
  },
  {
    categorySlug: 'agglo-ignifuge',
    description: 'Agglo Ignifugé',
    where: {
      panelType: 'AGGLO_BRUT',
      isIgnifuge: true,
    },
  },
  {
    categorySlug: 'agglo-standard',
    description: 'Agglo Standard',
    where: {
      panelType: 'AGGLO_BRUT',
      categoryId: null,
    },
  },

  // === CONTREPLAQUÉ ===
  {
    categorySlug: 'cp-okoume',
    description: 'CP Okoumé',
    where: {
      panelType: 'CONTREPLAQUE',
      name: { contains: 'okoumé', mode: 'insensitive' },
    },
  },
  {
    categorySlug: 'cp-peuplier',
    description: 'CP Peuplier',
    where: {
      panelType: 'CONTREPLAQUE',
      name: { contains: 'peuplier', mode: 'insensitive' },
    },
  },
  {
    categorySlug: 'cp-bouleau',
    description: 'CP Bouleau',
    where: {
      panelType: 'CONTREPLAQUE',
      OR: [
        { name: { contains: 'bouleau', mode: 'insensitive' } },
        { name: { contains: 'multiplis', mode: 'insensitive' } },
      ],
    },
  },
  {
    categorySlug: 'cp-marine',
    description: 'CP Marine',
    where: {
      panelType: 'CONTREPLAQUE',
      OR: [
        { name: { contains: 'marine', mode: 'insensitive' } },
        { name: { contains: 'ctbx', mode: 'insensitive' } },
      ],
    },
  },
  {
    categorySlug: 'cp-filme',
    description: 'CP Filmé',
    where: {
      panelType: 'CONTREPLAQUE',
      name: { contains: 'filmé', mode: 'insensitive' },
    },
  },
  {
    categorySlug: 'contreplaque',
    description: 'Contreplaqué (reste)',
    where: {
      panelType: 'CONTREPLAQUE',
      categoryId: null,
    },
  },

  // === OSB ===
  {
    categorySlug: 'osb-hydrofuge',
    description: 'OSB Hydrofuge',
    where: {
      panelType: 'OSB',
      isHydrofuge: true,
    },
  },
  {
    categorySlug: 'osb-standard',
    description: 'OSB Standard',
    where: {
      panelType: 'OSB',
      categoryId: null,
    },
  },

  // === BOIS MASSIFS ===
  {
    categorySlug: '3-plis-divers',
    description: '3 Plis',
    where: {
      panelType: 'MASSIF',
      panelSubType: 'MASSIF_3_PLIS',
    },
  },
  {
    categorySlug: 'lc-divers',
    description: 'Lamellés-Collés',
    where: {
      panelType: 'MASSIF',
      panelSubType: 'LAMELLE_COLLE',
    },
  },
  {
    categorySlug: 'panneautes',
    description: 'Panneautés',
    where: {
      panelType: 'MASSIF',
      panelSubType: 'MASSIF_BOIS',
    },
  },
  {
    categorySlug: 'bois-massifs',
    description: 'Bois Massifs (reste)',
    where: {
      panelType: 'MASSIF',
      categoryId: null,
    },
  },

  // === SOLID SURFACE ===
  {
    categorySlug: 'corian',
    description: 'Corian',
    where: {
      panelType: 'SOLID_SURFACE',
      manufacturer: 'Corian',
    },
  },
  {
    categorySlug: 'autres-ss',
    description: 'Solid Surface',
    where: {
      panelType: 'SOLID_SURFACE',
      categoryId: null,
    },
  },

  // === PANNEAUX MURAUX ===
  {
    categorySlug: 'muraux-etanches',
    description: 'Muraux Étanches',
    where: {
      productType: 'PANNEAU_MURAL',
    },
  },

  // === SPÉCIAUX ===
  {
    categorySlug: 'bois-ciment',
    description: 'Bois-Ciment',
    where: {
      productType: { in: ['BOIS_CIMENT', 'CIMENT_BOIS'] },
    },
  },
  {
    categorySlug: 'isolant',
    description: 'Isolant',
    where: {
      productType: 'PANNEAU_ISOLANT',
    },
  },
  {
    categorySlug: 'alveolaire',
    description: 'Alvéolaire',
    where: {
      productType: { in: ['PANNEAU_ALVEOLAIRE', 'ALVEOLAIRE'] },
    },
  },
  {
    categorySlug: 'latte-standard',
    description: 'Latté',
    where: {
      productType: 'LATTE',
    },
  },
];

async function main() {
  console.log('🚀 Migration RAPIDE des catégories\n');
  console.log('='.repeat(50));

  // 1. Créer ou récupérer le catalogue CutX
  console.log('\n📦 Catalogue maître CutX...\n');

  let cutxCatalogue = await prisma.catalogue.findFirst({
    where: { slug: 'cutx' },
  });

  if (!cutxCatalogue) {
    cutxCatalogue = await prisma.catalogue.create({
      data: {
        name: 'CutX',
        slug: 'cutx',
        isActive: true,
      },
    });
    console.log('  ✅ Catalogue CutX créé');
  } else {
    console.log('  ℹ️ Catalogue CutX existe déjà');

    // Supprimer les anciennes catégories CutX
    console.log('  🗑️ Suppression des anciennes catégories CutX...');
    await prisma.category.deleteMany({
      where: { catalogueId: cutxCatalogue.id },
    });
  }

  // 2. Réinitialiser tous les categoryId des panels
  console.log('\n🔄 Réinitialisation des categoryId...');
  await prisma.panel.updateMany({
    where: { isActive: true },
    data: { categoryId: null },
  });
  console.log('  ✅ Tous les panels réinitialisés');

  // 3. Créer la nouvelle structure
  console.log('\n📂 Création de la nouvelle arborescence...\n');
  await createCategories(cutxCatalogue.id, NEW_CATEGORIES);
  console.log(`\n  ✅ ${categoryIdMap.size} catégories créées`);

  // 4. Migrer les panels par lot
  console.log('\n' + '='.repeat(50));
  console.log('\n🔄 Migration par lots...\n');

  const stats = new Map<string, number>();
  let totalMigrated = 0;

  for (const rule of BATCH_RULES) {
    const categoryId = categoryIdMap.get(rule.categorySlug);
    if (!categoryId) {
      console.log(`  ⚠️ Catégorie non trouvée: ${rule.categorySlug}`);
      continue;
    }

    const result = await prisma.panel.updateMany({
      where: {
        ...rule.where,
        isActive: true,
      },
      data: { categoryId },
    });

    if (result.count > 0) {
      stats.set(rule.categorySlug, result.count);
      totalMigrated += result.count;
      console.log(`  ✅ ${rule.description}: ${result.count} panels`);
    }
  }

  // 5. Compter les non-classés
  const unclassified = await prisma.panel.count({
    where: {
      isActive: true,
      categoryId: null,
    },
  });

  // 6. Rapport
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 RAPPORT DE MIGRATION\n');

  const sortedStats = [...stats.entries()].sort((a, b) => b[1] - a[1]);

  console.log('Top catégories:');
  for (const [slug, count] of sortedStats.slice(0, 15)) {
    console.log(`  ${slug}: ${count}`);
  }

  console.log(`\n  ✅ Total migré: ${totalMigrated} panels`);
  console.log(`  ⚠️ Non classés: ${unclassified} panels`);

  // Afficher quelques exemples de non-classés
  if (unclassified > 0) {
    const examples = await prisma.panel.findMany({
      where: {
        isActive: true,
        categoryId: null,
      },
      select: {
        name: true,
        panelType: true,
        panelSubType: true,
        productType: true,
      },
      take: 10,
    });

    console.log('\n  Exemples de non-classés:');
    for (const p of examples) {
      console.log(`    - ${p.name} (type: ${p.panelType}, sub: ${p.panelSubType}, prod: ${p.productType})`);
    }
  }

  const totalPanels = await prisma.panel.count({ where: { isActive: true } });
  console.log(`\n  📈 ${totalMigrated}/${totalPanels} (${((totalMigrated / totalPanels) * 100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Erreur:', e);
  prisma.$disconnect();
  process.exit(1);
});
