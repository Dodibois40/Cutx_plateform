'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { searchChutes } from '@/lib/services/chutes-api';
import type { ChuteSearchFilters, ChuteSearchResult } from '@/types/chutes';

interface UseChutesSearchOptions {
  filters: ChuteSearchFilters;
  enabled?: boolean;
}

export function useChutesSearch({ filters, enabled = true }: UseChutesSearchOptions) {
  return useInfiniteQuery<ChuteSearchResult>({
    queryKey: ['chutes', 'search', filters],
    queryFn: async ({ pageParam }) => {
      return searchChutes({
        ...filters,
        page: pageParam as number,
        limit: filters.limit || 20,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: 30000, // 30 secondes
    gcTime: 300000, // 5 minutes (anciennement cacheTime)
  });
}
