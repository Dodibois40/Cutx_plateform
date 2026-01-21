'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SortableTree, type TreeItems } from 'dnd-kit-sortable-tree';
import { TreeContext } from './context';
import { TreeItem } from './TreeItem';
import { useCollapseState } from './useCollapseState';
import type { TreeItemData, CategoryTreeProps, TreeContextValue } from './types';
import { treeItemsToUpdates } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function CategoryTree({
  categories,
  onCreateChild,
  onEdit,
  onRefresh,
  onPanelsDropped,
  onCategorySelect,
  selectedCategoryId,
}: CategoryTreeProps) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<TreeItems<TreeItemData>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [treeKey, setTreeKey] = useState(0);

  const {
    collapsedIdsRef,
    handleToggleCollapse,
    buildItemsWithCollapsedState,
    expandAll: doExpandAll,
    collapseAll: doCollapseAll,
  } = useCollapseState();

  // When categories change, rebuild items with tracked collapsed state
  useEffect(() => {
    setItems(buildItemsWithCollapsedState(categories, collapsedIdsRef.current));
    setTreeKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const handleItemsChanged = useCallback(
    async (newItems: TreeItems<TreeItemData>) => {
      setItems(newItems);

      const updates = treeItemsToUpdates(newItems);
      if (updates.length === 0) return;

      setIsSaving(true);
      try {
        const token = await getToken();
        if (!token) {
          console.error('Reorder failed: Not authenticated');
          alert('Vous devez être connecté pour réorganiser les catégories');
          setItems(buildItemsWithCollapsedState(categories, collapsedIdsRef.current));
          setIsSaving(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/catalogues/admin/categories/reorder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ updates }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('Reorder failed:', res.status, errorData);
          setItems(buildItemsWithCollapsedState(categories, collapsedIdsRef.current));
        }
      } catch (error) {
        console.error('Reorder error:', error);
        setItems(buildItemsWithCollapsedState(categories, collapsedIdsRef.current));
      } finally {
        setIsSaving(false);
      }
    },
    [getToken, categories, buildItemsWithCollapsedState, collapsedIdsRef]
  );

  const expandAll = () => {
    setItems(doExpandAll(categories));
    setTreeKey((k) => k + 1);
  };

  const collapseAll = () => {
    setItems(doCollapseAll(categories));
    setTreeKey((k) => k + 1);
  };

  // Context value - memoized
  const contextValue: TreeContextValue = useMemo(
    () => ({
      onCreateChild,
      onEdit,
      onRefresh,
      getToken,
      onPanelsDropped,
      onCategorySelect,
      selectedCategoryId,
      onToggleCollapse: handleToggleCollapse,
    }),
    [
      onCreateChild,
      onEdit,
      onRefresh,
      getToken,
      onPanelsDropped,
      onCategorySelect,
      selectedCategoryId,
      handleToggleCollapse,
    ]
  );

  return (
    <TreeContext.Provider value={contextValue}>
      <div className="category-tree">
        <div className="tree-toolbar">
          <button onClick={expandAll} className="toolbar-btn" type="button">
            Tout déplier
          </button>
          <button onClick={collapseAll} className="toolbar-btn" type="button">
            Tout replier
          </button>
          <span className="toolbar-hint">
            {isSaving
              ? 'Enregistrement...'
              : '← Gauche: sortir du parent | → Droite: imbriquer | ↑↓: réordonner'}
          </span>
        </div>

        <div className="tree-content">
          {items.length === 0 ? (
            <p className="empty-message">Aucune catégorie trouvée</p>
          ) : (
            <SortableTree
              key={treeKey}
              items={items}
              onItemsChanged={handleItemsChanged}
              TreeItemComponent={TreeItem}
              indentationWidth={30}
              indicator
              pointerSensorOptions={{
                activationConstraint: {
                  distance: 3,
                },
              }}
            />
          )}
        </div>
      </div>
    </TreeContext.Provider>
  );
}

// Re-export types for convenience
export type { AdminCategory } from '../types';
export type { CategoryTreeProps, TreeContextValue, TreeItemData } from './types';
