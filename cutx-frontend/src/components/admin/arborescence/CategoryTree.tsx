'use client';

import React, { useState, useCallback, useEffect, createContext, useContext, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  SortableTree,
  FolderTreeItemWrapper,
  type TreeItemComponentProps,
  type TreeItems,
} from 'dnd-kit-sortable-tree';

// Storage key for collapsed state
const COLLAPSED_STORAGE_KEY = 'cutx-arbo-collapsed-ids';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
} from 'lucide-react';
import type { AdminCategory } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Type for tree items
type TreeItemData = {
  category: AdminCategory;
};

// Context for tree actions
interface TreeContextValue {
  onCreateChild: (parentId: string) => void;
  onEdit: (category: AdminCategory) => void;
  onRefresh: () => void;
  getToken: () => Promise<string | null>;
  onPanelsDropped?: (panelIds: string[], categoryId: string) => void;
  onCategorySelect?: (category: AdminCategory) => void;
  selectedCategoryId?: string | null;
  // Track collapsed state separately to preserve it on refresh
  // wasCollapsed = état AVANT le click (true = était fermé, va s'ouvrir)
  onToggleCollapse: (id: string, wasCollapsed: boolean) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

// Tree item component - MUST be outside main component to avoid re-creation
const TreeItemComponent = React.forwardRef<
  HTMLDivElement,
  TreeItemComponentProps<TreeItemData>
>((props, ref) => {
  const { item, depth, onCollapse, collapsed } = props;
  const category = item.category;
  const hasChildren = item.children && item.children.length > 0;
  const [deleting, setDeleting] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const context = useContext(TreeContext);

  // HTML5 drop handlers for panel assignment
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);

    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;

      const parsed = JSON.parse(data);
      if (parsed.panelIds && Array.isArray(parsed.panelIds) && context?.onPanelsDropped) {
        context.onPanelsDropped(parsed.panelIds, category.id);
      }
    } catch (err) {
      console.error('Drop parse error:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!context) return;
    if (!confirm(`Supprimer "${category.name}" ?`)) return;

    setDeleting(true);
    try {
      const token = await context.getToken();
      const res = await fetch(
        `${API_URL}/api/catalogues/admin/categories/${category.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || 'Erreur lors de la suppression');
      } else {
        context.onRefresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  // Utiliser le compteur agrégé (somme des enfants) si disponible, sinon le compteur direct
  const panelCount = category.aggregatedCount ?? category._count?.panels ?? 0;
  // Pour la suppression, on vérifie le compteur direct (pas l'agrégé)
  const directPanelCount = category._count?.panels ?? 0;
  const canDelete = !hasChildren && directPanelCount === 0;

  // Check if this category is selected
  const isSelected = context?.selectedCategoryId === category.id;

  // Handle click to select category
  const handleClick = (e: React.MouseEvent) => {
    // Don't select if clicking on buttons or handles
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.drag-handle-area')) return;

    if (context?.onCategorySelect) {
      context.onCategorySelect(category);
    }
  };

  return (
    <FolderTreeItemWrapper
      {...props}
      ref={ref}
      manualDrag={false}
      showDragHandle={false}
    >
      <div
        className={`node-row-content ${isDropTarget ? 'drop-target' : ''} ${isSelected ? 'selected' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Drag handle - visual only, whole row is draggable */}
        <div className="drag-handle-area">
          <GripVertical size={14} />
        </div>

        {/* Expand/Collapse button */}
        <button
          className="expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren && onCollapse) {
              // Pass current collapsed state BEFORE the toggle
              // If collapsed=true now, after toggle it will be expanded (remove from set)
              // If collapsed=false now, after toggle it will be collapsed (add to set)
              context?.onToggleCollapse(category.id, !!collapsed);
              onCollapse();
            }
          }}
          disabled={!hasChildren}
          type="button"
        >
          {hasChildren ? (
            collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronDown size={16} />
            )
          ) : (
            <span style={{ width: 16, display: 'inline-block' }} />
          )}
        </button>

        {/* Folder icon */}
        {collapsed || !hasChildren ? (
          <Folder size={18} className="folder-icon" />
        ) : (
          <FolderOpen size={18} className="folder-icon" />
        )}

        {/* Name and info */}
        <span className="node-name">{category.name}</span>
        <span className="node-slug">({category.slug})</span>
        <span className="node-count">{panelCount} panneaux</span>

        {/* Actions */}
        <div className="node-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              context?.onCreateChild(category.id);
            }}
            title="Ajouter enfant"
            className="action-btn"
            type="button"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              context?.onEdit(category);
            }}
            title="Modifier"
            className="action-btn"
            type="button"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || !canDelete}
            title={
              hasChildren
                ? 'Contient des sous-catégories'
                : panelCount > 0
                  ? `Contient ${panelCount} panneaux`
                  : 'Supprimer'
            }
            className="action-btn delete-btn"
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </FolderTreeItemWrapper>
  );
});

TreeItemComponent.displayName = 'TreeItemComponent';

// Props for main component
interface Props {
  categories: AdminCategory[];
  onCreateChild: (parentId: string) => void;
  onEdit: (category: AdminCategory) => void;
  onRefresh: () => void;
  onPanelsDropped?: (panelIds: string[], categoryId: string) => void;
  onCategorySelect?: (category: AdminCategory) => void;
  selectedCategoryId?: string | null;
}

// Convert TreeItems back to updates for API
function treeItemsToUpdates(
  items: TreeItems<TreeItemData>,
  parentId: string | null = null
): Array<{ id: string; sortOrder: number; parentId: string | null }> {
  const updates: Array<{ id: string; sortOrder: number; parentId: string | null }> = [];

  items.forEach((item, index) => {
    updates.push({
      id: item.id as string,
      sortOrder: index + 1,
      parentId,
    });

    if (item.children && item.children.length > 0) {
      updates.push(...treeItemsToUpdates(item.children, item.id as string));
    }
  });

  return updates;
}

export function CategoryTree({
  categories,
  onCreateChild,
  onEdit,
  onRefresh,
  onPanelsDropped,
  onCategorySelect,
  selectedCategoryId,
}: Props) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<TreeItems<TreeItemData>>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Key to force SortableTree re-mount when we need to apply collapsed state
  const [treeKey, setTreeKey] = useState(0);

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
  const handleToggleCollapse = useCallback((id: string, wasCollapsed: boolean) => {
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
  }, [saveToStorage]);

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

  // When categories change (from API refresh), rebuild items with our tracked collapsed state
  // Force re-mount to ensure panel counts are updated (the library doesn't re-render on data changes)
  useEffect(() => {
    setItems(buildItemsWithCollapsedState(categories, collapsedIdsRef.current));
    // Increment treeKey to force re-mount and update displayed counts
    setTreeKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const handleItemsChanged = useCallback(
    async (newItems: TreeItems<TreeItemData>) => {
      // Update local state immediately for smooth UX
      setItems(newItems);

      const updates = treeItemsToUpdates(newItems);
      if (updates.length === 0) return;

      setIsSaving(true);
      try {
        const token = await getToken();
        if (!token) {
          console.error('Reorder failed: Not authenticated - please sign in');
          alert('Vous devez être connecté pour réorganiser les catégories');
          setItems(buildItemsWithCollapsedState(categories, collapsedIdsRef.current as Set<string>));
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
          // Revert on failure - preserve collapsed state
          setItems(buildItemsWithCollapsedState(categories, collapsedIdsRef.current as Set<string>));
        }
        // Don't call onRefresh here - local state is already updated
        // This prevents the flicker/loop issue
      } catch (error) {
        console.error('Reorder error:', error);
        setItems(buildItemsWithCollapsedState(categories, collapsedIdsRef.current as Set<string>));
      } finally {
        setIsSaving(false);
      }
    },
    [getToken, categories, buildItemsWithCollapsedState]
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

  const expandAll = () => {
    // Clear all collapsed IDs = everything expanded
    const newSet = new Set<string>();
    setCollapsedIds(newSet);
    saveToStorage(newSet);
    // Rebuild items - force re-mount for explicit user action
    setItems(buildItemsWithCollapsedState(categories, newSet));
    setTreeKey((k) => k + 1);
  };

  const collapseAll = () => {
    // Add all IDs to collapsed set
    const allIds = collectAllIds(categories);
    const newSet = new Set(allIds);
    setCollapsedIds(newSet);
    saveToStorage(newSet);
    // Rebuild items - force re-mount for explicit user action
    setItems(buildItemsWithCollapsedState(categories, newSet));
    setTreeKey((k) => k + 1);
  };

  // Context value for tree actions - memoized to prevent unnecessary re-renders
  const contextValue: TreeContextValue = React.useMemo(
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
    [onCreateChild, onEdit, onRefresh, getToken, onPanelsDropped, onCategorySelect, selectedCategoryId, handleToggleCollapse]
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
            {isSaving ? 'Enregistrement...' : '← Gauche: sortir du parent | → Droite: imbriquer | ↑↓: réordonner'}
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
              TreeItemComponent={TreeItemComponent}
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
