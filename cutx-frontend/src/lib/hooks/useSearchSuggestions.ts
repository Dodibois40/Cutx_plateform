'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getSearchSuggestions,
  type SuggestResponse,
} from '@/lib/services/catalogue-api';

interface UseSearchSuggestionsParams {
  query: string;
  /** Only fetch suggestions when results are empty or very few */
  resultsCount: number;
  /** Threshold below which to show suggestions (default: 3) */
  threshold?: number;
  enabled?: boolean;
}

/**
 * Hook to get spelling correction suggestions for a search query
 * Only fetches suggestions when the search returns few or no results
 *
 * @example
 * const { suggestions, correctedQuery, isLoading } = useSearchSuggestions({
 *   query: 'chataigner',
 *   resultsCount: 0,
 * });
 * // suggestions: [{ original: 'chataigner', suggestion: 'châtaignier', confidence: 0.78 }]
 * // correctedQuery: 'châtaignier'
 */
export function useSearchSuggestions({
  query,
  resultsCount,
  threshold = 3,
  enabled = true,
}: UseSearchSuggestionsParams) {
  const shouldFetch =
    enabled &&
    query &&
    query.trim().length >= 3 &&
    resultsCount <= threshold;

  const { data, isLoading, isError } = useQuery<SuggestResponse>({
    queryKey: ['search-suggestions', query],
    queryFn: () => getSearchSuggestions(query),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    suggestions: data?.suggestions ?? [],
    correctedQuery: data?.correctedQuery ?? null,
    originalQuery: data?.originalQuery ?? query,
    isLoading: shouldFetch && isLoading,
    isError,
    /** Whether there are actionable suggestions to show */
    hasSuggestions: (data?.suggestions?.length ?? 0) > 0,
  };
}

// Re-export types
export type { SearchSuggestion, SuggestResponse } from '@/lib/services/catalogue-api';
