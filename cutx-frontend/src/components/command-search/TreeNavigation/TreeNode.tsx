'use client';

/**
 * TreeNode - Individual node in the tree navigation
 *
 * Features:
 * - Classic tree branch connectors (├── └──)
 * - Smooth expand/collapse with Framer Motion
 * - Cascade animation for children
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Folder,
  FolderOpen,
} from 'lucide-react';
import type { CategoryTreeNode, BreadcrumbItem } from '../types';
import { TreeConnector } from './TreeConnector';

interface TreeNodeProps {
  node: CategoryTreeNode;
  level: number;
  expandedNodes: Set<string>;
  selectedSlug: string | null;
  onToggle: (slug: string) => void;
  onSelect: (path: BreadcrumbItem[], slug: string) => void;
  parentPath?: BreadcrumbItem[];
  /** Slugs des catégories qui ont des résultats de recherche */
  highlightedSlugs?: Set<string>;
  /** Index of this node in its parent's children array */
  index?: number;
  /** Total number of siblings */
  siblingCount?: number;
  /** Whether to show connectors */
  showConnectors?: boolean;
}

export const TreeNode = memo(function TreeNode({
  node,
  level,
  expandedNodes,
  selectedSlug,
  onToggle,
  onSelect,
  parentPath = [],
  highlightedSlugs,
  index = 0,
  siblingCount = 1,
  showConnectors = true,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.slug);
  const isSelected = selectedSlug === node.slug;
  const isHighlighted = highlightedSlugs?.has(node.slug) ?? false;
  const isLast = index === siblingCount - 1;

  // Padding based on level
  const paddingLeft = level === 0 ? 12 : 20 + level * 20;

  const currentPath: BreadcrumbItem[] = [
    ...parentPath,
    { slug: node.slug, name: node.name },
  ];

  const handleClick = () => {
    onSelect(currentPath, node.slug);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.slug);
  };

  return (
    <div className="relative">
      {/* Tree branch connector (only for non-root nodes) */}
      {level > 0 && showConnectors && (
        <TreeConnector
          level={level}
          isLast={isLast}
          isVisible={true}
          delay={index * 0.03}
        />
      )}

      {/* Node content */}
      <motion.div
        className={`
          flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer
          transition-colors duration-150 text-sm group relative
          ${isSelected
            ? 'bg-amber-500/10 text-amber-400'
            : 'text-[var(--cx-text)] hover:bg-white/[0.04]'
          }
        `}
        style={{ paddingLeft }}
        onClick={handleClick}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.15,
          delay: index * 0.02,
          ease: 'easeOut',
        }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <motion.button
            onClick={handleToggle}
            className="p-0.5 hover:bg-white/10 rounded transition-colors"
            aria-label={isExpanded ? 'Réduire' : 'Développer'}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </motion.div>
          </motion.button>
        ) : (
          <span className="w-4.5" aria-hidden="true" />
        )}

        {/* Folder icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
        ) : (
          <Folder
            className={`w-4 h-4 flex-shrink-0 ${
              isSelected ? 'text-amber-500' : 'text-[var(--cx-text-muted)]'
            }`}
          />
        )}

        {/* Label */}
        <span className="truncate flex-1 min-w-0">{node.name}</span>

        {/* Match indicator */}
        {isHighlighted && (
          <motion.span
            className="w-2 h-2 rounded-full bg-emerald-500"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            style={{ boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }}
            title="Contient des résultats"
          />
        )}

        {/* Count badge - use aggregatedCount (sum of children) if available, else panelCount */}
        {(node.aggregatedCount ?? node.panelCount) > 0 && (
          <span
            className={`
              text-[10px] font-medium px-1.5 py-0.5 rounded
              transition-opacity
              ${isSelected
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-white/5 text-[var(--cx-text-muted)] group-hover:opacity-100 opacity-70'
              }
            `}
          >
            {node.aggregatedCount ?? node.panelCount}
          </span>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            role="group"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.2, ease: 'easeOut' },
              opacity: { duration: 0.15 },
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="relative">
              {node.children.map((child, childIndex) => (
                <TreeNode
                  key={child.slug}
                  node={child}
                  level={level + 1}
                  expandedNodes={expandedNodes}
                  selectedSlug={selectedSlug}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  parentPath={currentPath}
                  highlightedSlugs={highlightedSlugs}
                  index={childIndex}
                  siblingCount={node.children.length}
                  showConnectors={showConnectors}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
