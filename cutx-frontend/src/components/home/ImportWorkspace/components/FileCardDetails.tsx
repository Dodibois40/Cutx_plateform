'use client';

/**
 * FileCardDetails - Expanded content section of AccordionFileCard
 * Shows detection summary, panel info, split button, and chant section
 */

import { Scissors, Search } from 'lucide-react';
import Image from 'next/image';
import type { ImportedFileData } from '../../hooks/useFileImport';
import type { SearchProduct } from '../../types';
import { ChantDropZone } from './ChantDropZone';

export interface FileCardDetailsProps {
  file: ImportedFileData;
  isExpanded: boolean;
  // Chant drag state
  isChantDragOver: boolean;
  onChantDragOver: (e: React.DragEvent) => void;
  onChantDragLeave: (e: React.DragEvent) => void;
  onChantDrop: (e: React.DragEvent) => void;
  // Actions
  onUnassign: () => void;
  onSearchPanel?: (file: ImportedFileData) => void;
  onSplitByThickness?: (fileId: string) => void;
  onSearchChant?: (file: ImportedFileData) => void;
  onSearchSuggestedChant?: (file: ImportedFileData) => void;
  onDropChant?: (chant: SearchProduct) => void;
  onClearChant?: (fileId: string) => void;
}

export function FileCardDetails({
  file,
  isExpanded,
  isChantDragOver,
  onChantDragOver,
  onChantDragLeave,
  onChantDrop,
  onUnassign,
  onSearchPanel,
  onSplitByThickness,
  onSearchChant,
  onSearchSuggestedChant,
  onDropChant,
  onClearChant,
}: FileCardDetailsProps) {
  const hasPanel = !!file.assignedPanel;
  const isVirtualFile = file.lines.length === 0;

  // Get material from detection or from assigned panel
  const materialDisplay = file.detection?.materialHint
    || file.assignedPanel?.type
    || file.assignedPanel?.categorie
    || null;

  return (
    <div className={`overflow-hidden transition-all duration-200 ${
      isExpanded ? 'max-h-[500px]' : 'max-h-0'
    }`}>
      <div className="px-3 pb-3 pt-2 space-y-2 border-t border-[var(--cx-border)]">
        {/* Detection summary - simple text */}
        {file.detection && (
          <div className="text-[11px] text-[var(--cx-text-muted)] space-y-1">
            <div className="flex items-center justify-between">
              <span>Format detecte</span>
              <span className="text-[var(--cx-text)]">{file.detection.formatLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pieces</span>
              <span className="text-[var(--cx-text)]">{file.detection.totalQuantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Formats uniques</span>
              <span className="text-[var(--cx-text)]">{file.detection.uniqueDimensions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Epaisseur</span>
              <span className="text-[var(--cx-text)]">
                {file.primaryThickness}mm
                {file.isMixedThickness && ' (mix)'}
              </span>
            </div>
            {file.detection.hasEdgeBanding && (
              <div className="flex items-center justify-between">
                <span>Chants</span>
                <span className="text-[var(--cx-text)]">{file.detection.edgeBandingCount} pcs</span>
              </div>
            )}
            {materialDisplay && (
              <div className="flex items-center justify-between">
                <span>Materiau</span>
                <span className="text-[var(--cx-text)]">{materialDisplay}</span>
              </div>
            )}
          </div>
        )}

        {/* Split by thickness button - only for mixed thickness files that are not already split */}
        {file.isMixedThickness && !file.isSplitChild && onSplitByThickness && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSplitByThickness(file.id);
            }}
            className="w-full p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-amber-500">Epaisseurs mixtes detectees</p>
                <p className="text-xs font-medium text-[var(--cx-text)]">
                  {file.thicknessBreakdown.map(b => `${b.thickness}mm (${b.count})`).join(', ')}
                </p>
              </div>
              <span className="text-[10px] text-amber-500 flex-shrink-0">
                Separer
              </span>
            </div>
          </button>
        )}

        {/* Detected panel - clickable to search */}
        {!hasPanel && file.detection?.panelSearchQuery && onSearchPanel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSearchPanel(file);
            }}
            className="w-full p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-blue-400">Panneau detecte</p>
                <p className="text-xs font-medium text-[var(--cx-text)] truncate">
                  {file.detection.panelSearchLabel}
                </p>
              </div>
              <span className="text-[10px] text-blue-400 flex-shrink-0">
                Rechercher
              </span>
            </div>
          </button>
        )}

        {/* Edge banding (Chant) section - with drop zone and suggestion */}
        {/* Show for: files with detected chants, files with assigned chant, or virtual files (direct config) */}
        {(file.detection?.hasEdgeBanding || file.detection?.edgeBandingCount > 0 || file.assignedChant || isVirtualFile) && (
          <ChantDropZone
            file={file}
            isDragOver={isChantDragOver}
            onDragOver={onChantDragOver}
            onDragLeave={onChantDragLeave}
            onDrop={onChantDrop}
            onSearchChant={onSearchChant ? () => onSearchChant(file) : undefined}
            onSearchSuggestedChant={onSearchSuggestedChant ? () => onSearchSuggestedChant(file) : undefined}
            onClearChant={onClearChant ? () => onClearChant(file.id) : undefined}
          />
        )}

        {/* Reference if found */}
        {file.foundReference && (
          <div className="text-[10px] text-[var(--cx-text-muted)]">
            Ref: <span className="text-[var(--cx-text)]">{file.foundReference}</span>
          </div>
        )}

        {/* Assigned panel info */}
        {hasPanel && file.assignedPanel && (
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              {file.assignedPanel.imageUrl && (
                <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={file.assignedPanel.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-500">Panneau</p>
                <p className="text-xs text-[var(--cx-text)] truncate">
                  {file.assignedPanel.nom}
                </p>
                <p className="text-[10px] text-[var(--cx-text-muted)] truncate">
                  {file.assignedPanel.refFabricant || file.assignedPanel.reference}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnassign();
                }}
                className="flex-shrink-0 px-2 py-1 text-[10px] text-[var(--cx-text-muted)] hover:text-amber-500 transition-colors"
              >
                Changer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
