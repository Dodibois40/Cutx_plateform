'use client';

/**
 * ChantDropZone - Edge banding (chant) drop zone with suggestion
 * Shows assigned chant, suggestion based on panel ref, or add button
 */

import { X, ArrowRight, Plus } from 'lucide-react';
import Image from 'next/image';
import type { ImportedFileData } from '../../hooks/useFileImport';

/**
 * Check if a manufacturer ref is a valid decor reference (Egger, Polyrey, etc.)
 * Only suggest edge bands when we have a real decor ref, not a product code
 */
function isValidDecorRef(ref: string | null | undefined): boolean {
  if (!ref) return false;

  // Known manufacturer decor patterns:
  // Egger: H1180, U999, W1000, F244, ST37, etc.
  // Polyrey: B015, B068, N118, etc.
  // Pfleiderer: R4262, R5613, etc.
  const validPatterns = [
    /^[HUWF]\d{3,4}$/i,      // Egger decors: H1180, U999, W1000, F244
    /^ST\d{1,2}$/i,          // Egger finishes: ST37, ST9
    /^[A-Z]\d{3,4}$/i,       // Polyrey: B015, N118 (single letter + 3-4 digits)
    /^R\d{4}$/i,             // Pfleiderer: R4262
  ];

  return validPatterns.some(pattern => pattern.test(ref));
}

export interface ChantDropZoneProps {
  file: ImportedFileData;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onSearchChant?: () => void;
  onSearchSuggestedChant?: () => void;
  onClearChant?: () => void;
}

export function ChantDropZone({
  file,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onSearchChant,
  onSearchSuggestedChant,
  onClearChant,
}: ChantDropZoneProps) {
  const hasChant = !!file.assignedChant;
  const hasPanel = !!file.assignedPanel;
  const rawRef = file.assignedPanel?.refFabricant;
  // Only suggest if it's a valid decor ref (H1180, W1000, etc.), not a product code (40306625)
  const suggestedRef = hasPanel && isValidDecorRef(rawRef) ? rawRef : null;

  // If chant is assigned - show with remove option
  if (hasChant && file.assignedChant) {
    return (
      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2">
          {file.assignedChant.imageUrl && (
            <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
              <Image
                src={file.assignedChant.imageUrl}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-500">Bande de chant</p>
            <p className="text-xs text-[var(--cx-text)] truncate">
              {file.assignedChant.nom}
            </p>
            {file.assignedChant.epaisseur && (
              <p className="text-[10px] text-[var(--cx-text-muted)]">
                {file.assignedChant.epaisseur}mm
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearChant?.();
            }}
            className="flex-shrink-0 p-1 text-[var(--cx-text-muted)] hover:text-red-400 transition-colors"
            title="Supprimer le chant"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // No chant assigned - show drop zone with suggestion
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`p-2 rounded-lg border border-dashed transition-all ${
        isDragOver
          ? 'bg-amber-500/20 border-amber-500'
          : 'bg-white/5 border-[var(--cx-border)] hover:border-amber-500/30'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
          isDragOver ? 'bg-amber-500/20' : 'bg-white/5'
        }`}>
          <Plus className={`w-4 h-4 ${isDragOver ? 'text-amber-400' : 'text-[var(--cx-text-muted)]'}`} />
        </div>
        <div className="flex-1 min-w-0">
          {isDragOver ? (
            <p className="text-xs text-amber-400 font-medium">
              Deposez le chant ici
            </p>
          ) : suggestedRef ? (
            // Panel has a manufacturer ref - show suggestion
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchSuggestedChant?.();
              }}
              className="text-left w-full group"
            >
              <p className="text-[10px] text-amber-400">Chant suggere</p>
              <p className="text-xs text-[var(--cx-text)] group-hover:text-amber-400 transition-colors truncate">
                {suggestedRef}
                <ArrowRight className="w-3 h-3 inline ml-1 opacity-50 group-hover:opacity-100" />
              </p>
            </button>
          ) : (
            // No suggestion - show add button
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchChant?.();
              }}
              className="text-left w-full"
            >
              <p className="text-xs text-[var(--cx-text-muted)] hover:text-amber-400 transition-colors">
                + Ajouter bande de chant
              </p>
            </button>
          )}
        </div>
      </div>
      {!isDragOver && (
        <p className="text-[9px] text-[var(--cx-text-muted)]/50 mt-1 ml-10">
          Glissez un chant depuis la bibliotheque
        </p>
      )}
    </div>
  );
}
