'use client';

/**
 * DropZoneVisual - Visual indicator for file drop zones
 * Shows upload icon, instructions, and supported file types
 */

import { Upload, FileSpreadsheet, FileCode, Loader2, Search } from 'lucide-react';

export interface DropZoneVisualProps {
  isDragging: boolean;
  isImporting?: boolean;
  compact?: boolean;
}

export function DropZoneVisual({ isDragging, isImporting = false, compact = false }: DropZoneVisualProps) {
  const boxSize = compact ? 'w-14 h-14' : 'w-20 h-20';
  const smallBoxSize = compact ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = compact ? 'w-7 h-7' : 'w-10 h-10';
  const smallIconSize = compact ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex flex-col items-center text-center">
      {/* Icon box with overlay */}
      <div className={`relative ${compact ? 'mb-4' : 'mb-6'} transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
        <div className={`${boxSize} rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors duration-200 ${
          isDragging
            ? 'border-amber-500 bg-amber-500/20'
            : 'border-[var(--cx-border)] bg-[var(--cx-surface-1)]'
        }`}>
          {isImporting ? (
            <Loader2 className={`${iconSize} text-amber-500 animate-spin`} />
          ) : isDragging ? (
            <Upload className={`${iconSize} text-amber-500 animate-bounce`} />
          ) : (
            <FileSpreadsheet className={`${iconSize} text-[var(--cx-text-muted)]/30`} />
          )}
        </div>
        {!isDragging && !isImporting && (
          <div className={`absolute -bottom-2 -right-2 ${smallBoxSize} rounded-xl bg-[var(--cx-surface-1)] border-2 border-dashed border-[var(--cx-border)] flex items-center justify-center`}>
            <FileCode className={`${smallIconSize} text-[var(--cx-text-muted)]/30`} />
          </div>
        )}
      </div>

      <h3 className={`font-semibold mb-2 transition-colors duration-200 ${compact ? 'text-sm' : 'text-lg'} ${
        isDragging ? 'text-amber-500' : 'text-[var(--cx-text)]'
      }`}>
        {isImporting ? 'Import en cours...' : isDragging ? 'Deposez ici' : 'Importez un fichier'}
      </h3>

      <p className={`text-[var(--cx-text-muted)] mb-4 ${compact ? 'text-xs max-w-[160px]' : 'text-sm max-w-[180px]'}`}>
        {isImporting
          ? 'Analyse du fichier...'
          : isDragging
          ? 'Relachez pour importer'
          : '.xlsx  .dxf'
        }
      </p>

    </div>
  );
}
