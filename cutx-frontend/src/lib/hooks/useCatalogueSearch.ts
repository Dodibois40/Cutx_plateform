'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { searchCatalogues, type SearchParams, type CatalogueProduit } from '@/lib/services/catalogue-api';

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
}

interface CatalogueSearchResult {
  produits: CatalogueProduit[];
  total: number;
  hasMore: boolean;
  page: number;
}

export function useCatalogueSearch(params: UseCatalogueSearchParams = {}) {
  const { enabled = true, ...searchParams } = params;

  const queryKey = ['catalogue-search', searchParams];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
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
  };
}
