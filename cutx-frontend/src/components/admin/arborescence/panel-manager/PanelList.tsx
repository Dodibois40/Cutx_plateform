'use client';

import { GripVertical, Package, CheckSquare, Square, Eye, MessageSquareWarning } from 'lucide-react';
import type { CatalogueProduit } from '@/lib/services/catalogue-api';

interface PanelListProps {
  panels: CatalogueProduit[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isLoading?: boolean;
  onViewDetails?: (panelId: string) => void;
}

export function PanelList({
  panels,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  isLoading = false,
  onViewDetails,
}: PanelListProps) {
  const allSelected = panels.length > 0 && panels.every((p) => selectedIds.has(p.id));
  const someSelected = panels.some((p) => selectedIds.has(p.id));

  // Handle drag start - include all selected panel IDs
  const handleDragStart = (e: React.DragEvent, panelId: string) => {
    // If dragging an unselected panel, only drag that one
    // If dragging a selected panel, drag all selected
    const idsToMove = selectedIds.has(panelId)
      ? Array.from(selectedIds)
      : [panelId];

    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ panelIds: idsToMove })
    );
    e.dataTransfer.effectAllowed = 'move';

    // Visual feedback
    const dragImage = document.createElement('div');
    dragImage.className = 'fixed bg-[var(--cx-accent)] text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg';
    dragImage.textContent = `${idsToMove.length} panneau${idsToMove.length > 1 ? 'x' : ''}`;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-[var(--cx-text-muted)]">Chargement...</div>
      </div>
    );
  }

  if (panels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-[var(--cx-text-muted)]">
          Aucun panneau trouvé
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with select all */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--cx-border)]">
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="flex items-center gap-2 text-xs text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4 text-[var(--cx-accent)]" />
          ) : someSelected ? (
            <div className="w-4 h-4 border-2 border-[var(--cx-accent)] rounded bg-[var(--cx-accent)]/30" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span>{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</span>
        </button>
        <span className="text-xs text-[var(--cx-text-muted)]">
          {panels.length} panneau{panels.length > 1 ? 'x' : ''}
        </span>
      </div>

      {/* Panel list */}
      <div className="flex-1 overflow-y-auto">
        {panels.map((panel) => {
          const isSelected = selectedIds.has(panel.id);
          const isInStock = panel.stock === 'EN STOCK';

          return (
            <div
              key={panel.id}
              draggable
              onDragStart={(e) => handleDragStart(e, panel.id)}
              className={`flex items-center gap-2 px-3 py-2 border-b border-[var(--cx-border-subtle)] cursor-grab active:cursor-grabbing transition-colors ${
                isSelected
                  ? 'bg-[var(--cx-accent)]/10'
                  : 'hover:bg-[var(--cx-surface-3)]'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => onToggleSelection(panel.id)}
                className="flex-shrink-0"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-[var(--cx-accent)]" />
                ) : (
                  <Square className="w-4 h-4 text-[var(--cx-text-muted)]" />
                )}
              </button>

              {/* Drag grip */}
              <GripVertical className="w-4 h-4 text-[var(--cx-text-muted)] flex-shrink-0" />

              {/* Image */}
              {panel.imageUrl ? (
                <img
                  src={panel.imageUrl}
                  alt=""
                  className="w-8 h-8 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 bg-[var(--cx-surface-3)] rounded flex-shrink-0" />
              )}

              {/* Name */}
              <span className="flex-1 text-sm text-[var(--cx-text)] truncate min-w-0">
                {panel.nom}
              </span>

              {/* Thickness */}
              <span className="font-mono text-xs text-[var(--cx-text-muted)] flex-shrink-0">
                {panel.epaisseur ? `${panel.epaisseur}mm` : '-'}
              </span>

              {/* Stock indicator */}
              <Package
                className={`w-4 h-4 flex-shrink-0 ${
                  isInStock ? 'text-emerald-500' : 'text-amber-500'
                }`}
              />

              {/* Verification note indicator */}
              {panel.verificationNote && (
                <div
                  className="flex-shrink-0 p-1 text-amber-500 bg-amber-500/10 rounded"
                  title={panel.verificationNote}
                >
                  <MessageSquareWarning className="w-4 h-4" />
                </div>
              )}

              {/* View details button */}
              {onViewDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(panel.id);
                  }}
                  className="flex-shrink-0 p-1 text-[var(--cx-text-muted)] hover:text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 rounded transition-all"
                  title="Voir les détails"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
