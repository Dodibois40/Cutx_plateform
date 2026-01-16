/**
 * Configuration Dispano - Catégories et sous-catégories
 *
 * Architecture claire séparée de Bouney
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

export const DISPANO_CONFIG = {
  baseUrl: 'https://www.dispano.fr',
  catalogueName: 'Dispano',
  catalogueSlug: 'dispano',
  referencePrefix: 'DISP',
};

/**
 * Structure complète des catégories Dispano
 * Chaque catégorie a ses sous-catégories avec les URLs exactes
 */
export const DISPANO_CATEGORIES: Category[] = [
  {
    name: 'Panneau Mélaminé Blanc',
    slug: 'panneau-melamine-blanc',
    url: 'https://www.dispano.fr/c/panneau-melamine-blanc/x2visu_dig_onv2_2027892R5',
    subCategories: [],
  },
  {
    name: 'Panneau Stratifié Blanc',
    slug: 'panneau-stratifie-blanc',
    url: 'https://www.dispano.fr/c/panneau-stratifie-blanc/x2visu_dig_onv2_2027903R5',
    subCategories: [],
  },
  {
    name: 'Panneau Mélaminé Décor',
    slug: 'panneau-melamine-decor',
    url: 'https://www.dispano.fr/c/panneau-melamine-decor/x2visu_dig_onv2_2027897R5',
    subCategories: [],
  },
  {
    name: 'Stratifiés HPL',
    slug: 'stratifies-hpl',
    url: 'https://www.dispano.fr/c/stratifies-hpl',
    subCategories: [
      { name: 'Stratifiés HPL Blanc', slug: 'stratifies-hpl-blanc', url: 'https://www.dispano.fr/c/stratifies-hpl-blanc' },
      { name: 'Stratifiés HPL Contrebalancement', slug: 'stratifies-hpl-contrebalancement', url: 'https://www.dispano.fr/c/stratifies-hpl-contrebalancement' },
      { name: 'Stratifiés HPL Décors', slug: 'stratifies-hpl-decors', url: 'https://www.dispano.fr/c/stratifies-hpl-decors' },
    ],
  },
  {
    name: 'Bande de chant',
    slug: 'bande-de-chant',
    url: 'https://www.dispano.fr/c/bande-de-chant',
    subCategories: [
      { name: 'ABS - standard', slug: 'abs-standard', url: 'https://www.dispano.fr/c/abs-standard' },
      { name: 'ABS - Laser/air chaud', slug: 'abs-laser-air-chaud', url: 'https://www.dispano.fr/c/abs-laser-air-chaud' },
      { name: 'Chant Mélaminé', slug: 'chant-melamine', url: 'https://www.dispano.fr/c/chant-melamine' },
      { name: 'Bois Naturel', slug: 'bois-naturel', url: 'https://www.dispano.fr/c/bois-naturel-chant' },
    ],
  },
  {
    name: 'Stratifié Compact HPL',
    slug: 'stratifie-compact-hpl',
    url: 'https://www.dispano.fr/c/stratifie-compact-hpl',
    subCategories: [
      { name: 'Sélection Cabine', slug: 'selection-cabine', url: 'https://www.dispano.fr/c/selection-cabine' },
      { name: 'Stratifié Compact HPL Extérieur', slug: 'stratifie-compact-hpl-exterieur', url: 'https://www.dispano.fr/c/stratifie-compact-hpl-exterieur' },
      { name: 'Stratifié Compact HPL Intérieur', slug: 'stratifie-compact-hpl-interieur', url: 'https://www.dispano.fr/c/stratifie-compact-hpl-interieur' },
    ],
  },
  {
    name: 'Résine de Synthèse',
    slug: 'resine-de-synthese',
    url: 'https://www.dispano.fr/c/resine-de-synthese',
    subCategories: [
      { name: 'Panneau Blanc', slug: 'resine-panneau-blanc', url: 'https://www.dispano.fr/c/resine-panneau-blanc' },
      { name: 'Panneau Décors', slug: 'resine-panneau-decors', url: 'https://www.dispano.fr/c/resine-panneau-decors' },
      { name: 'Vasques et Cuves', slug: 'vasques-et-cuves', url: 'https://www.dispano.fr/c/vasques-et-cuves' },
      { name: 'Accessoires', slug: 'resine-accessoires', url: 'https://www.dispano.fr/c/resine-accessoires' },
    ],
  },
  {
    name: 'Plan de Travail et Crédences',
    slug: 'plan-de-travail-credences',
    url: 'https://www.dispano.fr/c/plan-de-travail-et-credences',
    subCategories: [
      { name: 'Stratifiés HPL', slug: 'pdt-stratifies-hpl', url: 'https://www.dispano.fr/c/plan-de-travail-stratifies-hpl' },
      { name: 'Stratifiés Compact HPL', slug: 'pdt-stratifies-compact-hpl', url: 'https://www.dispano.fr/c/plan-de-travail-stratifies-compact-hpl' },
      { name: 'Bois Massif', slug: 'pdt-bois-massif', url: 'https://www.dispano.fr/c/plan-de-travail-bois-massif' },
      { name: 'Crédence', slug: 'credence', url: 'https://www.dispano.fr/c/credence' },
      { name: 'Accessoires', slug: 'pdt-accessoires', url: 'https://www.dispano.fr/c/plan-de-travail-accessoires' },
    ],
  },
  {
    name: 'Essences Fines',
    slug: 'essences-fines',
    url: 'https://www.dispano.fr/c/essences-fines',
    subCategories: [
      { name: 'Panneaux Bruts Classiques', slug: 'panneaux-bruts-classiques', url: 'https://www.dispano.fr/c/panneaux-bruts-classiques' },
      { name: 'Sélection Chêne Brut', slug: 'selection-chene-brut', url: 'https://www.dispano.fr/c/selection-chene-brut' },
      { name: 'Panneaux Finis Usine', slug: 'panneaux-finis-usine', url: 'https://www.dispano.fr/c/panneaux-finis-usine' },
      { name: 'Carrelets et Panneaux Décoratifs', slug: 'carrelets-panneaux-decoratifs', url: 'https://www.dispano.fr/c/carrelets-panneaux-decoratifs' },
      { name: 'Placages Essences Fines', slug: 'placages-essences-fines', url: 'https://www.dispano.fr/c/placages-essences-fines' },
      { name: 'Sélection Noyer Brut', slug: 'selection-noyer-brut', url: 'https://www.dispano.fr/c/selection-noyer-brut' },
    ],
  },
  {
    name: 'Panneau 3 Plis et Lamellés-Collés',
    slug: 'panneau-3-plis-lamelles-colles',
    url: 'https://www.dispano.fr/c/panneau-3-plis-et-lamelles-colles',
    subCategories: [
      { name: 'BauBuche', slug: 'baubuche', url: 'https://www.dispano.fr/c/baubuche' },
      { name: 'Panneau 3 Plis Feuillus', slug: 'panneau-3-plis-feuillus', url: 'https://www.dispano.fr/c/panneau-3-plis-feuillus' },
      { name: 'Panneau 3 Plis Résineux Décoratif', slug: 'panneau-3-plis-resineux-decoratif', url: 'https://www.dispano.fr/c/panneau-3-plis-resineux-decoratif' },
      { name: 'Panneau 3 Plis Vieux Bois', slug: 'panneau-3-plis-vieux-bois', url: 'https://www.dispano.fr/c/panneau-3-plis-vieux-bois' },
      { name: 'Panneau Lamellés-Collés feuillus', slug: 'panneau-lamelles-colles-feuillus', url: 'https://www.dispano.fr/c/panneau-lamelles-colles-feuillus' },
      { name: 'Stainer Sunwood', slug: 'stainer-sunwood', url: 'https://www.dispano.fr/c/stainer-sunwood' },
    ],
  },
  {
    name: 'Panneau 5 Plis et Lamellés-Collés',
    slug: 'panneau-5-plis-lamelles-colles',
    url: 'https://www.dispano.fr/c/panneau-5-plis-et-lamelles-colles',
    subCategories: [
      { name: 'Panneau 5 Plis Vieux bois', slug: 'panneau-5-plis-vieux-bois', url: 'https://www.dispano.fr/c/panneau-5-plis-vieux-bois' },
    ],
  },
  {
    name: 'MDF Teinté dans la Masse',
    slug: 'mdf-teinte-masse',
    url: 'https://www.dispano.fr/c/mdf-teinte-dans-la-masse',
    subCategories: [
      { name: 'FIBRACOLOUR', slug: 'fibracolour', url: 'https://www.dispano.fr/c/fibracolour' },
      { name: 'UNILIN', slug: 'unilin-mdf', url: 'https://www.dispano.fr/c/unilin-mdf-teinte' },
    ],
  },
  {
    name: 'Tablettes',
    slug: 'tablettes',
    url: 'https://www.dispano.fr/c/tablettes',
    subCategories: [
      { name: 'Tablettes Agencements', slug: 'tablettes-agencements', url: 'https://www.dispano.fr/c/tablettes-agencements' },
      { name: 'Tablettes Pré-percées', slug: 'tablettes-pre-percees', url: 'https://www.dispano.fr/c/tablettes-pre-percees' },
      { name: 'Tablettes Résineux', slug: 'tablettes-resineux', url: 'https://www.dispano.fr/c/tablettes-resineux' },
      { name: 'Tablettes Standard', slug: 'tablettes-standard', url: 'https://www.dispano.fr/c/tablettes-standard' },
    ],
  },
  {
    name: 'Panneau PVC Expancé',
    slug: 'panneau-pvc-expance',
    url: 'https://www.dispano.fr/c/panneau-pvc-expance',
    subCategories: [
      { name: 'Forex Classic', slug: 'forex-classic', url: 'https://www.dispano.fr/c/forex-classic' },
      { name: 'Forex Print', slug: 'forex-print', url: 'https://www.dispano.fr/c/forex-print' },
      { name: 'Matex', slug: 'matex', url: 'https://www.dispano.fr/c/matex' },
    ],
  },
  {
    name: 'Panneau Composite',
    slug: 'panneau-composite',
    url: 'https://www.dispano.fr/c/panneau-composite',
    subCategories: [
      { name: 'Dibond Alu', slug: 'dibond-alu', url: 'https://www.dispano.fr/c/dibond-alu' },
      { name: 'Matelbond', slug: 'matelbond', url: 'https://www.dispano.fr/c/matelbond' },
    ],
  },
  {
    name: 'Panneau Laine de Roche',
    slug: 'panneau-laine-roche',
    url: 'https://www.dispano.fr/c/panneau-laine-de-roche',
    subCategories: [
      { name: 'RockPanel', slug: 'rockpanel', url: 'https://www.dispano.fr/c/rockpanel' },
    ],
  },
  {
    name: 'Système de Panneaux Muraux',
    slug: 'systeme-panneaux-muraux',
    url: 'https://www.dispano.fr/c/systeme-de-panneaux-muraux',
    subCategories: [
      { name: 'Panneaux Muraux Standards', slug: 'panneaux-muraux-standards', url: 'https://www.dispano.fr/c/panneaux-muraux-standards' },
      { name: 'Panneaux Muraux Etanches', slug: 'panneaux-muraux-etanches', url: 'https://www.dispano.fr/c/panneaux-muraux-etanches' },
    ],
  },
  {
    name: 'Panneau de fibres surdensifié',
    slug: 'panneau-fibres-surdensifie',
    url: 'https://www.dispano.fr/c/panneau-de-fibres-surdensifie',
    subCategories: [
      { name: 'SWISS KRONO', slug: 'swiss-krono-surdensifie', url: 'https://www.dispano.fr/c/swiss-krono-surdensifie' },
    ],
  },
];

/**
 * Mapping des types de produits basé sur le nom/catégorie
 */
export function determineProductType(nom: string, categorySlug: string): string {
  const nomLower = nom.toLowerCase();
  const catLower = categorySlug.toLowerCase();

  // Bandes de chant
  if (catLower.includes('chant') || catLower.includes('abs')) {
    return 'BANDE_DE_CHANT';
  }

  // Stratifiés
  if (catLower.includes('stratifi') || nomLower.includes('stratifi') || catLower.includes('hpl')) {
    if (catLower.includes('compact')) {
      return 'COMPACT';
    }
    return 'STRATIFIE';
  }

  // Mélaminés
  if (catLower.includes('melamin') || nomLower.includes('melamin') || catLower.includes('ppsm')) {
    return 'MELAMINE';
  }

  // Placages / Essences fines
  if (catLower.includes('placage') || catLower.includes('essence') || catLower.includes('chene') || catLower.includes('noyer')) {
    return 'PLACAGE';
  }

  // MDF
  if (catLower.includes('mdf') || nomLower.includes('mdf')) {
    return 'MDF';
  }

  // Panneaux 3/5 plis
  if (catLower.includes('plis') || catLower.includes('lamelle')) {
    return 'PANNEAU_MASSIF';
  }

  // Plans de travail
  if (catLower.includes('plan-de-travail') || catLower.includes('credence')) {
    return 'PLAN_DE_TRAVAIL';
  }

  // Résine
  if (catLower.includes('resine')) {
    return 'RESINE';
  }

  // PVC / Composite
  if (catLower.includes('pvc') || catLower.includes('composite') || catLower.includes('dibond')) {
    return 'COMPOSITE';
  }

  // Tablettes
  if (catLower.includes('tablette')) {
    return 'TABLETTE';
  }

  // Default
  return 'AUTRE';
}

/**
 * Générer la référence unique pour un produit Dispano
 */
export function generateReference(refDispano: string, categorySlug: string): string {
  // Préfixes par type de catégorie
  const prefixMap: Record<string, string> = {
    'panneau-melamine-blanc': 'DISP-PMB',
    'panneau-stratifie-blanc': 'DISP-PSB',
    'panneau-melamine-decor': 'DISP-PMD',
    'stratifies-hpl': 'DISP-HPL',
    'bande-de-chant': 'DISP-CHT',
    'stratifie-compact-hpl': 'DISP-CMP',
    'resine-de-synthese': 'DISP-RES',
    'plan-de-travail-credences': 'DISP-PDT',
    'essences-fines': 'DISP-ESS',
    'panneau-3-plis-lamelles-colles': 'DISP-3PL',
    'panneau-5-plis-lamelles-colles': 'DISP-5PL',
    'mdf-teinte-masse': 'DISP-MDF',
    'tablettes': 'DISP-TAB',
    'panneau-pvc-expance': 'DISP-PVC',
    'panneau-composite': 'DISP-CPO',
    'panneau-laine-roche': 'DISP-LDR',
    'systeme-panneaux-muraux': 'DISP-MUR',
    'panneau-fibres-surdensifie': 'DISP-FIB',
  };

  const prefix = prefixMap[categorySlug] || 'DISP-XXX';
  return `${prefix}-${refDispano}`;
}
