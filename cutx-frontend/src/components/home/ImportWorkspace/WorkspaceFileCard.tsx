'use client';

/**
 * WorkspaceFileCard - Individual file card with drop zone
 * Shows file info and assigned panel
 * Accepts panel drops for assignment
 */

import { useState, useCallback } from 'react';
import { FileSpreadsheet, FileCode, X, Check, Package, Layers, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import type { WorkspaceFileCardProps } from './types';
import type { SearchProduct } from '../types';

export default function WorkspaceFileCard({
  file,
  isSelected,
  onSelect,
  onRemove,
  onUnassign,
  onDrop,
}: WorkspaceFileCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const hasPanel = !!file.assignedPanel;
  const isDxf = file.name.toLowerCase().endsWith('.dxf');
  const FileIcon = isDxf ? FileCode : FileSpreadsheet;

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if this is panel data (not a file)
    if (e.dataTransfer.types.includes('application/json')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
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
  }, [onDrop]);

  return (
    <div
      onClick={onSelect}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
        isDragOver
          ? 'bg-amber-500/10 border-amber-500 scale-[1.02] shadow-lg shadow-amber-500/10'
          : hasPanel
          ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
          : isSelected
          ? 'bg-[var(--cx-surface-1)] border-amber-500/50 workspace-file-selected'
          : 'bg-[var(--cx-surface-1)]/50 border-[var(--cx-border)] hover:border-[var(--cx-border-hover)] workspace-file-waiting'
      }`}
    >
      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-[var(--cx-surface-1)] border border-[var(--cx-border)] text-[var(--cx-text-muted)] hover:text-red-500 hover:border-red-500/50 opacity-0 group-hover:opacity-100 transition-all"
        title="Retirer ce fichier"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex gap-4">
        {/* File icon / Panel image */}
        <div className="flex-shrink-0">
          {hasPanel && file.assignedPanel?.imageUrl ? (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-amber-500/30">
              <Image
                src={file.assignedPanel.imageUrl}
                alt=""
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <Check className="absolute bottom-1 right-1 w-4 h-4 text-amber-500" />
            </div>
          ) : (
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
              isDragOver
                ? 'bg-amber-500/20 border-2 border-dashed border-amber-500'
                : hasPanel
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'bg-white/5 border border-[var(--cx-border)]'
            }`}>
              {isDragOver ? (
                <ArrowRight className="w-6 h-6 text-amber-500 animate-pulse" />
              ) : hasPanel ? (
                <Layers className="w-6 h-6 text-amber-500" />
              ) : (
                <FileIcon className={`w-6 h-6 ${isDxf ? 'text-amber-400' : 'text-[var(--cx-text-muted)]'}`} />
              )}
            </div>
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-[var(--cx-text)] truncate">
              {file.name.replace(/\.(xlsx|xls|dxf)$/i, '')}
            </h4>
            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-[var(--cx-text-muted)]">
              <Package className="w-2.5 h-2.5 inline mr-1" />
              {file.primaryThickness}mm
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-sm text-[var(--cx-text-muted)]">
            <span>{file.lines.length} pièces</span>
            {file.isMixedThickness && (
              <span className="text-amber-500 text-xs">
                Épaisseurs mixtes
              </span>
            )}
          </div>

          {/* Panel info when assigned */}
          {hasPanel && file.assignedPanel && (
            <div className="mt-2 pt-2 border-t border-[var(--cx-border)]">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-amber-500 truncate block">
                    {file.assignedPanel.nom}
                  </span>
                  <span className="text-xs text-[var(--cx-text-muted)]">
                    {file.assignedPanel.refFabricant || file.assignedPanel.reference}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnassign();
                  }}
                  className="ml-2 px-2 py-1 text-xs text-[var(--cx-text-muted)] hover:text-amber-500 transition-colors"
                >
                  Changer
                </button>
              </div>
            </div>
          )}

          {/* Drop hint when not assigned */}
          {!hasPanel && (
            <div className={`mt-2 pt-2 border-t border-[var(--cx-border)] ${
              isDragOver ? 'opacity-100' : 'opacity-60'
            }`}>
              <span className={`text-xs ${isDragOver ? 'text-amber-500 font-medium' : 'text-[var(--cx-text-muted)]'}`}>
                {isDragOver ? 'Relâchez pour affecter le panneau' : 'Glissez un panneau ici'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
