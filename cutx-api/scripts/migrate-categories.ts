/**
 * Migration vers la nouvelle structure de catégories unifiée
 *
 * Ce script :
 * 1. Crée un catalogue "CutX" qui servira de référentiel pour les catégories
 * 2. Crée la nouvelle arborescence de catégories
 * 3. Réassigne tous les panels à leurs nouvelles catégories
 * 4. Génère un rapport de migration
 */

import { PrismaClient, DecorCategory, ProductType, ProductSubType } from '@prisma/client';

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

// Règles de classement des panels
interface ClassificationRule {
  categorySlug: string;
  condition: (panel: {
    panelType: ProductType | null;
    panelSubType: ProductSubType | null;
    decorCategory: DecorCategory | null;
    productType: string | null;
    name: string;
    manufacturer: string | null;
    isHydrofuge: boolean | null;
    isIgnifuge: boolean | null;
  }) => boolean;
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // === CHANTS ===
  // ABS par décor
  {
    categorySlug: 'abs-unis',
    condition: (p) =>
      p.panelType === 'CHANT' &&
      p.panelSubType === 'CHANT_ABS' &&
      (p.decorCategory === 'UNIS' || p.decorCategory === 'SANS_DECOR'),
  },
  {
    categorySlug: 'abs-bois',
    condition: (p) =>
      p.panelType === 'CHANT' &&
      p.panelSubType === 'CHANT_ABS' &&
      p.decorCategory === 'BOIS',
  },
  {
    categorySlug: 'abs-fantaisie',
    condition: (p) =>
      p.panelType === 'CHANT' &&
      p.panelSubType === 'CHANT_ABS' &&
      (p.decorCategory === 'FANTAISIE' ||
        p.decorCategory === 'PIERRE' ||
        p.decorCategory === 'METAL'),
  },
  // ABS fallback
  {
    categorySlug: 'chants-abs',
    condition: (p) => p.panelType === 'CHANT' && p.panelSubType === 'CHANT_ABS',
  },
  // PVC
  {
    categorySlug: 'chants-pvc',
    condition: (p) => p.panelType === 'CHANT' && p.panelSubType === 'CHANT_PVC',
  },
  // Mélaminés
  {
    categorySlug: 'chants-melamines',
    condition: (p) =>
      p.panelType === 'CHANT' && p.panelSubType === 'CHANT_MELAMINE',
  },
  // Bois
  {
    categorySlug: 'chant-chene',
    condition: (p) =>
      p.panelType === 'CHANT' &&
      p.panelSubType === 'CHANT_BOIS' &&
      p.name.toLowerCase().includes('chêne'),
  },
  {
    categorySlug: 'chant-noyer',
    condition: (p) =>
      p.panelType === 'CHANT' &&
      p.panelSubType === 'CHANT_BOIS' &&
      p.name.toLowerCase().includes('noyer'),
  },
  {
    categorySlug: 'chants-bois-divers',
    condition: (p) => p.panelType === 'CHANT' && p.panelSubType === 'CHANT_BOIS',
  },
  // Chant fallback
  {
    categorySlug: 'chants',
    condition: (p) => p.panelType === 'CHANT',
  },

  // === MÉLAMINÉS ===
  {
    categorySlug: 'mela-unis',
    condition: (p) => p.panelType === 'MELAMINE' && p.decorCategory === 'UNIS',
  },
  {
    categorySlug: 'mela-bois',
    condition: (p) => p.panelType === 'MELAMINE' && p.decorCategory === 'BOIS',
  },
  {
    categorySlug: 'mela-fantaisie',
    condition: (p) =>
      p.panelType === 'MELAMINE' && p.decorCategory === 'FANTAISIE',
  },
  {
    categorySlug: 'mela-pierre',
    condition: (p) =>
      p.panelType === 'MELAMINE' &&
      (p.decorCategory === 'PIERRE' ||
        p.decorCategory === 'BETON' ||
        p.decorCategory === 'METAL'),
  },
  {
    categorySlug: 'melamines',
    condition: (p) => p.panelType === 'MELAMINE',
  },

  // === STRATIFIÉS ===
  {
    categorySlug: 'strat-unis',
    condition: (p) => p.panelType === 'STRATIFIE' && p.decorCategory === 'UNIS',
  },
  {
    categorySlug: 'strat-bois',
    condition: (p) => p.panelType === 'STRATIFIE' && p.decorCategory === 'BOIS',
  },
  {
    categorySlug: 'strat-fantaisie',
    condition: (p) =>
      p.panelType === 'STRATIFIE' && p.decorCategory === 'FANTAISIE',
  },
  {
    categorySlug: 'strat-pierre',
    condition: (p) =>
      p.panelType === 'STRATIFIE' &&
      (p.decorCategory === 'PIERRE' ||
        p.decorCategory === 'BETON' ||
        p.decorCategory === 'METAL'),
  },
  {
    categorySlug: 'stratifies-hpl',
    condition: (p) => p.panelType === 'STRATIFIE',
  },

  // === COMPACTS ===
  {
    categorySlug: 'compacts-hpl',
    condition: (p) => p.panelType === 'COMPACT',
  },

  // === PLACAGES ===
  {
    categorySlug: 'placage-chene',
    condition: (p) =>
      p.panelType === 'PLACAGE' && p.name.toLowerCase().includes('chêne'),
  },
  {
    categorySlug: 'placage-noyer',
    condition: (p) =>
      p.panelType === 'PLACAGE' && p.name.toLowerCase().includes('noyer'),
  },
  {
    categorySlug: 'placage-frene',
    condition: (p) =>
      p.panelType === 'PLACAGE' && p.name.toLowerCase().includes('frêne'),
  },
  {
    categorySlug: 'placages-divers',
    condition: (p) => p.panelType === 'PLACAGE',
  },

  // === DÉCO SPÉCIAUX ===
  {
    categorySlug: 'fenix',
    condition: (p) =>
      p.panelType === 'PANNEAU_DECO' &&
      (p.manufacturer === 'Fenix' ||
        p.name.toLowerCase().includes('fenix')),
  },
  {
    categorySlug: 'cleaf',
    condition: (p) =>
      p.panelType === 'PANNEAU_DECO' &&
      (p.manufacturer === 'Cleaf' ||
        p.name.toLowerCase().includes('cleaf')),
  },
  {
    categorySlug: 'autres-deco',
    condition: (p) => p.panelType === 'PANNEAU_DECO',
  },

  // === MDF ===
  {
    categorySlug: 'mdf-hydrofuge',
    condition: (p) => p.panelType === 'MDF' && p.isHydrofuge === true,
  },
  {
    categorySlug: 'mdf-ignifuge',
    condition: (p) => p.panelType === 'MDF' && p.isIgnifuge === true,
  },
  {
    categorySlug: 'mdf-teinte',
    condition: (p) =>
      p.panelType === 'MDF' &&
      (p.name.toLowerCase().includes('teinté') ||
        p.name.toLowerCase().includes('noir') ||
        p.name.toLowerCase().includes('valchromat')),
  },
  {
    categorySlug: 'mdf-laquer',
    condition: (p) =>
      p.panelType === 'MDF' &&
      (p.panelSubType === 'MDF_LAQUE' ||
        p.name.toLowerCase().includes('laquer') ||
        p.name.toLowerCase().includes('laqué')),
  },
  {
    categorySlug: 'mdf-leger',
    condition: (p) =>
      p.panelType === 'MDF' &&
      (p.name.toLowerCase().includes('léger') ||
        p.name.toLowerCase().includes('light')),
  },
  {
    categorySlug: 'mdf-standard',
    condition: (p) => p.panelType === 'MDF',
  },

  // === AGGLOMÉRÉ ===
  {
    categorySlug: 'agglo-hydrofuge',
    condition: (p) => p.panelType === 'AGGLO_BRUT' && p.isHydrofuge === true,
  },
  {
    categorySlug: 'agglo-ignifuge',
    condition: (p) => p.panelType === 'AGGLO_BRUT' && p.isIgnifuge === true,
  },
  {
    categorySlug: 'agglo-standard',
    condition: (p) => p.panelType === 'AGGLO_BRUT',
  },

  // === CONTREPLAQUÉ ===
  {
    categorySlug: 'cp-okoume',
    condition: (p) =>
      p.panelType === 'CONTREPLAQUE' &&
      p.name.toLowerCase().includes('okoumé'),
  },
  {
    categorySlug: 'cp-peuplier',
    condition: (p) =>
      p.panelType === 'CONTREPLAQUE' &&
      p.name.toLowerCase().includes('peuplier'),
  },
  {
    categorySlug: 'cp-bouleau',
    condition: (p) =>
      p.panelType === 'CONTREPLAQUE' &&
      (p.name.toLowerCase().includes('bouleau') ||
        p.name.toLowerCase().includes('multiplis')),
  },
  {
    categorySlug: 'cp-pin',
    condition: (p) =>
      p.panelType === 'CONTREPLAQUE' &&
      (p.name.toLowerCase().includes('pin') ||
        p.name.toLowerCase().includes('résineux')),
  },
  {
    categorySlug: 'cp-marine',
    condition: (p) =>
      p.panelType === 'CONTREPLAQUE' &&
      (p.name.toLowerCase().includes('marine') ||
        p.name.toLowerCase().includes('ctbx')),
  },
  {
    categorySlug: 'cp-filme',
    condition: (p) =>
      p.panelType === 'CONTREPLAQUE' &&
      (p.name.toLowerCase().includes('filmé') ||
        p.name.toLowerCase().includes('antidérapant')),
  },
  {
    categorySlug: 'cp-cintrable',
    condition: (p) =>
      p.panelType === 'CONTREPLAQUE' &&
      p.name.toLowerCase().includes('cintrer'),
  },
  {
    categorySlug: 'cp-exotique',
    condition: (p) =>
      p.panelType === 'CONTREPLAQUE' &&
      (p.name.toLowerCase().includes('exotique') ||
        p.name.toLowerCase().includes('ilomba') ||
        p.name.toLowerCase().includes('meranti')),
  },
  {
    categorySlug: 'contreplaque',
    condition: (p) => p.panelType === 'CONTREPLAQUE',
  },

  // === OSB ===
  {
    categorySlug: 'osb-hydrofuge',
    condition: (p) => p.panelType === 'OSB' && p.isHydrofuge === true,
  },
  {
    categorySlug: 'osb-standard',
    condition: (p) => p.panelType === 'OSB',
  },

  // === BOIS MASSIFS ===
  {
    categorySlug: '3-plis-epicea',
    condition: (p) =>
      p.panelType === 'MASSIF' &&
      p.panelSubType === 'MASSIF_3_PLIS' &&
      p.name.toLowerCase().includes('épicéa'),
  },
  {
    categorySlug: '3-plis-chene',
    condition: (p) =>
      p.panelType === 'MASSIF' &&
      p.panelSubType === 'MASSIF_3_PLIS' &&
      p.name.toLowerCase().includes('chêne'),
  },
  {
    categorySlug: '3-plis-divers',
    condition: (p) =>
      p.panelType === 'MASSIF' && p.panelSubType === 'MASSIF_3_PLIS',
  },
  {
    categorySlug: 'lc-epicea',
    condition: (p) =>
      p.panelType === 'MASSIF' &&
      p.panelSubType === 'LAMELLE_COLLE' &&
      p.name.toLowerCase().includes('épicéa'),
  },
  {
    categorySlug: 'lc-chene',
    condition: (p) =>
      p.panelType === 'MASSIF' &&
      p.panelSubType === 'LAMELLE_COLLE' &&
      p.name.toLowerCase().includes('chêne'),
  },
  {
    categorySlug: 'lc-hetre',
    condition: (p) =>
      p.panelType === 'MASSIF' &&
      p.panelSubType === 'LAMELLE_COLLE' &&
      p.name.toLowerCase().includes('hêtre'),
  },
  {
    categorySlug: 'lc-divers',
    condition: (p) =>
      p.panelType === 'MASSIF' && p.panelSubType === 'LAMELLE_COLLE',
  },
  {
    categorySlug: 'panneautes',
    condition: (p) =>
      p.panelType === 'MASSIF' && p.panelSubType === 'MASSIF_BOIS',
  },
  {
    categorySlug: 'bois-massifs',
    condition: (p) => p.panelType === 'MASSIF',
  },

  // === SOLID SURFACE ===
  {
    categorySlug: 'corian',
    condition: (p) =>
      p.panelType === 'SOLID_SURFACE' && p.manufacturer === 'Corian',
  },
  {
    categorySlug: 'autres-ss',
    condition: (p) => p.panelType === 'SOLID_SURFACE',
  },

  // === PANNEAUX MURAUX ===
  {
    categorySlug: 'muraux-etanches',
    condition: (p) =>
      p.productType === 'PANNEAU_MURAL' ||
      (p.name.toLowerCase().includes('mural') &&
        p.name.toLowerCase().includes('étanche')),
  },

  // === SPÉCIAUX ===
  {
    categorySlug: 'bois-ciment',
    condition: (p) =>
      p.productType === 'BOIS_CIMENT' || p.productType === 'CIMENT_BOIS',
  },
  {
    categorySlug: 'isolant',
    condition: (p) => p.productType === 'PANNEAU_ISOLANT',
  },
  {
    categorySlug: 'alveolaire',
    condition: (p) =>
      p.productType === 'PANNEAU_ALVEOLAIRE' || p.productType === 'ALVEOLAIRE',
  },
  {
    categorySlug: 'latte-leger',
    condition: (p) =>
      p.productType === 'LATTE' && p.name.toLowerCase().includes('léger'),
  },
  {
    categorySlug: 'latte-standard',
    condition: (p) => p.productType === 'LATTE',
  },
];

function classifyPanel(panel: {
  panelType: ProductType | null;
  panelSubType: ProductSubType | null;
  decorCategory: DecorCategory | null;
  productType: string | null;
  name: string;
  manufacturer: string | null;
  isHydrofuge: boolean | null;
  isIgnifuge: boolean | null;
}): string | null {
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.condition(panel)) {
      return rule.categorySlug;
    }
  }
  return null;
}

async function main() {
  console.log('🚀 Migration des catégories\n');
  console.log('='.repeat(50));

  // 1. Créer ou récupérer le catalogue CutX
  console.log('\n📦 Création du catalogue maître CutX...\n');

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

    // Supprimer les anciennes catégories CutX pour recommencer proprement
    console.log('  🗑️ Suppression des anciennes catégories CutX...');
    await prisma.category.deleteMany({
      where: { catalogueId: cutxCatalogue.id },
    });
  }

  // 2. Créer la nouvelle structure
  console.log('\n📂 Création de la nouvelle arborescence...\n');
  await createCategories(cutxCatalogue.id, NEW_CATEGORIES);

  console.log(`\n  ✅ ${categoryIdMap.size} catégories créées\n`);

  // 3. Migrer les panels
  console.log('='.repeat(50));
  console.log('\n🔄 Migration des panels...\n');

  const panels = await prisma.panel.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      panelType: true,
      panelSubType: true,
      decorCategory: true,
      productType: true,
      manufacturer: true,
      isHydrofuge: true,
      isIgnifuge: true,
    },
  });

  console.log(`  📊 ${panels.length} panels à migrer\n`);

  const stats = new Map<string, number>();
  let unclassified = 0;
  const unclassifiedPanels: string[] = [];

  for (const panel of panels) {
    const categorySlug = classifyPanel(panel);

    if (categorySlug && categoryIdMap.has(categorySlug)) {
      const categoryId = categoryIdMap.get(categorySlug)!;

      await prisma.panel.update({
        where: { id: panel.id },
        data: { categoryId },
      });

      stats.set(categorySlug, (stats.get(categorySlug) || 0) + 1);
    } else {
      unclassified++;
      if (unclassifiedPanels.length < 20) {
        unclassifiedPanels.push(
          `${panel.name} (type: ${panel.panelType}, subType: ${panel.panelSubType}, decor: ${panel.decorCategory})`
        );
      }
    }
  }

  // 4. Rapport
  console.log('='.repeat(50));
  console.log('\n📊 RAPPORT DE MIGRATION\n');

  const sortedStats = [...stats.entries()].sort((a, b) => b[1] - a[1]);

  for (const [slug, count] of sortedStats) {
    console.log(`  ${slug}: ${count} panels`);
  }

  console.log(`\n  ⚠️ Non classés: ${unclassified} panels`);

  if (unclassifiedPanels.length > 0) {
    console.log('\n  Exemples de panels non classés:');
    for (const name of unclassifiedPanels) {
      console.log(`    - ${name}`);
    }
  }

  const total = panels.length - unclassified;
  console.log(`\n  ✅ ${total}/${panels.length} panels migrés (${((total / panels.length) * 100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Erreur:', e);
  prisma.$disconnect();
  process.exit(1);
});
