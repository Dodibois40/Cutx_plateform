'use client';

/**
 * ThicknessGroup - Card showing a single thickness group
 * Displays thickness, count, and resulting filename
 */

import { Layers, FileCode } from 'lucide-react';
import type { ThicknessGroupProps } from './types';

export default function ThicknessGroup({ breakdown, baseName }: ThicknessGroupProps) {
  const { thickness, count } = breakdown;
  const resultFileName = `${baseName}_${thickness}mm`;

  return (
    <div className="p-3 rounded-lg bg-[var(--cx-surface-1)] border border-[var(--cx-border)]">
      <div className="flex items-center gap-3">
        {/* Thickness badge */}
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="text-sm font-mono font-bold text-amber-500">
            {thickness}mm
          </span>
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-[var(--cx-text)]">
            <Layers className="w-4 h-4 text-[var(--cx-text-muted)]" />
            <span className="font-medium">
              {count} pièce{count > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--cx-text-muted)]">
            <FileCode className="w-3.5 h-3.5" />
            <span className="font-mono">{resultFileName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
