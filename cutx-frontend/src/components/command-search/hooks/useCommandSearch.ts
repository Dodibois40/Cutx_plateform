'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CommandResult, CategoryTreeNode } from '../types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://cutxplateform-production.up.railway.app';

interface UseCommandSearchOptions {
  enabled?: boolean;
}

interface SmartSearchResult {
  panels: Array<{
    id: string;
    reference: string;
    name: string;
    imageUrl?: string;
    defaultThickness?: number;
    stockStatus?: string;
    category?: {
      name: string;
      slug: string;
    };
  }>;
  total: number;
}

export function useCommandSearch(
  search: string,
  options: UseCommandSearchOptions = {}
) {
  const { enabled = true } = options;
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch categories tree
  const categoriesQuery = useQuery({
    queryKey: ['categories-tree'],
    queryFn: async (): Promise<CategoryTreeNode[]> => {
      const res = await fetch(`${API_URL}/api/catalogues/categories-tree`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      return data.categories || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Search products when query is long enough
  const productsQuery = useQuery({
    queryKey: ['command-search', debouncedSearch],
    queryFn: async (): Promise<SmartSearchResult> => {
      const params = new URLSearchParams({
        q: debouncedSearch,
        limit: '10',
      });
      const res = await fetch(
        `${API_URL}/api/catalogues/smart-search?${params}`
      );
      if (!res.ok) throw new Error('Failed to search');
      return res.json();
    },
    enabled: enabled && debouncedSearch.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Filter categories based on search
  const filteredCategories = useMemo((): CommandResult[] => {
    if (!categoriesQuery.data) return [];

    const searchLower = debouncedSearch.toLowerCase();
    const results: CommandResult[] = [];

    function searchInTree(nodes: CategoryTreeNode[], parentPath: string = '') {
      for (const node of nodes) {
        const fullPath = parentPath ? `${parentPath} > ${node.name}` : node.name;

        if (
          !debouncedSearch ||
          node.name.toLowerCase().includes(searchLower) ||
          node.slug.toLowerCase().includes(searchLower)
        ) {
          results.push({
            id: node.slug,
            type: 'category',
            title: node.name,
            subtitle: parentPath || node.catalogueName,
            metadata: { panelCount: node.panelCount },
            keywords: [node.slug, node.name],
            onSelect: () => {},
          });
        }

        if (node.children?.length) {
          searchInTree(node.children, fullPath);
        }
      }
    }

    searchInTree(categoriesQuery.data);

    // Sort by relevance (exact match first, then by panel count)
    return results
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === searchLower;
        const bExact = b.title.toLowerCase() === searchLower;
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;
        return (b.metadata?.panelCount || 0) - (a.metadata?.panelCount || 0);
      })
      .slice(0, 6);
  }, [categoriesQuery.data, debouncedSearch]);

  // Transform products to CommandResult
  const productResults = useMemo((): CommandResult[] => {
    if (!productsQuery.data?.panels) return [];

    return productsQuery.data.panels.slice(0, 8).map((panel) => ({
      id: panel.id,
      type: 'product' as const,
      title: panel.name,
      subtitle: panel.category?.name || panel.reference,
      imageUrl: panel.imageUrl,
      metadata: {
        thickness: panel.defaultThickness,
        stock: panel.stockStatus,
      },
      keywords: [panel.reference, panel.name],
      onSelect: () => {},
    }));
  }, [productsQuery.data]);

  return {
    isLoading: productsQuery.isLoading || categoriesQuery.isLoading,
    categories: filteredCategories,
    products: productResults,
    totalProducts: productsQuery.data?.total || 0,
    categoriesTree: categoriesQuery.data || [],
  };
}
