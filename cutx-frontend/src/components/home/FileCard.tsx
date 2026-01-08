'use client';

import Image from 'next/image';
import { FileSpreadsheet, FileCode, X, Package, Check, Layers } from 'lucide-react';
import type { ImportedFileData } from './hooks/useFileImport';

interface FileCardProps {
  file: ImportedFileData;
  onRemove: (fileId: string) => void;
  onUnassignPanel?: (fileId: string) => void;
}

export default function FileCard({ file, onRemove, onUnassignPanel }: FileCardProps) {
  const isDxf = file.name.toLowerCase().endsWith('.dxf');
  const FileIcon = isDxf ? FileCode : FileSpreadsheet;
  const hasPanel = !!file.assignedPanel;

  // Colors based on assignment status
  const borderColor = hasPanel ? 'border-green-500/40' : 'border-amber-500/30';
  const bgColor = hasPanel ? 'bg-green-500/10' : 'bg-amber-500/10';
  const iconColor = isDxf ? 'text-blue-400' : hasPanel ? 'text-green-400' : 'text-amber-400';

  // Format thickness display
  const thicknessDisplay = file.isMixedThickness
    ? file.thicknessBreakdown.map(t => `${t.thickness}mm`).join(', ')
    : `${file.primaryThickness}mm`;

  return (
    <div className={`relative flex flex-col gap-2 px-4 py-3 ${bgColor} border ${borderColor} rounded-xl group`}>
      {/* Top row: File info */}
      <div className="flex items-center gap-3">
        {/* File icon */}
        <div className={`flex-shrink-0 ${iconColor}`}>
          <FileIcon className="w-5 h-5" />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate max-w-[150px]">
              {file.name}
            </span>
            {hasPanel && (
              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            )}
          </div>
          <div className={`flex items-center gap-2 text-xs ${hasPanel ? 'text-green-400/80' : 'text-amber-400/80'}`}>
            <Package className="w-3 h-3" />
            <span>{file.lines.length} pièce{file.lines.length > 1 ? 's' : ''}</span>
            <span className="text-neutral-500">•</span>
            <span className={file.isMixedThickness ? 'text-amber-400' : ''}>
              {thicknessDisplay}
            </span>
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(file.id)}
          className="flex-shrink-0 p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Retirer ce fichier"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom row: Assigned panel (if any) */}
      {hasPanel && file.assignedPanel && (
        <div className="flex items-center gap-2 pl-8">
          {/* Panel image or icon */}
          {file.assignedPanel.imageUrl ? (
            <Image
              src={file.assignedPanel.imageUrl}
              alt={file.assignedPanel.nom}
              width={28}
              height={28}
              className="rounded border border-neutral-700 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded border border-neutral-700 bg-neutral-800 flex items-center justify-center">
              <Layers className="w-4 h-4 text-neutral-500" />
            </div>
          )}

          {/* Panel info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white truncate">
              {file.assignedPanel.nom}
            </div>
            <div className="text-[10px] text-neutral-500 truncate">
              {file.assignedPanel.reference} • {file.assignedPanel.epaisseur}mm
            </div>
          </div>

          {/* Unassign button */}
          {onUnassignPanel && (
            <button
              onClick={() => onUnassignPanel(file.id)}
              className="flex-shrink-0 p-1 text-neutral-500 hover:text-amber-400 hover:bg-amber-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
              title="Retirer l'affectation"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Status indicator when no panel */}
      {!hasPanel && (
        <div className="pl-8 text-xs text-amber-500/60 italic">
          Panneau non assigné
        </div>
      )}
    </div>
  );
}
