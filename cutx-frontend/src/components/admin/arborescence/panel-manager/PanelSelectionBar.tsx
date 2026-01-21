'use client';

import { CheckSquare, X, GripVertical, Trash2 } from 'lucide-react';

interface PanelSelectionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function PanelSelectionBar({
  selectedCount,
  onClearSelection,
  onDelete,
  isDeleting,
}: PanelSelectionBarProps) {
  if (selectedCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--cx-text-muted)]">
        <CheckSquare className="w-4 h-4" />
        <span>Cochez les panneaux à déplacer ou supprimer</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[var(--cx-accent)]/10 border border-[var(--cx-accent)]/30 rounded-lg">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-[var(--cx-accent)]" />
        <span className="text-sm font-medium text-[var(--cx-accent)]">
          {selectedCount} panneau{selectedCount > 1 ? 'x' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs text-[var(--cx-text-muted)]">
          <GripVertical className="w-3 h-3" />
          <span>Glissez vers une catégorie</span>
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            <span>{isDeleting ? 'Suppression...' : 'Supprimer'}</span>
          </button>
        )}

        <button
          onClick={onClearSelection}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] transition-colors"
        >
          <X className="w-3 h-3" />
          <span>Désélectionner</span>
        </button>
      </div>
    </div>
  );
}
