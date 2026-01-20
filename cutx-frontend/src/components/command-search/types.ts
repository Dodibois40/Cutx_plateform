import type { ReactNode } from 'react';

// ============================================================================
// Category Tree Types
// ============================================================================

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  catalogueSlug?: string;
  catalogueName?: string;
  panelCount: number;
  children: CategoryTreeNode[];
}

export interface BreadcrumbItem {
  slug: string;
  name: string;
}

// ============================================================================
// Command Palette Types
// ============================================================================

export type CommandResultType = 'recent' | 'category' | 'product' | 'action';

export interface CommandResult {
  id: string;
  type: CommandResultType;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  keywords?: string[];
  imageUrl?: string;
  metadata?: {
    thickness?: number;
    price?: number;
    stock?: string;
    panelCount?: number;
  };
  onSelect: () => void;
}

export interface CommandGroup {
  id: string;
  heading: string;
  icon: ReactNode;
  items: CommandResult[];
}

// ============================================================================
// Tree Navigation State
// ============================================================================

export interface TreeNavigationState {
  selectedCategory: string | null;
  selectedPath: BreadcrumbItem[];
  expandedNodes: Set<string>;
  searchFilter: string;
}

// ============================================================================
// Sync State
// ============================================================================

export interface SyncState {
  selectedCategory: string | null;
  selectedPath: BreadcrumbItem[];
  searchQuery: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CategoriesTreeResponse {
  categories: CategoryTreeNode[];
}

// ============================================================================
// Component Props
// ============================================================================

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCategory: (slug: string, path: BreadcrumbItem[]) => void;
  onSelectProduct: (productId: string) => void;
  onSearch: (query: string) => void;
}

export interface TreeNavigationProps {
  isCollapsed: boolean;
  onToggle: () => void;
  selectedPath: BreadcrumbItem[];
  onSelect: (path: BreadcrumbItem[], categorySlug: string) => void;
  onFilterChange: (categorySlug: string | null) => void;
}

export interface TreeNodeProps {
  node: CategoryTreeNode;
  level: number;
  expandedNodes: Set<string>;
  selectedPath: BreadcrumbItem[];
  onToggle: (slug: string) => void;
  onSelect: (path: BreadcrumbItem[], slug: string) => void;
}
