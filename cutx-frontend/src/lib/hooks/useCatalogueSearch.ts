'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  searchCatalogues,
  smartSearch,
  type SearchParams,
  type CatalogueProduit,
  type SmartSearchParsed,
  type SmartSearchFacets,
} from '@/lib/services/catalogue-api';

const PAGE_SIZE = 100;

interface UseCatalogueSearchParams {
  search?: string;
  productType?: string;
  sousCategorie?: string;
  epaisseur?: number;
  enStock?: boolean;
  catalogue?: string;
  sortBy?: 'nom' | 'reference' | 'prix' | 'epaisseur' | 'stock';
  sortDirection?: 'asc' | 'desc';
  enabled?: boolean;
  /** Utiliser la recherche intelligente (parse "mdf 19" en type:MDF + épaisseur:19mm) */
  useSmartSearch?: boolean;
  /** Catégorie: 'panels' (panneaux), 'chants' (bandes de chant), 'all' (tous) */
  category?: 'panels' | 'chants' | 'all';
  // Filtres explicites pour smart search
  decorCategory?: string;
  manufacturer?: string;
  isHydrofuge?: boolean;
  isIgnifuge?: boolean;
  isPreglued?: boolean;
}

interface CatalogueSearchResult {
  produits: CatalogueProduit[];
  total: number;
  hasMore: boolean;
  page: number;
  /** Filtres détectés par smart search (si activé) */
  parsed?: SmartSearchParsed;
  /** Facettes disponibles pour affiner la recherche */
  facets?: SmartSearchFacets;
}

export function useCatalogueSearch(params: UseCatalogueSearchParams = {}) {
  const { enabled = true, useSmartSearch = false, ...searchParams } = params;

  const queryKey = ['catalogue-search', searchParams, { smart: useSmartSearch }];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      // Si smart search activé ET qu'il y a une recherche texte, utiliser smart search
      if (useSmartSearch && searchParams.search && searchParams.search.length >= 2) {
        const result = await smartSearch(searchParams.search, {
          page: pageParam,
          limit: PAGE_SIZE,
          catalogueSlug: searchParams.catalogue || undefined,
          sortBy: searchParams.sortBy,
          sortDirection: searchParams.sortDirection,
          enStock: searchParams.enStock,
          // Catégorie: panels | chants | all
          category: searchParams.category,
          // Filtres explicites
          decorCategory: searchParams.decorCategory,
          manufacturer: searchParams.manufacturer,
          isHydrofuge: searchParams.isHydrofuge,
          isIgnifuge: searchParams.isIgnifuge,
          isPreglued: searchParams.isPreglued,
        });

        return {
          produits: result.produits,
          total: result.total,
          hasMore: result.hasMore,
          page: pageParam,
          parsed: result.parsed,
          facets: result.facets,
        } as CatalogueSearchResult;
      }

      // Sinon, recherche classique
      const apiParams: SearchParams = {
        q: searchParams.search || undefined,
        productType: searchParams.productType || undefined,
        sousCategorie: searchParams.sousCategorie || undefined,
        epaisseurMin: searchParams.epaisseur,
        enStock: searchParams.enStock,
        catalogue: searchParams.catalogue || undefined,
        sortBy: searchParams.sortBy,
        sortDirection: searchParams.sortDirection,
        limit: PAGE_SIZE,
        offset: (pageParam - 1) * PAGE_SIZE,
      };

      const result = await searchCatalogues(apiParams);

      return {
        produits: result.produits,
        total: result.total,
        hasMore: result.hasMore,
        page: pageParam,
      } as CatalogueSearchResult;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled,
  });

  // Flatten all pages into a single array of products, removing duplicates by ID
  const allProduits = query.data?.pages.flatMap((page) => page.produits) ?? [];
  const seenIds = new Set<string>();
  const uniqueProduits = allProduits.filter((p) => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  const total = query.data?.pages[0]?.total ?? 0;
  const hasMore = query.data?.pages[query.data.pages.length - 1]?.hasMore ?? false;

  // Récupérer les filtres parsés de la première page (smart search)
  const parsedFilters = query.data?.pages[0]?.parsed ?? null;
  // Récupérer les facettes de la première page (smart search)
  const facets = query.data?.pages[0]?.facets ?? null;

  return {
    produits: uniqueProduits,
    total,
    hasMore,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    /** Filtres détectés par smart search (productType, épaisseur, termes) */
    parsedFilters,
    /** Facettes disponibles pour affiner la recherche */
    facets,
  };
}

// Re-export des types utiles
export type { SmartSearchParsed, SmartSearchFacets } from '@/lib/services/catalogue-api';
