'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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

interface Props {
  category: AdminCategory;
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onEdit: (category: AdminCategory) => void;
  onRefresh: () => void;
  activeId: string | null;
  overId: string | null;
}

export function CategoryTreeNode({
  category,
  level,
  expandedIds,
  onToggleExpand,
  onCreateChild,
  onEdit,
  onRefresh,
  activeId,
  overId,
}: Props) {
  const { getToken } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: category.id,
  });

  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: category.id,
  });

  const isExpanded = expandedIds.has(category.id);
  const hasChildren = category.children && category.children.length > 0;
  const isBeingDragged = isDragging || activeId === category.id;
  const isDropTarget = isOver || overId === category.id;

  const handleDelete = async () => {
    if (!confirm(`Supprimer "${category.name}" ?`)) return;
    setDeleting(true);
    try {
      const token = await getToken();
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
        onRefresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = !hasChildren && category._count.panels === 0;

  return (
    <div
      ref={setDropRef}
      className={`tree-node ${isBeingDragged ? 'is-dragging' : ''} ${isDropTarget ? 'is-over' : ''}`}
    >
      <div className="node-row" style={{ paddingLeft: level * 20 }}>
        {/* Drag handle */}
        <button
          ref={setDragRef}
          className="drag-handle"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>

        <button
          className="expand-btn"
          onClick={() => hasChildren && onToggleExpand(category.id)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )
          ) : (
            <span style={{ width: 16, display: 'inline-block' }} />
          )}
        </button>

        {isExpanded ? (
          <FolderOpen size={18} className="folder-icon" />
        ) : (
          <Folder size={18} className="folder-icon" />
        )}

        <span className="node-name">{category.name}</span>
        <span className="node-slug">({category.slug})</span>
        <span className="node-count">{category._count.panels} panneaux</span>

        <div className="node-actions">
          <button
            onClick={() => onCreateChild(category.id)}
            title="Ajouter enfant"
            className="action-btn"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onEdit(category)}
            title="Modifier"
            className="action-btn"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || !canDelete}
            title={
              hasChildren
                ? 'Contient des sous-catégories'
                : category._count.panels > 0
                  ? 'Contient des panneaux'
                  : 'Supprimer'
            }
            className="action-btn delete-btn"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && category.children && (
        <div className="node-children">
          {category.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onCreateChild={onCreateChild}
              onEdit={onEdit}
              onRefresh={onRefresh}
              activeId={activeId}
              overId={overId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
