'use client';

/**
 * WorkspaceBottomBar - Bottom action bar for the Import Workspace
 * Shows summary stats and the main action button
 */

import { FileSpreadsheet, Layers, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import type { WorkspaceBottomBarProps } from './types';

export default function WorkspaceBottomBar({
  totalFiles,
  assignedFiles,
  totalPieces,
  allAssigned,
  onConfigureAll,
  onReset,
}: WorkspaceBottomBarProps) {
  const progress = totalFiles > 0 ? (assignedFiles / totalFiles) * 100 : 0;

  return (
    <div className="flex-shrink-0 h-20 bg-[var(--cx-surface-1)]/40 backdrop-blur-xl shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]">
      <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Left side - Stats */}
        <div className="flex items-center gap-6">
          {/* Files count */}
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[var(--cx-text-muted)]" />
            <div>
              <div className="text-sm font-medium text-[var(--cx-text)]">
                {totalFiles} fichier{totalFiles > 1 ? 's' : ''}
              </div>
              <div className="text-xs text-[var(--cx-text-muted)]">
                {totalPieces} pièces total
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-white/5" />

          {/* Assignment progress */}
          <div className="flex items-center gap-3">
            <div className="relative w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 bg-amber-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              {allAssigned ? (
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
              ) : (
                <Layers className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-sm font-medium text-amber-500">
                {assignedFiles}/{totalFiles} affectés
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Reset button */}
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-[var(--cx-text-muted)] hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>

          {/* Main action button */}
          <button
            onClick={onConfigureAll}
            disabled={!allAssigned || totalFiles === 0}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              allAssigned && totalFiles > 0
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
                : 'bg-white/10 text-[var(--cx-text-muted)] cursor-not-allowed'
            }`}
          >
            Configurer la découpe
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
