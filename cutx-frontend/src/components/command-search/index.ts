// Command Search - Main exports
// A modern search system combining Command Palette and Tree Navigation

// Components
export { CommandPalette } from './CommandPalette';
export { TreeNavigation } from './TreeNavigation';

// Hooks
export { useCommandSearch } from './hooks/useCommandSearch';
export { useTreeNavigation } from './hooks/useTreeNavigation';
export { useRecentSearches } from './hooks/useRecentSearches';
export { useBidirectionalSync } from './hooks/useBidirectionalSync';
export { useSyncSearchToTree } from './hooks/useSyncSearchToTree';

// Types from sync hook
export type { ParsedFilters } from './hooks/useSyncSearchToTree';

// Types
export type {
  CategoryTreeNode,
  CommandResult,
  CommandGroup,
  BreadcrumbItem,
  TreeNavigationState,
  SyncState,
  CommandPaletteProps,
  TreeNavigationProps,
} from './types';
