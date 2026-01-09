'use client';

/**
 * WorkspaceBottomBar - Bottom action bar for the Import Workspace
 * Compact vertical layout for the right panel
 */

import { CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
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
    <div className="flex-shrink-0 p-3 border-t border-[var(--cx-border)] bg-[var(--cx-surface-1)]/50">
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[var(--cx-text-muted)]">
            {totalFiles} fichier{totalFiles > 1 ? 's' : ''} • {totalPieces} pièces
          </span>
          <span className={`text-xs font-medium ${allAssigned ? 'text-green-500' : 'text-amber-500'}`}>
            {assignedFiles}/{totalFiles}
          </span>
        </div>
        <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
              allAssigned ? 'bg-green-500' : 'bg-amber-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {/* Main action button */}
        <button
          onClick={onConfigureAll}
          disabled={!allAssigned || totalFiles === 0}
          className={`w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            allAssigned && totalFiles > 0
              ? 'bg-amber-500 hover:bg-amber-400 text-black'
              : 'bg-white/10 text-[var(--cx-text-muted)] cursor-not-allowed'
          }`}
        >
          {allAssigned ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Configurer
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            'Affecter les panneaux'
          )}
        </button>

        {/* Reset button */}
        <button
          onClick={onReset}
          className="w-full px-3 py-1.5 text-xs text-[var(--cx-text-muted)] hover:text-red-500 transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
