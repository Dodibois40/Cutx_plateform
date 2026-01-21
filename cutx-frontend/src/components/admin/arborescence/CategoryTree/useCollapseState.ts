'use client';

import { useState, useCallback, useRef } from 'react';
import type { TreeItems } from 'dnd-kit-sortable-tree';
import type { AdminCategory } from '../types';
import type { TreeItemData } from './types';

// Storage key for collapsed state
const COLLAPSED_STORAGE_KEY = 'cutx-arbo-collapsed-ids';

export function useCollapseState() {
  // Track collapsed IDs - use state for the value, ref for access without dependencies
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    // Initialize from sessionStorage on mount (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(COLLAPSED_STORAGE_KEY);
        if (stored) {
          return new Set(JSON.parse(stored) as string[]);
        }
      } catch (e) {
        console.warn('Failed to load collapsed state:', e);
      }
    }
    return new Set<string>();
  });

  // Ref to access current collapsedIds without adding it to useEffect dependencies
  const collapsedIdsRef = useRef(collapsedIds);
  collapsedIdsRef.current = collapsedIds;

  // Save to sessionStorage helper
  const saveToStorage = useCallback((ids: Set<string>) => {
    try {
      sessionStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...ids]));
    } catch (e) {
      console.warn('Failed to save collapsed state:', e);
    }
  }, []);

  // Update collapse state for an item
  // wasCollapsed = true means it WAS collapsed, now it's being EXPANDED → remove from set
  // wasCollapsed = false means it WAS expanded, now it's being COLLAPSED → add to set
  const handleToggleCollapse = useCallback(
    (id: string, wasCollapsed: boolean) => {
      setCollapsedIds((current) => {
        const newSet = new Set(current);
        if (wasCollapsed) {
          // Was collapsed, now expanding → remove from collapsed set
          newSet.delete(id);
        } else {
          // Was expanded, now collapsing → add to collapsed set
          newSet.add(id);
        }
        saveToStorage(newSet);
        return newSet;
      });
    },
    [saveToStorage]
  );

  // Build items helper
  const buildItemsWithCollapsedState = useCallback(
    (cats: AdminCategory[], collapsed: Set<string>): TreeItems<TreeItemData> => {
      return cats.map((cat) => ({
        id: cat.id,
        category: cat,
        collapsed: collapsed.has(cat.id),
        children: cat.children ? buildItemsWithCollapsedState(cat.children, collapsed) : [],
        canHaveChildren: true,
      }));
    },
    []
  );

  // Collect all category IDs recursively
  const collectAllIds = useCallback((cats: AdminCategory[]): string[] => {
    const ids: string[] = [];
    const traverse = (list: AdminCategory[]) => {
      for (const cat of list) {
        ids.push(cat.id);
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children);
        }
      }
    };
    traverse(cats);
    return ids;
  }, []);

  // Expand all - clear collapsed set
  const expandAll = useCallback(
    (categories: AdminCategory[]) => {
      const newSet = new Set<string>();
      setCollapsedIds(newSet);
      saveToStorage(newSet);
      return buildItemsWithCollapsedState(categories, newSet);
    },
    [buildItemsWithCollapsedState, saveToStorage]
  );

  // Collapse all - add all IDs to collapsed set
  const collapseAll = useCallback(
    (categories: AdminCategory[]) => {
      const allIds = collectAllIds(categories);
      const newSet = new Set(allIds);
      setCollapsedIds(newSet);
      saveToStorage(newSet);
      return buildItemsWithCollapsedState(categories, newSet);
    },
    [collectAllIds, buildItemsWithCollapsedState, saveToStorage]
  );

  return {
    collapsedIds,
    collapsedIdsRef,
    handleToggleCollapse,
    buildItemsWithCollapsedState,
    expandAll,
    collapseAll,
  };
}
