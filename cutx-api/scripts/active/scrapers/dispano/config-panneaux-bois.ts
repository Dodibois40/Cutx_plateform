/**
 * Configuration Dispano - Panneaux Bois
 *
 * URLs exactes découvertes sur le site Dispano
 * Catégories: Contreplaqués, Lattés, MDF, Particules, OSB, etc.
 */

export interface SubCategory {
  name: string;
  slug: string;
  url: string;
}

export interface Category {
  name: string;
  slug: string;
  url: string;
  subCategories: SubCategory[];
}

export const DISPANO_PANNEAUX_BOIS_CONFIG = {
  baseUrl: 'https://www.dispano.fr',
  catalogueName: 'Dispano',
  catalogueSlug: 'dispano',
  referencePrefix: 'DISP',
};

/**
 * Catégories Panneaux Bois Dispano - URLs exactes
 */
export const PANNEAUX_BOIS_CATEGORIES: Category[] = [
  // ============================================
  // CONTREPLAQUÉS
  // ============================================
  {
    name: 'Contreplaqués',
    slug: 'contreplaques',
    url: 'https://www.dispano.fr/c/contreplaques/x2visu_dig_onv2_2027931R5',
    subCategories: [
      {
        name: 'Contreplaqués bois exotiques',
        slug: 'contreplaques-okoume',
        url: 'https://www.dispano.fr/c/contreplaques-okoume/x3visu_dig_onv3_2027932R5',
      },
      {
        name: 'Contreplaqués peuplier',
        slug: 'contreplaques-peuplier',
        url: 'https://www.dispano.fr/c/contreplaques-peuplier/x3visu_dig_onv3_2027934R5',
      },
      {
        name: 'Contreplaqués résineux',
        slug: 'contreplaques-resineux',
        url: 'https://www.dispano.fr/c/contreplaques-resineux/x3visu_dig_onv3_2027935R5',
      },
      {
        name: 'Contreplaqués bouleau',
        slug: 'contreplaques-bouleau',
        url: 'https://www.dispano.fr/c/contreplaques-bouleau/x3visu_dig_onv3_2027936R5',
      },
      {
        name: 'Contreplaqués import asie',
        slug: 'contreplaques-import-asie',
        url: 'https://www.dispano.fr/c/contreplaques-import-asie/x3visu_dig_onv3_2027937R5',
      },
      {
        name: 'Contreplaqués cintrables',
        slug: 'contreplaques-cintrables',
        url: 'https://www.dispano.fr/c/contreplaques-cintrables/x3visu_dig_onv3_2027938R5',
      },
      {
        name: 'Contreplaqués ignifugés',
        slug: 'contreplaques-ignifuges',
        url: 'https://www.dispano.fr/c/contreplaques-ignifuges/x3visu_dig_onv3_2027939R5',
      },
      {
        name: 'Contreplaqués antidérapants',
        slug: 'contreplaques-antiderapants',
        url: 'https://www.dispano.fr/c/contreplaques-antiderapants/x3visu_dig_onv3_2027940R5',
      },
      {
        name: 'Contreplaqués filmés & coffrages',
        slug: 'contreplaques-filmes-coffrages',
        url: 'https://www.dispano.fr/c/contreplaques-filmes-coffrages/x3visu_dig_onv3_2027941R5',
      },
      {
        name: 'Contreplaqués faces Mélaminé',
        slug: 'contreplaques-faces-melamine',
        url: 'https://www.dispano.fr/c/contreplaques-faces-melamine/x3visu_dig_onv3_2027943R5',
      },
      {
        name: 'Contreplaqué marine',
        slug: 'contreplaque-marine',
        url: 'https://www.dispano.fr/c/contreplaque-marine/x3visu_dig_onv3_2073599R5',
      },
    ],
  },

  // ============================================
  // LATTÉS
  // ============================================
  {
    name: 'Lattés',
    slug: 'lattes',
    url: 'https://www.dispano.fr/c/lattes/x2visu_dig_onv2_2027944R5',
    subCategories: [
      {
        name: 'Faces mdf/hdf',
        slug: 'faces-mdf-hdf',
        url: 'https://www.dispano.fr/c/faces-mdf-hdf/x3visu_dig_onv3_2027946R5',
      },
      // Note: "Faces peuplier" n'a pas été trouvé dans les URLs découvertes
      // Il est possible qu'il soit inclus dans "Lattés" principal
    ],
  },

  // ============================================
  // MDF & FIBRES DURES
  // ============================================
  {
    name: 'MDF & fibres dures',
    slug: 'mdf-fibres-dures',
    url: 'https://www.dispano.fr/c/mdf-fibres-dures/x2visu_dig_onv2_2027948R5',
    subCategories: [
      {
        name: 'MDF',
        slug: 'mdf',
        url: 'https://www.dispano.fr/c/mdf/x3visu_dig_onv3_2027949R5',
      },
      // Note: "Fibres dures" - à vérifier sur le site
    ],
  },

  // ============================================
  // PARTICULES
  // ============================================
  {
    name: 'Particules',
    slug: 'particules',
    url: 'https://www.dispano.fr/c/particules/x2visu_dig_onv2_2027951R5',
    subCategories: [
      {
        name: 'Panneaux de particules',
        slug: 'panneaux-de-particules',
        url: 'https://www.dispano.fr/c/panneaux-de-particules/x3visu_dig_onv3_2027952R5',
      },
      {
        name: 'Dalles de particules',
        slug: 'dalles-de-particules',
        url: 'https://www.dispano.fr/c/dalles-de-particules/x3visu_dig_onv3_2027953R5',
      },
    ],
  },

  // ============================================
  // OSB
  // ============================================
  {
    name: 'OSB',
    slug: 'osb',
    url: 'https://www.dispano.fr/c/osb/x2visu_dig_onv2_2027954R5',
    subCategories: [
      {
        name: 'Panneaux OSB - milieu humide',
        slug: 'panneaux-osb-milieu-humide',
        url: 'https://www.dispano.fr/c/panneaux-osb-milieu-humide/x3visu_dig_onv3_2027955R5',
      },
      {
        name: 'Dalles OSB - milieu humide',
        slug: 'dalles-osb-milieu-humide',
        url: 'https://www.dispano.fr/c/dalles-osb-milieu-humide/x3visu_dig_onv3_2027956R5',
      },
    ],
  },

  // ============================================
  // PANNEAUX LAMELLÉS COLLÉS & 3 PLIS
  // ============================================
  {
    name: 'Panneaux lamellés collés & panneaux 3 plis',
    slug: 'panneaux-lamelles-colles-3-plis',
    url: 'https://www.dispano.fr/c/panneaux-lamelles-colles-panneaux-3-plis-resineux/x2visu_dig_onv2_2027957R5',
    subCategories: [
      {
        name: 'Panneaux lamellés collés résineux',
        slug: 'panneaux-lamelles-colles-resineux',
        url: 'https://www.dispano.fr/c/panneaux-lamelles-colles-resineux/x3visu_dig_onv3_2027959R5',
      },
      // Autres sous-catégories 3 plis / 5 plis dans les catégories séparées
    ],
  },

  // ============================================
  // PANNEAU 3 PLIS ET LAMELLÉS-COLLÉS (Feuillus/Déco)
  // ============================================
  {
    name: 'Panneau 3 Plis et Lamellés-Collés',
    slug: 'panneau-3-plis-lamelles-colles',
    url: 'https://www.dispano.fr/c/panneau-3-plis-et-lamelles-colles/x2visu_dig_onv2_2027880R5',
    subCategories: [
      {
        name: 'Panneau Lamellés-Collés feuillus',
        slug: 'panneau-lamelles-colles-feuillus',
        url: 'https://www.dispano.fr/c/panneau-lamelles-colles-feuillus/x3visu_dig_onv3_2027886R5',
      },
    ],
  },

  // ============================================
  // PANNEAU 5 PLIS ET LAMELLÉS-COLLÉS
  // ============================================
  {
    name: 'Panneau 5 Plis et Lamellés-Collés',
    slug: 'panneau-5-plis-lamelles-colles',
    url: 'https://www.dispano.fr/c/panneau-5-plis-et-lamelles-colles/x2visu_dig_onv2_2076370R5',
    subCategories: [],
  },

  // ============================================
  // PANNEAUX POUR LA CONSTRUCTION
  // ============================================
  {
    name: 'Panneaux pour la construction',
    slug: 'panneaux-construction',
    url: 'https://www.dispano.fr/c/panneaux-pour-la-construction/x2visu_dig_onv2_2027961R5',
    subCategories: [
      // Les sous-catégories seront découvertes dynamiquement
      // Durelis, Unilin panels rwh, MFP P5, etc.
    ],
  },

  // ============================================
  // PANNEAU ALVÉOLAIRE
  // ============================================
  {
    name: 'Panneau Alvéolaire',
    slug: 'panneau-alveolaire',
    url: 'https://www.dispano.fr/c/panneau-alveolaire/x2visu_dig_onv2_2028113R5',
    subCategories: [],
  },

  // ============================================
  // COLLES
  // ============================================
  {
    name: 'Colles',
    slug: 'colles',
    url: 'https://www.dispano.fr/c/colles/x2visu_dig_onv2_2028111R5',
    subCategories: [
      {
        name: 'Colles à panneaux',
        slug: 'colles-a-panneaux',
        url: 'https://www.dispano.fr/c/colles-a-panneaux/x3visu_dig_onv3_2091071R5',
      },
    ],
  },

  // ============================================
  // MDF TEINTÉ DANS LA MASSE
  // ============================================
  {
    name: 'MDF Teinté dans la Masse',
    slug: 'mdf-teinte-masse',
    url: 'https://www.dispano.fr/c/mdf-teinte-dans-la-masse/x2visu_dig_onv2_2027878R5',
    subCategories: [],
  },
];

/**
 * Mapping des types de produits pour les panneaux bois
 */
export function determineProductTypePanneauxBois(nom: string, categorySlug: string): string {
  const catLower = categorySlug.toLowerCase();
  const nomLower = nom.toLowerCase();

  // Contreplaqués
  if (catLower.includes('contreplaque') || catLower.includes('okoume')) {
    return 'CONTREPLAQUE';
  }

  // Lattés
  if (catLower.includes('latte') || catLower.includes('faces-')) {
    return 'LATTE';
  }

  // MDF
  if (catLower.includes('mdf') || nomLower.includes('mdf')) {
    return 'MDF';
  }

  // Fibres dures
  if (catLower.includes('fibres-dures')) {
    return 'FIBRE_DURE';
  }

  // Particules
  if (catLower.includes('particule')) {
    return 'PARTICULE';
  }

  // OSB
  if (catLower.includes('osb') || nomLower.includes('osb')) {
    return 'OSB';
  }

  // Panneaux lamellés / 3 plis / 5 plis
  if (catLower.includes('plis') || catLower.includes('lamelle')) {
    return 'PANNEAU_MASSIF';
  }

  // Panneaux construction
  if (catLower.includes('construction') || catLower.includes('durelis') ||
      catLower.includes('mfp') || catLower.includes('contreventement')) {
    return 'PANNEAU_CONSTRUCTION';
  }

  // Alvéolaire
  if (catLower.includes('alveolaire') || catLower.includes('eurolight')) {
    return 'ALVEOLAIRE';
  }

  // Colles
  if (catLower.includes('colle')) {
    return 'COLLE';
  }

  return 'AUTRE';
}

/**
 * Générer la référence unique pour un produit Panneaux Bois
 */
export function generateReferencePanneauxBois(refDispano: string, categorySlug: string): string {
  const prefixMap: Record<string, string> = {
    // Contreplaqués
    'contreplaques-okoume': 'DISP-CPE',
    'contreplaques-peuplier': 'DISP-CPP',
    'contreplaques-resineux': 'DISP-CPR',
    'contreplaques-bouleau': 'DISP-CPB',
    'contreplaques-import-asie': 'DISP-CPA',
    'contreplaques-cintrables': 'DISP-CPC',
    'contreplaques-ignifuges': 'DISP-CPI',
    'contreplaques-antiderapants': 'DISP-CPAD',
    'contreplaques-filmes-coffrages': 'DISP-CPF',
    'contreplaques-faces-melamine': 'DISP-CPM',
    'contreplaque-marine': 'DISP-CPMA',
    // Lattés
    'faces-mdf-hdf': 'DISP-LMH',
    'lattes': 'DISP-LAT',
    // MDF
    'mdf': 'DISP-MDF',
    'mdf-fibres-dures': 'DISP-MFD',
    'mdf-teinte-masse': 'DISP-MDT',
    // Particules
    'panneaux-de-particules': 'DISP-PAR',
    'dalles-de-particules': 'DISP-DAP',
    'particules': 'DISP-PRT',
    // OSB
    'panneaux-osb-milieu-humide': 'DISP-OSB',
    'dalles-osb-milieu-humide': 'DISP-DOB',
    'osb': 'DISP-OSB',
    // Lamellés / 3 plis / 5 plis
    'panneaux-lamelles-colles-3-plis': 'DISP-LC3',
    'panneaux-lamelles-colles-resineux': 'DISP-LCR',
    'panneau-3-plis-lamelles-colles': 'DISP-3PL',
    'panneau-lamelles-colles-feuillus': 'DISP-LCF',
    'panneau-5-plis-lamelles-colles': 'DISP-5PL',
    // Construction
    'panneaux-construction': 'DISP-CON',
    // Alvéolaire
    'panneau-alveolaire': 'DISP-ALV',
    // Colles
    'colles': 'DISP-COL',
    'colles-a-panneaux': 'DISP-CLP',
  };

  const prefix = prefixMap[categorySlug] || 'DISP-PBX';
  return `${prefix}-${refDispano}`;
}

/**
 * Liste plate de toutes les sous-catégories pour scraping séquentiel
 */
export function getAllSubCategories(): SubCategory[] {
  const allSubs: SubCategory[] = [];

  for (const cat of PANNEAUX_BOIS_CATEGORIES) {
    if (cat.subCategories.length > 0) {
      allSubs.push(...cat.subCategories);
    } else {
      // Si pas de sous-catégories, utiliser la catégorie principale
      allSubs.push({
        name: cat.name,
        slug: cat.slug,
        url: cat.url,
      });
    }
  }

  return allSubs;
}

// Export de la liste complète pour le menu
export const ALL_PANNEAUX_BOIS_SUBCATEGORIES = getAllSubCategories();

/**
 * Afficher un résumé des catégories
 */
export function printCategorySummary(): void {
  console.log('\n📋 Catégories Panneaux Bois Dispano:\n');
  console.log('='.repeat(50));

  let totalSub = 0;
  for (const cat of PANNEAUX_BOIS_CATEGORIES) {
    const subCount = cat.subCategories.length || 1;
    totalSub += subCount;
    console.log(`\n🔵 ${cat.name} (${subCount} sous-cat.)`);
    for (const sub of cat.subCategories) {
      console.log(`   └─ ${sub.name}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Total: ${PANNEAUX_BOIS_CATEGORIES.length} catégories, ${totalSub} à scraper`);
}
