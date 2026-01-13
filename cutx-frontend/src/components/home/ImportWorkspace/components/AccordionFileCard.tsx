'use client';

/**
 * AccordionFileCard - Expandable file card with drag-drop support
 * Collapsed: Shows file name, piece count, thickness
 * Expanded: Shows detection summary, panel info, chant section
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileSpreadsheet, FileCode, X, Check, ArrowRight } from 'lucide-react';
import type { ImportedFileData } from '../../hooks/useFileImport';
import type { SearchProduct } from '../../types';
import { FileCardDetails } from './FileCardDetails';

export interface AccordionFileCardProps {
  file: ImportedFileData;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUnassign: () => void;
  onDrop: (panel: SearchProduct) => void;
  onSearchPanel?: (query: string) => void;
  onSplitByThickness?: (fileId: string) => void;
  onSearchChant?: (file: ImportedFileData) => void;
  onSearchSuggestedChant?: (file: ImportedFileData) => void;
  onDropChant?: (chant: SearchProduct) => void;
  onClearChant?: (fileId: string) => void;
  isCompact?: boolean;
}

export function AccordionFileCard({
  file,
  isExpanded,
  onToggle,
  onRemove,
  onUnassign,
  onDrop,
  onSearchPanel,
  onSplitByThickness,
  onSearchChant,
  onSearchSuggestedChant,
  onDropChant,
  onClearChant,
  isCompact = false,
}: AccordionFileCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isChantDragOver, setIsChantDragOver] = useState(false);

  const hasPanel = !!file.assignedPanel;
  const isDxf = file.name.toLowerCase().endsWith('.dxf');
  const isVirtualFile = file.lines.length === 0; // Virtual file = product dropped without import
  const FileIcon = isDxf ? FileCode : FileSpreadsheet;

  // Handle drag events for panel drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/json')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const panelJson = e.dataTransfer.getData('application/json');
      if (panelJson) {
        const panel = JSON.parse(panelJson) as SearchProduct;
        onDrop(panel);
      }
    } catch (error) {
      console.error('Error parsing dropped panel:', error);
    }
  };

  // Handle chant drop
  const handleChantDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsChantDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const product = JSON.parse(data) as SearchProduct;
        // Only accept edge banding products
        if (product.productType === 'BANDE_DE_CHANT') {
          onDropChant?.(product);
        }
      }
    } catch (err) {
      console.error('Failed to parse dropped chant:', err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        isDragOver
          ? 'bg-amber-500/10 border-amber-500 border-dashed shadow-lg shadow-amber-500/20 scale-[1.02]'
          : hasPanel
          ? 'bg-green-500/5 border-green-500/30'
          : 'bg-[var(--cx-surface-1)]/50 border-[var(--cx-border)] hover:border-[var(--cx-border-hover)]'
      }`}
    >
      {/* Collapsed header - always visible */}
      <div
        onClick={onToggle}
        className={`flex items-center cursor-pointer hover:bg-white/5 transition-colors ${
          isCompact ? 'gap-1.5 p-2' : 'gap-2 p-3'
        }`}
      >
        {/* Expand/collapse icon - hidden in compact mode */}
        {!isCompact && (
          <button className="flex-shrink-0 text-[var(--cx-text-muted)]">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}

        {/* File icon */}
        <div className={`flex-shrink-0 rounded-lg flex items-center justify-center ${
          isCompact ? 'w-6 h-6' : 'w-8 h-8'
        } ${hasPanel ? 'bg-green-500/10' : 'bg-white/5'}`}>
          {hasPanel ? (
            <Check className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-green-500`} />
          ) : isDragOver ? (
            <ArrowRight className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-amber-500 animate-pulse`} />
          ) : (
            <FileIcon className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} ${isDxf ? 'text-amber-400' : 'text-[var(--cx-text-muted)]'}`} />
          )}
        </div>

        {/* File name and quick stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`font-medium text-[var(--cx-text)] truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
              {file.name.replace(/\.(xlsx|xls|dxf)$/i, '')}
            </span>
          </div>
          {isDragOver && !hasPanel ? (
            <div className={`text-amber-500 font-medium animate-pulse ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
              ↓ Relachez
            </div>
          ) : isVirtualFile ? (
            <div className={`flex items-center ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
              <span className="text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                Config directe
              </span>
            </div>
          ) : (
            <div className={`flex items-center gap-1 text-[var(--cx-text-muted)] ${isCompact ? 'text-[10px]' : 'text-xs gap-2'}`}>
              <span>{file.lines.length} pcs</span>
              <span>&#8226;</span>
              <span>{file.primaryThickness}mm</span>
              {!isCompact && file.isMixedThickness && (
                <>
                  <span>&#8226;</span>
                  <span className="text-amber-500">Mix</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Remove button - smaller in compact mode */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`flex-shrink-0 rounded-full text-[var(--cx-text-muted)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all ${
            isCompact ? 'p-1' : 'p-1.5'
          }`}
          title="Retirer"
        >
          <X className={isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      </div>

      {/* Expanded details */}
      <FileCardDetails
        file={file}
        isExpanded={isExpanded}
        isChantDragOver={isChantDragOver}
        onChantDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.types.includes('application/json')) {
            setIsChantDragOver(true);
          }
        }}
        onChantDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsChantDragOver(false);
        }}
        onChantDrop={handleChantDrop}
        onUnassign={onUnassign}
        onSearchPanel={onSearchPanel}
        onSplitByThickness={onSplitByThickness}
        onSearchChant={onSearchChant}
        onSearchSuggestedChant={onSearchSuggestedChant}
        onDropChant={onDropChant}
        onClearChant={onClearChant}
      />
    </div>
  );
}
