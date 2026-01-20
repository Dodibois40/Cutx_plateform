'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { CategoryTreeNode, BreadcrumbItem } from '../types';

/**
 * Mapping productType (du parser) → slug catégorie niveau 1
 * Ces valeurs correspondent aux slugs de l'arbre CutX
 */
const PRODUCT_TYPE_TO_CATEGORY: Record<string, string> = {
  MELAMINE: 'melamines',
  STRATIFIE: 'stratifies-hpl',
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  COMPACT: 'compacts-hpl',
  CONTREPLAQUE: 'contreplaque',
  OSB: 'osb',
  PLACAGE: 'plaques-bois', // Nouvelle branche niveau 1
  BANDE_DE_CHANT: 'chants',
  PANNEAU_MASSIF: 'bois-massifs',
  SOLID_SURFACE: 'solid-surface',
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  // Nouveaux types (Phase 2)
  PANNEAU_MURAL: 'panneaux-muraux',
  PANNEAU_DECORATIF: 'panneaux-decoratifs',
  PANNEAU_3_PLIS: 'panneaux-3-plis',
  LATTE: 'panneaux-lattes',
  PANNEAU_ISOLANT: 'panneaux-isolants',
  PANNEAU_ALVEOLAIRE: 'panneaux-alveolaires',
  CIMENT_BOIS: 'ciment-bois',
};

/**
 * Mapping productType + qualificatif → slug catégorie plus précis
 */
const PRODUCT_SUBCATEGORY_MAPPING: Record<string, Record<string, string>> = {
  MDF: {
    hydrofuge: 'mdf-hydrofuge',
    ignifugé: 'mdf-ignifuge',
    ignifuge: 'mdf-ignifuge',
    teinté: 'mdf-teinte',
    standard: 'mdf-standard',
    léger: 'mdf-leger',
    laqué: 'mdf-laquer',
  },
  PARTICULE: {
    hydrofuge: 'agglo-hydrofuge',
    ignifugé: 'agglo-ignifuge',
    standard: 'agglo-standard',
  },
  OSB: {
    hydrofuge: 'osb-hydrofuge',
    standard: 'osb-standard',
  },
};

/**
 * Mapping productType + decorCategory → sous-catégorie décor
 * Pour Mélaminés et Stratifiés qui ont des décors (unis, bois, fantaisie, pierre)
 */
const DECOR_SUBCATEGORY_MAPPING: Record<string, Record<string, string>> = {
  MELAMINE: {
    unis: 'mela-unis',
    bois: 'mela-bois',
    fantaisie: 'mela-fantaisie',
    pierre: 'mela-pierre',
    béton: 'mela-pierre',
  },
  STRATIFIE: {
    unis: 'strat-unis',
    bois: 'strat-bois',
    fantaisie: 'strat-fantaisie',
    pierre: 'strat-pierre',
    métal: 'strat-pierre',
  },
};

/**
 * Essences de bois connues (détectées dans searchTerms)
 * Ces termes impliquent un décor "bois"
 */
const WOOD_ESSENCES = [
  'chêne', 'chene', 'oak',
  'noyer', 'walnut',
  'hêtre', 'hetre', 'beech',
  'frêne', 'frene', 'ash',
  'érable', 'erable', 'maple',
  'bouleau', 'birch',
  'pin', 'sapin', 'épicéa', 'epicea',
  'merisier', 'cerisier',
  'acacia', 'wengé', 'wenge',
  'teck', 'okoumé', 'okoume',
];

/**
 * Couleurs connues (détectées dans searchTerms)
 * Ces termes impliquent un décor "unis"
 */
const COLOR_TERMS = [
  'blanc', 'white',
  'noir', 'black',
  'gris', 'grey', 'gray',
  'beige', 'crème', 'creme',
  'anthracite', 'taupe',
];

/**
 * Slugs des chants ABS par décor
 */
const CHANT_SUBCATEGORY_MAPPING: Record<string, string> = {
  unis: 'abs-unis',
  bois: 'abs-bois',
  fantaisie: 'abs-fantaisie',
};

/**
 * Mapping essence de bois → sous-catégorie de placage
 * Pour les Plaqués Bois (vrais placages bois)
 */
const PLACAGE_ESSENCE_MAPPING: Record<string, string> = {
  chêne: 'placage-chene',
  chene: 'placage-chene',
  oak: 'placage-chene',
  noyer: 'placage-noyer',
  walnut: 'placage-noyer',
  hêtre: 'placage-hetre',
  hetre: 'placage-hetre',
  beech: 'placage-hetre',
  frêne: 'placage-frene',
  frene: 'placage-frene',
  ash: 'placage-frene',
  érable: 'placage-erable',
  erable: 'placage-erable',
  maple: 'placage-erable',
  merisier: 'placages-divers',
  cerisier: 'placages-divers',
  teck: 'placage-teck',
  wengé: 'placage-wenge',
  wenge: 'placage-wenge',
};

/**
 * ParsedFilters correspond à SmartSearchParsed du backend
 */
export interface ParsedFilters {
  productTypes?: string[];
  subcategories?: string[];
  searchTerms?: string[];
  thickness?: number | null;
  originalQuery?: string;
}

export interface UseSyncSearchToTreeOptions {
  tree: CategoryTreeNode[];
  expandPath: (path: BreadcrumbItem[]) => void;
  collapseAll: () => void;
  findPathToCategory: (slug: string) => BreadcrumbItem[];
  selectCategory?: (slug: string | null, path: BreadcrumbItem[]) => void;
}

/**
 * Mapping productType (from results) → category slug
 * Used when search returns results with various productTypes
 * These slugs must match the actual category tree structure
 * Exported for use in TreeNavigation to highlight matching categories
 */
export const RESULT_PRODUCT_TYPE_TO_CATEGORY: Record<string, string> = {
  // Panneaux Décors (mélaminés)
  MELAMINE: 'panneaux-decors',
  // Panneaux Bruts
  MDF: 'mdf',
  PARTICULE: 'agglomere',
  OSB: 'osb',
  CONTREPLAQUE: 'contreplaques',
  LATTE: 'latte',
  // Panneaux Bois Massif
  BOIS_MASSIF: 'panneaux-bois-massif',
  PANNEAU_3_PLIS: '3-plis',
  LAMELLE_COLLE: 'lamelle-colle',
  // Panneaux Spéciaux
  COMPACT: 'compacts-hpl',
  ALVEOLAIRE: 'alveolaires',
  CIMENT_BOIS: 'ciment-bois',
  ISOLANT: 'isolants',
  // Panneaux Plaqués Bois
  PLAQUE_BOIS: 'panneaux-plaques-bois',
  // Panneaux Muraux
  PANNEAU_MURAL: 'panneaux-muraux',
  // Chants (bandes de chant)
  CHANT: 'chants',
  BANDE_DE_CHANT: 'chants',
  CHANT_ABS: 'chants-abs',
  CHANT_BOIS: 'chants-plaques-bois',
  CHANT_MELAMINE: 'chants-melamines',
  CHANT_PVC: 'chants-pvc',
  // Plans de travail
  PLAN_DE_TRAVAIL: 'plans-de-travail',
  PDT_STRATIFIE: 'pdt-stratifies',
  PDT_COMPACT: 'pdt-compacts',
  PDT_BOIS_MASSIF: 'pdt-bois-massif',
  SOLID_SURFACE: 'pdt-solid-surface',
  // Feuilles & Placages
  STRATIFIE: 'feuilles-stratifiees',
  FEUILLE_STRATIFIE: 'feuilles-stratifiees',
  PLACAGE: 'placages-bois',
};

/**
 * Hook qui synchronise la recherche → l'arborescence
 * Quand l'utilisateur tape "mélaminés chêne", l'arbre s'ouvre sur Mélaminés > Décors Bois
 */
export function useSyncSearchToTree(options: UseSyncSearchToTreeOptions) {
  const { tree, expandPath, collapseAll, findPathToCategory, selectCategory } = options;

  // Track previous query to detect changes
  const prevQueryRef = useRef<string>('');

  /**
   * Vérifie si un terme est une essence de bois
   */
  const isWoodEssence = useCallback((term: string): boolean => {
    const termLower = term.toLowerCase();
    return WOOD_ESSENCES.some(wood => termLower.includes(wood));
  }, []);

  /**
   * Vérifie si un terme est une couleur
   */
  const isColorTerm = useCallback((term: string): boolean => {
    const termLower = term.toLowerCase();
    return COLOR_TERMS.some(color => termLower.includes(color));
  }, []);

  /**
   * Trouve le meilleur slug de catégorie basé sur les filtres parsés
   */
  const findBestCategorySlug = useCallback((parsed: ParsedFilters): string | null => {
    if (!parsed.productTypes?.length) return null;

    const productType = parsed.productTypes[0];
    const baseSlug = PRODUCT_TYPE_TO_CATEGORY[productType];

    if (!baseSlug) return null;

    // Analyser searchTerms pour détecter essences de bois et couleurs
    // Si searchTerms est vide, utiliser originalQuery comme fallback
    let termsToAnalyze = parsed.searchTerms || [];
    if (termsToAnalyze.length === 0 && parsed.originalQuery) {
      // Split originalQuery en mots pour analyse
      termsToAnalyze = parsed.originalQuery.toLowerCase().split(/\s+/);
    }

    const hasWoodEssence = termsToAnalyze.some(isWoodEssence);
    const hasColorTerm = termsToAnalyze.some(isColorTerm);

    // Vérifier aussi si "bois" ou "wood" est explicitement dans la requête (indique décor bois)
    const hasWoodKeyword = termsToAnalyze.some(term =>
      term === 'bois' || term === 'wood' || term.includes('decor-bois') || term.includes('décor-bois')
    );

    // ============================================
    // RÈGLE MÉTIER IMPORTANTE :
    // Support (agglo, MDF, latté, CP) + essence de bois = PLACAGE
    // Ex: "agglo chêne" = aggloméré plaqué chêne → Plaqués Bois
    // ============================================
    const SUPPORT_TYPES = ['PARTICULE', 'MDF', 'LATTE', 'CONTREPLAQUE'];
    if (SUPPORT_TYPES.includes(productType) && hasWoodEssence) {
      // Trouver la sous-catégorie de placage correspondante
      for (const term of termsToAnalyze) {
        const termLower = term.toLowerCase();
        if (PLACAGE_ESSENCE_MAPPING[termLower]) {
          console.log('[useSyncSearchToTree] Support + essence = Placage:', productType, '+', termLower, '→', PLACAGE_ESSENCE_MAPPING[termLower]);
          return PLACAGE_ESSENCE_MAPPING[termLower];
        }
      }
      // Essence détectée mais pas dans le mapping → placages-divers
      console.log('[useSyncSearchToTree] Support + essence générique → plaques-bois');
      return 'plaques-bois';
    }

    // 1. Vérifier les sous-catégories spécifiques (hydrofuge, ignifugé, etc.)
    const productSubcats = PRODUCT_SUBCATEGORY_MAPPING[productType];
    if (productSubcats && parsed.subcategories?.length) {
      for (const subcat of parsed.subcategories) {
        const subcatLower = subcat.toLowerCase();
        if (productSubcats[subcatLower]) {
          return productSubcats[subcatLower];
        }
      }
    }

    // 2. Vérifier les décors (unis, bois, fantaisie, pierre)
    const decorMapping = DECOR_SUBCATEGORY_MAPPING[productType];
    if (decorMapping) {
      // Si on a une essence de bois OU le mot "bois", c'est "décor bois"
      if ((hasWoodEssence || hasWoodKeyword) && decorMapping.bois) {
        console.log('[useSyncSearchToTree] Detected wood decor:', { hasWoodEssence, hasWoodKeyword, slug: decorMapping.bois });
        return decorMapping.bois;
      }

      // Si on a "unis" dans les subcategories
      if (parsed.subcategories?.some(s => s.toLowerCase() === 'unis')) {
        return decorMapping.unis;
      }

      // Si on a une couleur dans searchTerms, c'est probablement un décor uni
      if (hasColorTerm && decorMapping.unis) {
        return decorMapping.unis;
      }
    }

    // 3. Cas spécial pour les chants
    if (productType === 'BANDE_DE_CHANT') {
      if (hasColorTerm) {
        return 'abs-unis';
      }
      if (hasWoodEssence || hasWoodKeyword) {
        return 'abs-bois';
      }
      // Si subcategory unis/bois/fantaisie
      if (parsed.subcategories?.length) {
        for (const subcat of parsed.subcategories) {
          const subcatLower = subcat.toLowerCase();
          if (CHANT_SUBCATEGORY_MAPPING[subcatLower]) {
            return CHANT_SUBCATEGORY_MAPPING[subcatLower];
          }
        }
      }
      // Par défaut, ouvrir chants-abs
      return 'chants-abs';
    }

    // 4. Cas spécial pour les Plaqués Bois (vrais placages)
    if (productType === 'PLACAGE') {
      // Chercher l'essence de bois dans les termes de recherche
      for (const term of termsToAnalyze) {
        const termLower = term.toLowerCase();
        if (PLACAGE_ESSENCE_MAPPING[termLower]) {
          console.log('[useSyncSearchToTree] Detected placage essence:', termLower, '→', PLACAGE_ESSENCE_MAPPING[termLower]);
          return PLACAGE_ESSENCE_MAPPING[termLower];
        }
      }
      // Si pas d'essence détectée, retourner la branche principale
      return 'plaques-bois';
    }

    // 5. Retourner le slug de base
    return baseSlug;
  }, [isWoodEssence, isColorTerm]);

  /**
   * Synchronise l'arbre avec les filtres de recherche
   */
  const syncTreeWithSearch = useCallback((
    query: string,
    parsedFilters: ParsedFilters | null
  ) => {
    // Si la requête est vide ou très courte, collapse l'arbre
    if (!query || query.trim().length < 2) {
      if (prevQueryRef.current.length >= 2) {
        collapseAll();
      }
      prevQueryRef.current = query || '';
      return;
    }

    // Ne pas re-sync si la requête n'a pas changé significativement
    if (query === prevQueryRef.current) return;
    prevQueryRef.current = query;

    // Si pas de filtres parsés, pas de sync
    if (!parsedFilters) return;

    // Trouver le meilleur slug de catégorie
    const targetSlug = findBestCategorySlug(parsedFilters);

    console.log('[useSyncSearchToTree] syncTreeWithSearch:', {
      query,
      parsedFilters,
      targetSlug,
      treeLength: tree.length,
    });

    if (!targetSlug) {
      // Pas de catégorie détectée, on ne touche pas à l'arbre
      console.log('[useSyncSearchToTree] No target slug found');
      return;
    }

    // Trouver le chemin vers cette catégorie
    const path = findPathToCategory(targetSlug);

    console.log('[useSyncSearchToTree] Found path:', path);

    if (path.length === 0) {
      // La catégorie n'existe pas dans l'arbre, ne rien faire
      console.log('[useSyncSearchToTree] Path is empty, category not found in tree');
      return;
    }

    // Expand le chemin vers la catégorie
    console.log('[useSyncSearchToTree] Expanding path to:', targetSlug);
    expandPath(path);

    // Optionnel: sélectionner la catégorie (met à jour l'URL aussi)
    // On ne le fait pas automatiquement pour ne pas polluer l'URL à chaque frappe
    // L'utilisateur peut cliquer sur la catégorie s'il veut filtrer précisément

  }, [findBestCategorySlug, findPathToCategory, expandPath, collapseAll]);

  /**
   * Version pour appel manuel avec sélection de catégorie
   */
  const syncAndSelect = useCallback((
    query: string,
    parsedFilters: ParsedFilters | null
  ) => {
    if (!query || query.trim().length < 2 || !parsedFilters) {
      return;
    }

    const targetSlug = findBestCategorySlug(parsedFilters);
    if (!targetSlug) return;

    const path = findPathToCategory(targetSlug);
    if (path.length === 0) return;

    expandPath(path);

    // Cette fois, on sélectionne aussi la catégorie
    if (selectCategory) {
      selectCategory(targetSlug, path);
    }
  }, [findBestCategorySlug, findPathToCategory, expandPath, selectCategory]);

  /**
   * Expand categories based on productTypes found in search results
   * This is used when searching by reference (e.g., "U963") where the parser
   * doesn't detect productTypes but the results contain panels with various types
   */
  const expandByResultProductTypes = useCallback((
    resultProductTypes: string[]
  ) => {
    if (!resultProductTypes || resultProductTypes.length === 0) {
      return;
    }

    console.log('[useSyncSearchToTree] expandByResultProductTypes:', resultProductTypes);

    // Collect all unique category slugs from result productTypes
    const categorySlugs = new Set<string>();

    for (const productType of resultProductTypes) {
      const slug = RESULT_PRODUCT_TYPE_TO_CATEGORY[productType];
      if (slug) {
        categorySlugs.add(slug);
      }
    }

    console.log('[useSyncSearchToTree] Categories to expand:', Array.from(categorySlugs));

    // Expand path to each category
    for (const slug of categorySlugs) {
      const path = findPathToCategory(slug);
      if (path.length > 0) {
        console.log('[useSyncSearchToTree] Expanding path to:', slug, path);
        expandPath(path);
      }
    }
  }, [findPathToCategory, expandPath]);

  return {
    syncTreeWithSearch,
    syncAndSelect,
    findBestCategorySlug,
    expandByResultProductTypes,
  };
}
