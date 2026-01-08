'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowRight, Layers } from 'lucide-react';

export interface ThicknessMismatchInfo {
  panelThickness: number;
  panelName: string;
  mismatchedLines: Array<{
    reference: string;
    thickness: number;
  }>;
  matchedCount: number;
}

interface ThicknessMismatchDialogProps {
  open: boolean;
  info: ThicknessMismatchInfo | null;
  onConvert: () => void;
  onKeepUnassigned: () => void;
  onCancel: () => void;
}

export default function ThicknessMismatchDialog({
  open,
  info,
  onConvert,
  onKeepUnassigned,
  onCancel,
}: ThicknessMismatchDialogProps) {
  const t = useTranslations('configurateur');

  if (!open || !info) return null;

  // Group mismatched lines by thickness
  const byThickness = info.mismatchedLines.reduce((acc, line) => {
    const key = line.thickness;
    if (!acc[key]) acc[key] = [];
    acc[key].push(line.reference);
    return acc;
  }, {} as Record<number, string[]>);

  const thicknessGroups = Object.entries(byThickness).map(([thickness, refs]) => ({
    thickness: Number(thickness),
    count: refs.length,
    refs: refs.slice(0, 3), // Show first 3 references
    hasMore: refs.length > 3,
  }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onCancel} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md bg-[#1c1b1a] border border-neutral-700 rounded-lg shadow-xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-neutral-700">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-500/20 rounded-full">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-medium text-white">
                {t('thicknessMismatch.title')}
              </h3>
              <p className="text-sm text-neutral-400">
                {t('thicknessMismatch.subtitle', { count: info.mismatchedLines.length })}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Panel info */}
            <div className="flex items-center gap-2 p-3 bg-neutral-800/50 rounded-lg">
              <Layers className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-300">
                {t('thicknessMismatch.panelSelected')}:
              </span>
              <span className="text-sm font-medium text-white">{info.panelName}</span>
              <span className="text-sm text-amber-500 font-mono ml-auto">
                {info.panelThickness}mm
              </span>
            </div>

            {/* Mismatched groups */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                {t('thicknessMismatch.mismatchedLines')}
              </p>
              {thicknessGroups.map((group) => (
                <div
                  key={group.thickness}
                  className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                >
                  <span className="text-sm font-mono text-red-400 w-12">
                    {group.thickness}mm
                  </span>
                  <ArrowRight className="w-4 h-4 text-neutral-600" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-neutral-300">
                      {group.count} pièce{group.count > 1 ? 's' : ''}
                    </span>
                    <p className="text-xs text-neutral-500 truncate">
                      {group.refs.join(', ')}{group.hasMore ? '...' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Matched info */}
            {info.matchedCount > 0 && (
              <p className="text-xs text-green-400/80">
                ✓ {info.matchedCount} pièce{info.matchedCount > 1 ? 's' : ''} {t('thicknessMismatch.alreadyMatch')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-neutral-700 space-y-2">
            <button
              onClick={onConvert}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              {t('thicknessMismatch.convertAll', { thickness: info.panelThickness })}
            </button>

            <button
              onClick={onKeepUnassigned}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-colors"
            >
              <Layers className="w-4 h-4" />
              {t('thicknessMismatch.keepUnassigned')}
            </button>

            <button
              onClick={onCancel}
              className="w-full px-4 py-2 text-neutral-500 hover:text-neutral-300 text-sm transition-colors"
            >
              {t('thicknessMismatch.cancel')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
