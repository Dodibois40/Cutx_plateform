'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { BreadcrumbItem } from '../types';

interface SyncState {
  selectedCategory: string | null;
  selectedPath: BreadcrumbItem[];
  isTreeOpen: boolean;
}

interface UseBidirectionalSyncOptions {
  onCategoryChange?: (category: string | null, path: BreadcrumbItem[]) => void;
}

export function useBidirectionalSync(options: UseBidirectionalSyncOptions = {}) {
  const { onCategoryChange } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track previous URL params to detect real changes vs initial mount
  const prevParamsRef = useRef<string | null>(null);

  // Initialize with safe defaults (same on server and client) to prevent hydration mismatch
  const [state, setState] = useState<SyncState>({
    selectedCategory: null,
    selectedPath: [],
    isTreeOpen: true,
  });

  // Single effect to sync from URL - handles both initial mount and URL changes
  useEffect(() => {
    const currentParams = searchParams.toString();

    // Skip if params haven't changed (prevents unnecessary re-renders)
    if (prevParamsRef.current === currentParams) return;
    prevParamsRef.current = currentParams;

    const category = searchParams.get('category');
    const path = parsePathFromUrl(searchParams.get('path'));

    setState((prev) => ({
      ...prev,
      selectedCategory: category,
      selectedPath: path,
    }));
  }, [searchParams]);

  // Parse path from URL
  function parsePathFromUrl(pathString: string | null): BreadcrumbItem[] {
    if (!pathString) return [];
    try {
      // Format: slug1:name1,slug2:name2
      return pathString.split(',').map((segment) => {
        const [slug, name] = segment.split(':');
        return { slug, name: decodeURIComponent(name || slug) };
      });
    } catch {
      return [];
    }
  }

  // Serialize path to URL
  function serializePathToUrl(path: BreadcrumbItem[]): string {
    return path
      .map((item) => `${item.slug}:${encodeURIComponent(item.name)}`)
      .join(',');
  }

  // Update URL when state changes
  const updateUrl = useCallback(
    (newCategory: string | null, newPath: BreadcrumbItem[]) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newCategory) {
        params.set('category', newCategory);
      } else {
        params.delete('category');
      }

      if (newPath.length > 0) {
        params.set('path', serializePathToUrl(newPath));
      } else {
        params.delete('path');
      }

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      router.replace(newUrl, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Select a category (from tree or command palette)
  const selectCategory = useCallback(
    (slug: string | null, path: BreadcrumbItem[]) => {
      setState((prev) => ({
        ...prev,
        selectedCategory: slug,
        selectedPath: path,
      }));

      updateUrl(slug, path);

      if (onCategoryChange) {
        onCategoryChange(slug, path);
      }
    },
    [updateUrl, onCategoryChange]
  );

  // Clear category selection
  const clearSelection = useCallback(() => {
    selectCategory(null, []);
  }, [selectCategory]);

  // Toggle tree visibility
  const toggleTree = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isTreeOpen: !prev.isTreeOpen,
    }));
  }, []);

  // Set tree visibility
  const setTreeOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      isTreeOpen: open,
    }));
  }, []);

  return {
    selectedCategory: state.selectedCategory,
    selectedPath: state.selectedPath,
    isTreeOpen: state.isTreeOpen,
    selectCategory,
    clearSelection,
    toggleTree,
    setTreeOpen,
  };
}
