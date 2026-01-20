'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CategoryTreeNode, BreadcrumbItem } from '../types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://cutxplateform-production.up.railway.app';

interface UseTreeNavigationOptions {
  catalogueSlug?: string;
  /** Filter panel counts by supplier slugs (e.g., ['dispano', 'bouney', 'barrillet']) */
  supplierSlugs?: string[];
  enabled?: boolean;
}

export function useTreeNavigation(options: UseTreeNavigationOptions = {}) {
  const { catalogueSlug, supplierSlugs, enabled = true } = options;

  // Local state
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch categories tree
  const { data: tree = [], isLoading } = useQuery({
    queryKey: ['categories-tree', catalogueSlug, supplierSlugs],
    queryFn: async (): Promise<CategoryTreeNode[]> => {
      const params = new URLSearchParams();
      if (catalogueSlug) {
        params.set('catalogue', catalogueSlug);
      }
      if (supplierSlugs?.length) {
        params.set('suppliers', supplierSlugs.join(','));
      }
      const queryString = params.toString();
      const url = `${API_URL}/api/catalogues/categories-tree${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      return data.categories || [];
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - fast sync with admin changes
  });

  // Compute aggregated counts for each node (sum of panelCount for this + all children)
  const treeWithAggregatedCounts = useMemo(() => {
    const computeAggregatedCount = (node: CategoryTreeNode): number => {
      const childCount = (node.children || []).reduce(
        (sum, child) => sum + computeAggregatedCount(child),
        0
      );
      return node.panelCount + childCount;
    };

    const addAggregatedCounts = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
      nodes.map((node) => ({
        ...node,
        aggregatedCount: computeAggregatedCount(node),
        children: node.children ? addAggregatedCounts(node.children) : [],
      }));

    return addAggregatedCounts(tree);
  }, [tree]);

  // Toggle expand/collapse for a node
  const toggleNode = useCallback((slug: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  // Expand a node and all its ancestors
  const expandPath = useCallback((path: BreadcrumbItem[]) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      path.forEach((item) => next.add(item.slug));
      return next;
    });
  }, []);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allSlugs = new Set<string>();

    function collectSlugs(nodes: CategoryTreeNode[]) {
      for (const node of nodes) {
        allSlugs.add(node.slug);
        if (node.children?.length) {
          collectSlugs(node.children);
        }
      }
    }

    collectSlugs(tree);
    setExpandedNodes(allSlugs);
  }, [tree]);

  // Filter tree based on search (use tree with aggregated counts)
  const filteredTree = useMemo(() => {
    if (!searchFilter.trim()) return treeWithAggregatedCounts;

    const searchLower = searchFilter.toLowerCase();

    function filterNodes(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
      const results: CategoryTreeNode[] = [];

      for (const node of nodes) {
        const matches =
          node.name.toLowerCase().includes(searchLower) ||
          node.slug.toLowerCase().includes(searchLower);

        const filteredChildren = node.children
          ? filterNodes(node.children)
          : [];

        if (matches || filteredChildren.length > 0) {
          results.push({
            ...node,
            children: filteredChildren,
          });
        }
      }

      return results;
    }

    return filterNodes(treeWithAggregatedCounts);
  }, [treeWithAggregatedCounts, searchFilter]);

  // Find path to a category by slug
  const findPathToCategory = useCallback(
    (targetSlug: string): BreadcrumbItem[] => {
      const path: BreadcrumbItem[] = [];

      function search(nodes: CategoryTreeNode[], currentPath: BreadcrumbItem[]): boolean {
        for (const node of nodes) {
          const newPath = [...currentPath, { slug: node.slug, name: node.name }];

          if (node.slug === targetSlug) {
            path.push(...newPath);
            return true;
          }

          if (node.children?.length && search(node.children, newPath)) {
            return true;
          }
        }
        return false;
      }

      search(tree, []);
      return path;
    },
    [tree]
  );

  return {
    tree: treeWithAggregatedCounts,
    filteredTree,
    isLoading,
    expandedNodes,
    searchFilter,
    setSearchFilter,
    toggleNode,
    expandPath,
    collapseAll,
    expandAll,
    findPathToCategory,
  };
}
