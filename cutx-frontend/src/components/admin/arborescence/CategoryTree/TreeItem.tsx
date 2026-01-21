'use client';

import React, { useState, useContext } from 'react';
import { FolderTreeItemWrapper, type TreeItemComponentProps } from 'dnd-kit-sortable-tree';
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
import { TreeContext } from './context';
import type { TreeItemData } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const TreeItem = React.forwardRef<HTMLDivElement, TreeItemComponentProps<TreeItemData>>(
  (props, ref) => {
    const { item, onCollapse, collapsed } = props;
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
        const res = await fetch(`${API_URL}/api/catalogues/admin/categories/${category.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
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
      <FolderTreeItemWrapper {...props} ref={ref} manualDrag={false} showDragHandle={false}>
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
  }
);

TreeItem.displayName = 'TreeItem';
