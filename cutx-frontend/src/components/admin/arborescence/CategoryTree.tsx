'use client';

import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  SortableTree,
  FolderTreeItemWrapper,
  type TreeItemComponentProps,
  type TreeItems,
} from 'dnd-kit-sortable-tree';
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
  const context = useContext(TreeContext);

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

  const panelCount = category._count?.panels ?? 0;
  const canDelete = !hasChildren && panelCount === 0;

  return (
    <FolderTreeItemWrapper
      {...props}
      ref={ref}
      manualDrag={false}
      showDragHandle={false}
    >
      <div className="node-row-content">
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
}

// Convert AdminCategory[] to TreeItems format
function categoriesToTreeItems(categories: AdminCategory[]): TreeItems<TreeItemData> {
  return categories.map((cat) => ({
    id: cat.id,
    category: cat,
    children: cat.children ? categoriesToTreeItems(cat.children) : [],
    canHaveChildren: true,
  }));
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
}: Props) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<TreeItems<TreeItemData>>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Convert categories to tree items when they change
  useEffect(() => {
    setItems(categoriesToTreeItems(categories));
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
          // Revert on failure
          setItems(categoriesToTreeItems(categories));
        }
        // Don't call onRefresh here - local state is already updated
        // This prevents the flicker/loop issue
      } catch (error) {
        console.error('Reorder error:', error);
        setItems(categoriesToTreeItems(categories));
      } finally {
        setIsSaving(false);
      }
    },
    [getToken, categories]
  );

  const expandAll = () => {
    const expandItems = (treeItems: TreeItems<TreeItemData>): TreeItems<TreeItemData> => {
      return treeItems.map((item) => ({
        ...item,
        collapsed: false,
        children: item.children ? expandItems(item.children) : [],
      }));
    };
    setItems(expandItems(items));
  };

  const collapseAll = () => {
    const collapseItems = (treeItems: TreeItems<TreeItemData>): TreeItems<TreeItemData> => {
      return treeItems.map((item) => ({
        ...item,
        collapsed: true,
        children: item.children ? collapseItems(item.children) : [],
      }));
    };
    setItems(collapseItems(items));
  };

  // Context value for tree actions
  const contextValue: TreeContextValue = {
    onCreateChild,
    onEdit,
    onRefresh,
    getToken,
  };

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
