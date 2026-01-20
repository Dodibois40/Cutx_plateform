'use client';

import { CheckSquare, X, GripVertical } from 'lucide-react';

interface PanelSelectionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
}

export function PanelSelectionBar({
  selectedCount,
  onClearSelection,
}: PanelSelectionBarProps) {
  if (selectedCount === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--cx-text-muted)]">
        <CheckSquare className="w-4 h-4" />
        <span>Cochez les panneaux à déplacer</span>
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
