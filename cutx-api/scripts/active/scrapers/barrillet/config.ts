/**
 * Configuration Barrillet - Categories et sous-categories
 *
 * Structure hierarchique du catalogue Barrillet
 * Basee sur le menu de navigation du site
 */

export interface SubCategory {
  name: string;
  slug: string;
  url?: string;
}

export interface Category {
  name: string;
  slug: string;
  url?: string;
  subCategories: SubCategory[];
}

export const BARRILLET_CONFIG = {
  baseUrl: 'https://www.barillet-distribution.fr',
  catalogueName: 'Barrillet',
  catalogueSlug: 'barrillet',
  referencePrefix: 'BARR',
};

/**
 * Structure complete des categories Barrillet
 * 15 categories principales avec leurs sous-categories
 */
export const BARRILLET_CATEGORIES: Category[] = [
  // 1. Panneau melamine
  {
    name: 'Panneau melamine',
    slug: 'panneau-melamine',
    url: 'https://www.barillet-distribution.fr/panneau/panneau-melamine',
    subCategories: [
      { name: 'Melamine blanc', slug: 'melamine-blanc', url: 'https://www.barillet-distribution.fr/panneau/panneau-melamine/melamine-blanc' },
      { name: 'Melamine decor', slug: 'melamine-decor', url: 'https://www.barillet-distribution.fr/panneau/panneau-melamine/melamine-decor' },
      { name: 'Tablette melaminee', slug: 'tablette-melaminee', url: 'https://www.barillet-distribution.fr/panneau/panneau-melamine/tablette-melaminee' },
    ],
  },

  // 2. Panneau stratifie
  {
    name: 'Panneau stratifie',
    slug: 'panneau-stratifie',
    url: 'https://www.barillet-distribution.fr/panneau/panneau-stratifie',
    subCategories: [
      { name: 'Stratifie blanc', slug: 'stratifie-blanc', url: 'https://www.barillet-distribution.fr/panneau/panneau-stratifie/stratifie-blanc' },
      { name: 'Stratifie contrebalancement', slug: 'stratifie-contrebalancement', url: 'https://www.barillet-distribution.fr/panneau/panneau-stratifie/stratifie-contrebalancement' },
      { name: 'Stratifie decor', slug: 'stratifie-decor', url: 'https://www.barillet-distribution.fr/panneau/panneau-stratifie/stratifie-decor' },
      { name: 'Replaque stratifie', slug: 'replaque-stratifie', url: 'https://www.barillet-distribution.fr/panneau/panneau-stratifie/replaque-stratifie' },
      { name: 'Stratifie metal', slug: 'stratifie-metal', url: 'https://www.barillet-distribution.fr/panneau/panneau-stratifie/stratifie-metal' },
    ],
  },

  // 3. Panneau compact
  {
    name: 'Panneau compact',
    slug: 'panneau-compact',
    url: 'https://www.barillet-distribution.fr/panneau/panneau-compact',
    subCategories: [
      { name: 'Compact interieur', slug: 'compact-interieur', url: 'https://www.barillet-distribution.fr/panneau/panneau-compact/compact-interieur' },
    ],
  },

  // 4. Resine de synthese
  {
    name: 'Resine de synthese',
    slug: 'resine-de-synthese',
    url: 'https://www.barillet-distribution.fr/panneau/resine-de-synthese',
    subCategories: [
      { name: 'Resine decor', slug: 'resine-decor', url: 'https://www.barillet-distribution.fr/panneau/resine-de-synthese/resine-decor' },
      { name: 'Accessoire resine', slug: 'accessoire-resine', url: 'https://www.barillet-distribution.fr/panneau/resine-de-synthese/accessoire-resine' },
    ],
  },

  // 5. Plan de travail
  {
    name: 'Plan de travail',
    slug: 'plan-de-travail',
    url: 'https://www.barillet-distribution.fr/panneau/plan-de-travail',
    subCategories: [
      { name: 'Plan de travail bois', slug: 'plan-de-travail-bois', url: 'https://www.barillet-distribution.fr/panneau/plan-de-travail/plan-de-travail-bois' },
      { name: 'Plan de travail stratifie', slug: 'plan-de-travail-stratifie', url: 'https://www.barillet-distribution.fr/panneau/plan-de-travail/plan-de-travail-stratifie' },
      { name: 'Plan de travail compact', slug: 'plan-de-travail-compact', url: 'https://www.barillet-distribution.fr/panneau/plan-de-travail/plan-de-travail-compact' },
    ],
  },

  // 6. Panneaux massifs
  {
    name: 'Panneaux massifs',
    slug: 'panneaux-massifs',
    url: 'https://www.barillet-distribution.fr/panneau/panneaux-massifs',
    subCategories: [
      { name: 'Panneaute (LMC non aboute)', slug: 'panneaute-lmc-non-aboute', url: 'https://www.barillet-distribution.fr/panneau/panneaux-massifs/panneaute-lmc-non-aboute' },
      { name: 'Panneau 3/5 plis', slug: 'panneau-3-5-plis', url: 'https://www.barillet-distribution.fr/panneau/panneaux-massifs/panneau-3-5-plis' },
      { name: 'Panneau lamelle-colle (aboute)', slug: 'panneau-lamelle-colle-aboute', url: 'https://www.barillet-distribution.fr/panneau/panneaux-massifs/panneau-lamelle-colle-aboute' },
    ],
  },

  // 7. Panneau contreplaque
  {
    name: 'Panneau contreplaque',
    slug: 'panneau-contreplaque',
    url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque',
    subCategories: [
      { name: 'Contreplaque Okoume', slug: 'contreplaque-okoume', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-okoume' },
      { name: 'Contreplaque Peuplier', slug: 'contreplaque-peuplier', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-peuplier' },
      { name: 'Contreplaque Exotique', slug: 'contreplaque-exotique', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-exotique' },
      { name: 'Contreplaque Meranti', slug: 'contreplaque-meranti', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-meranti' },
      { name: 'Contreplaque Ilomba', slug: 'contreplaque-ilomba', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-ilomba' },
      { name: 'Contreplaque Bouleau', slug: 'contreplaque-bouleau', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-bouleau' },
      { name: 'Contreplaque Resineux', slug: 'contreplaque-resineux', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-resineux' },
      { name: 'Contreplaque a cintrer', slug: 'contreplaque-a-cintrer', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-a-cintrer' },
      { name: 'Contreplaque filme et antiderapant', slug: 'contreplaque-filme-antiderapant', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-filme-antiderapant' },
      { name: "Contreplaque d'emballage", slug: 'contreplaque-emballage', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-emballage' },
      { name: 'Contreplaque leger', slug: 'contreplaque-leger', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-leger' },
      { name: 'Contreplaque Marine', slug: 'contreplaque-marine', url: 'https://www.barillet-distribution.fr/panneau/panneau-contreplaque/contreplaque-marine' },
    ],
  },

  // 8. Panneau latte
  {
    name: 'Panneau latte',
    slug: 'panneau-latte',
    url: 'https://www.barillet-distribution.fr/panneau/panneau-latte',
    subCategories: [
      { name: 'Latte faces MDF', slug: 'latte-faces-mdf', url: 'https://www.barillet-distribution.fr/panneau/panneau-latte/latte-faces-mdf' },
      { name: 'Latte faces Exotique', slug: 'latte-faces-exotique', url: 'https://www.barillet-distribution.fr/panneau/panneau-latte/latte-faces-exotique' },
      { name: 'Latte faces Peuplier', slug: 'latte-faces-peuplier', url: 'https://www.barillet-distribution.fr/panneau/panneau-latte/latte-faces-peuplier' },
      { name: 'Latte leger', slug: 'latte-leger', url: 'https://www.barillet-distribution.fr/panneau/panneau-latte/latte-leger' },
    ],
  },

  // 9. OSB
  {
    name: 'OSB',
    slug: 'osb',
    url: 'https://www.barillet-distribution.fr/panneau/osb',
    subCategories: [
      { name: 'Panneau OSB', slug: 'panneau-osb', url: 'https://www.barillet-distribution.fr/panneau/osb/panneau-osb' },
      { name: 'Dalle OSB', slug: 'dalle-osb', url: 'https://www.barillet-distribution.fr/panneau/osb/dalle-osb' },
    ],
  },

  // 10. Bois-ciment
  {
    name: 'Bois-ciment',
    slug: 'bois-ciment',
    url: 'https://www.barillet-distribution.fr/panneau/bois-ciment',
    subCategories: [
      { name: 'Panneau bois-ciment', slug: 'panneau-bois-ciment', url: 'https://www.barillet-distribution.fr/panneau/bois-ciment/panneau-bois-ciment' },
    ],
  },

  // 11. Panneau MDF et fibres
  {
    name: 'Panneau MDF et fibres',
    slug: 'panneau-mdf-fibres',
    url: 'https://www.barillet-distribution.fr/panneau/panneau-mdf-fibres',
    subCategories: [
      { name: 'MDF standard', slug: 'mdf-standard', url: 'https://www.barillet-distribution.fr/panneau/panneau-mdf-fibres/mdf-standard' },
      { name: 'MDF a laquer', slug: 'mdf-a-laquer', url: 'https://www.barillet-distribution.fr/panneau/panneau-mdf-fibres/mdf-a-laquer' },
      { name: 'MDF a cintrer', slug: 'mdf-a-cintrer', url: 'https://www.barillet-distribution.fr/panneau/panneau-mdf-fibres/mdf-a-cintrer' },
      { name: 'Fibres dures', slug: 'fibres-dures', url: 'https://www.barillet-distribution.fr/panneau/panneau-mdf-fibres/fibres-dures' },
      { name: 'MDF teinte et texture', slug: 'mdf-teinte-texture', url: 'https://www.barillet-distribution.fr/panneau/panneau-mdf-fibres/mdf-teinte-texture' },
      { name: 'MDF leger', slug: 'mdf-leger', url: 'https://www.barillet-distribution.fr/panneau/panneau-mdf-fibres/mdf-leger' },
    ],
  },

  // 12. Bande de chant
  {
    name: 'Bande de chant',
    slug: 'bande-de-chant',
    url: 'https://www.barillet-distribution.fr/panneau/bande-de-chant',
    subCategories: [
      { name: 'Bande de chant ABS', slug: 'bande-de-chant-abs', url: 'https://www.barillet-distribution.fr/panneau/bande-de-chant/bande-de-chant-abs' },
      { name: 'Bande de chant melamine', slug: 'bande-de-chant-melamine', url: 'https://www.barillet-distribution.fr/panneau/bande-de-chant/bande-de-chant-melamine' },
      { name: 'Bande de chant bois veritable', slug: 'bande-de-chant-bois-veritable', url: 'https://www.barillet-distribution.fr/panneau/bande-de-chant/bande-de-chant-bois-veritable' },
    ],
  },

  // 13. Panneau agglomere
  {
    name: 'Panneau agglomere',
    slug: 'panneau-agglomere',
    url: 'https://www.barillet-distribution.fr/panneau/panneau-agglomere',
    subCategories: [
      { name: 'Agglomere standard', slug: 'agglomere-standard', url: 'https://www.barillet-distribution.fr/panneau/panneau-agglomere/agglomere-standard' },
      { name: 'Agglomere antiderapant', slug: 'agglomere-antiderapant', url: 'https://www.barillet-distribution.fr/panneau/panneau-agglomere/agglomere-antiderapant' },
      { name: 'Agglomere leger', slug: 'agglomere-leger', url: 'https://www.barillet-distribution.fr/panneau/panneau-agglomere/agglomere-leger' },
      { name: 'Dalle agglomere', slug: 'dalle-agglomere', url: 'https://www.barillet-distribution.fr/panneau/panneau-agglomere/dalle-agglomere' },
    ],
  },

  // 14. Essences fines
  {
    name: 'Essences fines',
    slug: 'essences-fines',
    url: 'https://www.barillet-distribution.fr/panneau/essences-fines',
    subCategories: [
      { name: 'Placage et stratifie essences fines', slug: 'placage-stratifie-essences-fines', url: 'https://www.barillet-distribution.fr/panneau/essences-fines/placage-stratifie-essences-fines' },
      { name: 'Panneau essences fines', slug: 'panneau-essences-fines', url: 'https://www.barillet-distribution.fr/panneau/essences-fines/panneau-essences-fines' },
    ],
  },

  // 15. Panneau mural
  {
    name: 'Panneau mural',
    slug: 'panneau-mural',
    url: 'https://www.barillet-distribution.fr/panneau/panneau-mural',
    subCategories: [
      { name: 'Panneau mural etanche', slug: 'panneau-mural-etanche', url: 'https://www.barillet-distribution.fr/panneau/panneau-mural/panneau-mural-etanche' },
      { name: 'Panneau mural divers', slug: 'panneau-mural-divers', url: 'https://www.barillet-distribution.fr/panneau/panneau-mural/panneau-mural-divers' },
    ],
  },
];

/**
 * Mapping des types de produits base sur le nom/categorie
 */
export function determineProductType(nom: string, categorySlug: string): string {
  const nomLower = nom.toLowerCase();
  const catLower = categorySlug.toLowerCase();

  // Bandes de chant
  if (catLower.includes('chant') || catLower.includes('abs')) {
    return 'BANDE_DE_CHANT';
  }

  // Stratifies
  if (catLower.includes('stratifi') || nomLower.includes('stratifi')) {
    if (catLower.includes('compact')) {
      return 'COMPACT';
    }
    return 'STRATIFIE';
  }

  // Melanines
  if (catLower.includes('melamin') || nomLower.includes('melamin')) {
    return 'MELAMINE';
  }

  // Compacts
  if (catLower.includes('compact')) {
    return 'COMPACT';
  }

  // Contreplaque
  if (catLower.includes('contreplaque') || nomLower.includes('contreplaque')) {
    return 'CONTREPLAQUE';
  }

  // OSB
  if (catLower.includes('osb') || nomLower.includes('osb')) {
    return 'OSB';
  }

  // MDF
  if (catLower.includes('mdf') || nomLower.includes('mdf') || catLower.includes('fibres')) {
    return 'MDF';
  }

  // Agglomere
  if (catLower.includes('agglomere') || nomLower.includes('agglomere')) {
    return 'AGGLOMERE';
  }

  // Panneaux massifs / Latte / Lamelle-colle
  if (
    catLower.includes('massif') ||
    catLower.includes('latte') ||
    catLower.includes('lamelle') ||
    catLower.includes('plis')
  ) {
    return 'MASSIF';
  }

  // Plans de travail
  if (catLower.includes('plan-de-travail')) {
    return 'PLAN_DE_TRAVAIL';
  }

  // Resine
  if (catLower.includes('resine')) {
    return 'SOLID_SURFACE';
  }

  // Placages / Essences fines
  if (catLower.includes('placage') || catLower.includes('essence')) {
    return 'PLACAGE';
  }

  // Panneau mural
  if (catLower.includes('mural')) {
    return 'PANNEAU_MURAL';
  }

  // Bois-ciment
  if (catLower.includes('ciment')) {
    return 'BOIS_CIMENT';
  }

  // Default
  return 'AUTRE';
}

/**
 * Generer la reference unique pour un produit Barrillet
 */
export function generateReference(refBarrillet: string, categorySlug: string): string {
  // Prefixes par type de categorie
  const prefixMap: Record<string, string> = {
    'panneau-melamine': 'BARR-MEL',
    'panneau-stratifie': 'BARR-STR',
    'panneau-compact': 'BARR-CMP',
    'resine-de-synthese': 'BARR-RES',
    'plan-de-travail': 'BARR-PDT',
    'panneaux-massifs': 'BARR-MAS',
    'panneau-contreplaque': 'BARR-CTR',
    'panneau-latte': 'BARR-LAT',
    'osb': 'BARR-OSB',
    'bois-ciment': 'BARR-BCM',
    'panneau-mdf-fibres': 'BARR-MDF',
    'bande-de-chant': 'BARR-CHT',
    'panneau-agglomere': 'BARR-AGG',
    'essences-fines': 'BARR-ESS',
    'panneau-mural': 'BARR-MUR',
  };

  // Trouver le prefixe base sur la categorie parente
  let prefix = 'BARR-XXX';
  for (const [catSlug, pref] of Object.entries(prefixMap)) {
    if (categorySlug.startsWith(catSlug) || categorySlug.includes(catSlug)) {
      prefix = pref;
      break;
    }
  }

  return `${prefix}-${refBarrillet}`;
}

/**
 * Obtenir toutes les sous-categories aplaties
 */
export function getAllSubCategories(): { parent: Category; sub: SubCategory }[] {
  const result: { parent: Category; sub: SubCategory }[] = [];

  for (const category of BARRILLET_CATEGORIES) {
    for (const sub of category.subCategories) {
      result.push({ parent: category, sub });
    }
  }

  return result;
}

/**
 * Stats des categories
 */
export function getCategoryStats(): {
  totalCategories: number;
  totalSubCategories: number;
  breakdown: { category: string; subCount: number }[];
} {
  const breakdown = BARRILLET_CATEGORIES.map((cat) => ({
    category: cat.name,
    subCount: cat.subCategories.length,
  }));

  return {
    totalCategories: BARRILLET_CATEGORIES.length,
    totalSubCategories: breakdown.reduce((sum, b) => sum + b.subCount, 0),
    breakdown,
  };
}
