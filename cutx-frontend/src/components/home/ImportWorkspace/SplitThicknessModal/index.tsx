'use client';

/**
 * SplitThicknessModal - Modal to split a file by thickness
 * When a DXF/Excel file contains panels with different thicknesses,
 * this modal allows splitting into separate sub-files per thickness
 */

import { Scissors, FileCode, AlertCircle } from 'lucide-react';
import ThicknessGroup from './ThicknessGroup';
import type { SplitThicknessModalProps } from './types';

export default function SplitThicknessModal({
  open,
  file,
  onSplit,
  onCancel,
}: SplitThicknessModalProps) {
  if (!open || !file) return null;

  const { thicknessBreakdown, name } = file;
  const baseName = name.replace(/\.(xlsx|xls|dxf)$/i, '');

  // Sort by piece count (most first)
  const sortedBreakdown = [...thicknessBreakdown].sort((a, b) => b.count - a.count);

  const handleSplit = () => {
    console.log('[SplitThicknessModal] handleSplit called, file.id:', file.id);
    onSplit(file.id);
    console.log('[SplitThicknessModal] onSplit called');
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onCancel} />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md bg-[#1c1b1a] border border-neutral-700 rounded-lg shadow-xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-neutral-700">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-500/20 rounded-full">
              <Scissors className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-medium text-white">
                Séparer par épaisseur
              </h3>
              <p className="text-sm text-neutral-400 truncate max-w-[280px]">
                {name}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">
                Ce fichier contient {thicknessBreakdown.length} épaisseurs différentes.
                La séparation créera un sous-fichier par épaisseur.
              </p>
            </div>

            {/* Thickness groups */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                Groupes détectés
              </p>
              {sortedBreakdown.map((breakdown) => (
                <ThicknessGroup
                  key={breakdown.thickness}
                  breakdown={breakdown}
                  baseName={baseName}
                />
              ))}
            </div>

            {/* Result preview */}
            <div className="p-3 bg-neutral-800/50 rounded-lg">
              <p className="text-xs text-neutral-500 mb-2">Fichiers résultants :</p>
              <div className="space-y-1">
                {sortedBreakdown.map((b) => (
                  <div key={b.thickness} className="flex items-center gap-2 text-xs">
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-neutral-300 font-mono">
                      {baseName}_{b.thickness}mm
                    </span>
                    <span className="text-neutral-500">
                      ({b.count} pcs)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-neutral-700 flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-colors text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleSplit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors text-sm"
            >
              <Scissors className="w-4 h-4" />
              Séparer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
