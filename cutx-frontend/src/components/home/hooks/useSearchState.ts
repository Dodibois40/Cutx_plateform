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

// Labels for decor categories
const DECOR_CATEGORY_LABELS: Record<string, string> = {
  'UNIS': 'Unis',
  'BOIS': 'Bois',
  'PIERRE': 'Pierre',
  'BETON': 'Béton',
  'METAL': 'Métal',
  'TEXTILE': 'Textile',
  'FANTAISIE': 'Fantaisie',
};

// Labels for properties
const PROPERTY_LABELS: Record<string, string> = {
  'hydrofuge': 'Hydrofuge',
  'ignifuge': 'Ignifugé',
  'preglued': 'Pré-collé',
};

// Deserialize filters from URL string
function deserializeFilters(str: string): ActiveFilter[] {
  if (!str) return [];
  return str.split(',').map(item => {
    const [type, value] = item.split(':');
    let label = value;
    if (type === 'thickness') label = `${value}mm`;
    else if (type === 'dimension') label = value.replace('x', ' × ');
    else if (type === 'stock') label = 'En stock';
    else if (type === 'decorCategory') label = DECOR_CATEGORY_LABELS[value] || value;
    else if (type === 'manufacturer') label = value; // Already human-readable
    else if (type === 'property') label = PROPERTY_LABELS[value] || value;
    return { type, value, label };
  }).filter(f => f.type && f.value);
}

export function useSearchState(): UseSearchStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize with safe defaults (same on server and client) to prevent hydration mismatch
  const [query, setQueryState] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Track if we've done initial hydration
  const hasHydratedRef = useRef(false);
  // Track the last URL we set to avoid sync loop from our own updates
  const lastUrlUpdateRef = useRef<string>('|');

  // Sync from URL on mount (client-only) to prevent hydration mismatch
  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      const urlQuery = searchParams.get('q') || '';
      const urlFilters = searchParams.get('filters') || '';

      if (urlQuery || urlFilters) {
        setQueryState(urlQuery);
        setActiveFilters(deserializeFilters(urlFilters));
        setHasSearched(urlQuery.length >= 2);
        lastUrlUpdateRef.current = `${urlQuery}|${urlFilters}`;
      }
    }
  }, [searchParams]);

  // Sync URL -> state ONLY for browser navigation (back/forward) - after hydration
  useEffect(() => {
    // Skip if we haven't hydrated yet (handled by hydration effect above)
    if (!hasHydratedRef.current) return;

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
    // Skip until hydrated (don't push URL changes before we've read the initial URL)
    if (!hasHydratedRef.current) {
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
    else if (filterType === 'stock') label = 'En stock';
    else if (filterType === 'decorCategory') label = DECOR_CATEGORY_LABELS[value] || value;
    else if (filterType === 'manufacturer') label = value; // Already human-readable
    else if (filterType === 'property') label = PROPERTY_LABELS[value] || value;

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
