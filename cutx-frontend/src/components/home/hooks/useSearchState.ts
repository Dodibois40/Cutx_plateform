'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export interface ActiveFilter {
  type: string; // 'genre', 'thickness', 'dimension'
  value: string; // The filter value
  label: string; // Display label (e.g., "19mm" instead of "19")
}

interface UseSearchStateReturn {
  query: string;
  activeFilters: ActiveFilter[];
  hasSearched: boolean;
  setQuery: (query: string) => void;
  addFilter: (filterType: string, value: string) => void;
  removeFilter: (filterType: string, value: string) => void;
  clearAllFilters: () => void;
  goHome: () => void;
}

// Serialize filters to URL-safe string
function serializeFilters(filters: ActiveFilter[]): string {
  if (filters.length === 0) return '';
  return filters.map(f => `${f.type}:${f.value}`).join(',');
}

// Deserialize filters from URL string
function deserializeFilters(str: string): ActiveFilter[] {
  if (!str) return [];
  return str.split(',').map(item => {
    const [type, value] = item.split(':');
    let label = value;
    if (type === 'thickness') label = `${value}mm`;
    else if (type === 'dimension') label = value.replace('x', ' × ');
    return { type, value, label };
  }).filter(f => f.type && f.value);
}

export function useSearchState(): UseSearchStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const urlQuery = searchParams.get('q') || '';
  const urlFilters = searchParams.get('filters') || '';

  // Local state (synced with URL)
  const [query, setQueryState] = useState(urlQuery);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(() => deserializeFilters(urlFilters));
  const [hasSearched, setHasSearched] = useState(urlQuery.length >= 2);

  // Track if we're initializing (skip first URL sync)
  const isInitializedRef = useRef(false);
  // Track the last URL we set to avoid sync loop from our own updates
  const lastUrlUpdateRef = useRef<string>(`${urlQuery}|${urlFilters}`);

  // Sync URL -> state ONLY for browser navigation (back/forward)
  useEffect(() => {
    const currentUrl = `${searchParams.get('q') || ''}|${searchParams.get('filters') || ''}`;

    // Skip if this is our own URL update
    if (currentUrl === lastUrlUpdateRef.current) {
      return;
    }

    const newQuery = searchParams.get('q') || '';
    const newFilters = searchParams.get('filters') || '';

    setQueryState(newQuery);
    setActiveFilters(deserializeFilters(newFilters));
    setHasSearched(newQuery.length >= 2);
    lastUrlUpdateRef.current = currentUrl;
  }, [searchParams]);

  // Sync state -> URL via useEffect (not during render!)
  useEffect(() => {
    // Skip first render (already synced from URL)
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      return;
    }

    const params = new URLSearchParams();

    if (query.length >= 2) {
      params.set('q', query);
    }

    const filtersStr = serializeFilters(activeFilters);
    if (filtersStr) {
      params.set('filters', filtersStr);
    }

    // Track what URL we're setting to avoid sync loop
    lastUrlUpdateRef.current = `${params.get('q') || ''}|${params.get('filters') || ''}`;

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [query, activeFilters, pathname, router]);

  // Set query
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);

    // Auto-trigger search mode when query >= 2 chars
    if (newQuery.length >= 2) {
      setHasSearched(true);
    }
  }, []);

  // Add filter
  const addFilter = useCallback((filterType: string, value: string) => {
    let label = value;
    if (filterType === 'thickness') label = `${value}mm`;
    else if (filterType === 'dimension') label = value.replace('x', ' × ');

    setActiveFilters(prev => {
      const exists = prev.some(f => f.type === filterType && f.value === value);
      if (exists) return prev;
      return [...prev, { type: filterType, value, label }];
    });
  }, []);

  // Remove filter
  const removeFilter = useCallback((filterType: string, value: string) => {
    setActiveFilters(prev => prev.filter(f => !(f.type === filterType && f.value === value)));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  // Go home (reset everything)
  const goHome = useCallback(() => {
    setQueryState('');
    setActiveFilters([]);
    setHasSearched(false);
  }, []);

  return {
    query,
    activeFilters,
    hasSearched,
    setQuery,
    addFilter,
    removeFilter,
    clearAllFilters,
    goHome,
  };
}
