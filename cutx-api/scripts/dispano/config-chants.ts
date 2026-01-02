/**
 * Configuration pour le scraper Dispano - Catalogue Chants (Bandes de chant)
 *
 * Catégories principales (URLs découvertes):
 * - ABS Standard (tous les chants ABS standard)
 * - ABS Laser/Air chaud
 * - Chant Mélaminé
 * - Bois naturel (avec sous-catégories)
 *
 * Note: Prix = prix unitaire par rouleau
 *       La longueur du rouleau est une donnée clé
 */

export interface ChantSubCategory {
  name: string;
  slug: string;
  url: string;
}

export interface ChantCategory {
  name: string;
  slug: string;
  url: string;
  subCategories: ChantSubCategory[];
}

// Configuration du catalogue
export const DISPANO_CHANTS_CONFIG = {
  catalogueSlug: 'dispano',
  catalogueName: 'Dispano',
  baseUrl: 'https://www.dispano.fr',
  referencePrefix: 'DISP-CHT',
};

/**
 * Structure complète des catégories Chants Dispano
 * URLs découvertes et vérifiées sur le site
 */
export const CHANTS_CATEGORIES: ChantCategory[] = [
  // ============================================
  // ABS - STANDARD (catégorie principale, pas de sous-catégories séparées)
  // ============================================
  {
    name: 'ABS - Standard',
    slug: 'abs-standard',
    url: 'https://www.dispano.fr/c/abs-standard/x2visu_dig_onv2_2079134R5',
    subCategories: [], // Tous les produits sont dans la catégorie principale
  },

  // ============================================
  // ABS - LASER / AIR CHAUD
  // ============================================
  {
    name: 'ABS - Laser/Air chaud',
    slug: 'abs-laser',
    url: 'https://www.dispano.fr/c/abs-laser-air-chaud/x2visu_dig_onv2_2079175R5',
    subCategories: [],
  },

  // ============================================
  // CHANT MÉLAMINÉ
  // ============================================
  {
    name: 'Chant Mélaminé',
    slug: 'chant-melamine',
    url: 'https://www.dispano.fr/c/chant-melamine/x2visu_dig_onv2_2079192R5',
    subCategories: [],
  },

  // ============================================
  // BOIS NATUREL (avec sous-catégories)
  // ============================================
  {
    name: 'Bois naturel',
    slug: 'bois-naturel',
    url: 'https://www.dispano.fr/c/bois-naturel/x2snv2_dig_2036040R5',
    subCategories: [
      {
        name: 'Chant bois non-encollé',
        slug: 'bois-non-encolle',
        url: 'https://www.dispano.fr/c/offre-chant-bois-non-encolle/x3snv3_dig_2036044R5',
      },
      {
        name: 'Chant bois pré-encollé',
        slug: 'bois-pre-encolle',
        url: 'https://www.dispano.fr/c/offre-chant-bois-pre-encolle/x3visu_dig_onv3_2103219R5',
      },
      {
        name: 'Decospan Querkus',
        slug: 'decospan-querkus',
        url: 'https://www.dispano.fr/c/decospan-querkus/x3visu_dig_onv3_2103221R5',
      },
      {
        name: 'Decospan Nuxe',
        slug: 'decospan-nuxe',
        url: 'https://www.dispano.fr/c/decospan-nuxe/x3visu_dig_onv3_2103222R5',
      },
      {
        name: 'Losan Suman',
        slug: 'losan-suman',
        url: 'https://www.dispano.fr/c/losan-suman/x3visu_dig_onv3_2103225R5',
      },
    ],
  },
];

/**
 * Type de chant basé sur la catégorie
 */
export type ChantType = 'ABS_STANDARD' | 'ABS_LASER' | 'MELAMINE' | 'BOIS_NATUREL' | 'AUTRE';

export function determineChantType(categorySlug: string): ChantType {
  if (categorySlug.startsWith('abs-standard')) return 'ABS_STANDARD';
  if (categorySlug.startsWith('abs-laser')) return 'ABS_LASER';
  if (categorySlug.startsWith('chant-melamine')) return 'MELAMINE';
  if (
    categorySlug.includes('bois') ||
    categorySlug.includes('decospan') ||
    categorySlug.includes('losan')
  ) {
    return 'BOIS_NATUREL';
  }
  return 'AUTRE';
}

/**
 * Génère une référence unique pour un chant
 */
export function generateReferenceChant(refDispano: string, categorySlug: string): string {
  const prefixMap: Record<string, string> = {
    // ABS Standard
    'abs-standard': 'DISP-ABS',
    // ABS Laser
    'abs-laser': 'DISP-ALZ',
    // Chant Mélaminé
    'chant-melamine': 'DISP-CML',
    // Bois naturel
    'bois-naturel': 'DISP-BNT',
    'bois-non-encolle': 'DISP-BNE',
    'bois-pre-encolle': 'DISP-BPE',
    'decospan-querkus': 'DISP-DQK',
    'decospan-nuxe': 'DISP-DNX',
    'losan-suman': 'DISP-LSM',
  };

  const prefix = prefixMap[categorySlug] || 'DISP-CHT';
  return `${prefix}-${refDispano}`;
}

/**
 * Liste plate de toutes les catégories/sous-catégories pour scraping séquentiel
 */
export function getAllChantSubCategories(): ChantSubCategory[] {
  const allSubs: ChantSubCategory[] = [];

  for (const cat of CHANTS_CATEGORIES) {
    if (cat.subCategories.length > 0) {
      // Si la catégorie a des sous-catégories, les ajouter
      allSubs.push(...cat.subCategories);
    } else {
      // Sinon, utiliser la catégorie principale comme "sous-catégorie"
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
export const ALL_CHANTS_SUBCATEGORIES = getAllChantSubCategories();

/**
 * Affiche un résumé des catégories
 */
export function printChantCategorySummary(): void {
  console.log('\n======================================');
  console.log('   CATALOGUE CHANTS DISPANO');
  console.log('======================================\n');

  let totalSub = 0;
  for (const cat of CHANTS_CATEGORIES) {
    const subCount = cat.subCategories.length || 1;
    totalSub += subCount;
    console.log(`${cat.name} (${subCount} a scraper)`);
    console.log(`   URL: ${cat.url}`);
    for (const sub of cat.subCategories) {
      console.log(`   - ${sub.name}`);
      console.log(`     ${sub.url}`);
    }
    console.log('');
  }

  console.log('======================================');
  console.log(`Total: ${CHANTS_CATEGORIES.length} categories, ${totalSub} a scraper`);
  console.log('======================================\n');
}
