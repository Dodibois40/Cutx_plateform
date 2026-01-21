import type { TreeItems } from 'dnd-kit-sortable-tree';
import type { AdminCategory } from '../types';

// Type for tree items
export type TreeItemData = {
  category: AdminCategory;
};

// Context for tree actions
export interface TreeContextValue {
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

// Props for main CategoryTree component
export interface CategoryTreeProps {
  categories: AdminCategory[];
  onCreateChild: (parentId: string) => void;
  onEdit: (category: AdminCategory) => void;
  onRefresh: () => void;
  onPanelsDropped?: (panelIds: string[], categoryId: string) => void;
  onCategorySelect?: (category: AdminCategory) => void;
  selectedCategoryId?: string | null;
}

// Convert TreeItems back to updates for API
export function treeItemsToUpdates(
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
