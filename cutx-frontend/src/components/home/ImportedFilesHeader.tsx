'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FileSpreadsheet, FileCode, X, Check, Upload, Layers, Package, ArrowUp, MousePointer2 } from 'lucide-react';
import type { ImportedFileData } from './hooks/useFileImport';
import type { SearchProduct } from './types';

interface ImportedFilesHeaderProps {
  files: ImportedFileData[];
  onRemoveFile: (fileId: string) => void;
  onUnassignPanel?: (fileId: string) => void;
  onConfigureAll?: () => void;
  onFileDrop?: (file: File) => void;
  onAssignPanel?: (fileId: string, panel: SearchProduct) => void;
  allFilesHavePanel?: boolean;
  isImporting?: boolean;
}

export default function ImportedFilesHeader({
  files,
  onRemoveFile,
  onUnassignPanel,
  onConfigureAll,
  onFileDrop,
  onAssignPanel,
  allFilesHavePanel = false,
  isImporting = false,
}: ImportedFilesHeaderProps) {
  const [dragOverFileId, setDragOverFileId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch - files come from sessionStorage which doesn't exist on server
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server or if no files after mounting
  if (!mounted) return null;
  if (files.length === 0 && !isImporting) return null;

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only handle file drops (not panel drops)
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      droppedFiles.forEach(file => onFileDrop?.(file));
    }
  };

  // Handle panel drop on a file card
  const handleFileDragOver = (e: React.DragEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if this is a panel being dragged
    const panelData = e.dataTransfer.types.includes('application/json');
    if (panelData) {
      setDragOverFileId(fileId);
    }
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFileId(null);
  };

  const handleFileDrop = (e: React.DragEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFileId(null);

    try {
      const panelJson = e.dataTransfer.getData('application/json');
      if (panelJson) {
        const panel = JSON.parse(panelJson) as SearchProduct;
        onAssignPanel?.(fileId, panel);
      }
    } catch (error) {
      console.error('Error parsing dropped panel:', error);
    }
  };

  const filesWithPanel = files.filter(f => f.assignedPanel);
  const filesWithoutPanel = files.filter(f => !f.assignedPanel);

  return (
    <div
      className="sticky top-0 z-50 bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-800 relative"
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-neutral-400" />
            <span className="text-sm font-semibold text-white">
              Fichiers importés
            </span>
            <span className="text-sm text-neutral-500">
              ({filesWithPanel.length}/{files.length} affectés)
            </span>
          </div>

          {/* Configure button */}
          {files.length > 0 && allFilesHavePanel && (
            <button
              onClick={onConfigureAll}
              className="px-5 py-2.5 bg-green-500 hover:bg-green-400 text-black text-sm font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-green-500/20"
            >
              Configurer la découpe
              <span className="text-green-800">→</span>
            </button>
          )}
        </div>

        {/* File cards - large 150x150 */}
        <div className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700">
          {files.map((file) => {
            const hasPanel = !!file.assignedPanel;
            const isDxf = file.name.toLowerCase().endsWith('.dxf');
            const FileIcon = isDxf ? FileCode : FileSpreadsheet;
            const isDragOver = dragOverFileId === file.id;

            return (
              <div
                key={file.id}
                onDragOver={(e) => handleFileDragOver(e, file.id)}
                onDragLeave={handleFileDragLeave}
                onDrop={(e) => handleFileDrop(e, file.id)}
                className={`group relative flex-shrink-0 w-[150px] h-[150px] rounded-xl transition-all duration-200 ${
                  isDragOver
                    ? 'bg-white/10 border-2 border-white/50 scale-105 shadow-lg shadow-white/10'
                    : hasPanel
                    ? 'bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600'
                    : 'bg-neutral-900/50 border border-neutral-700 hover:border-neutral-500 drop-zone-awaiting'
                }`}
              >
                {/* Remove button */}
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="absolute -top-2 -right-2 z-10 p-1.5 bg-neutral-900 border border-neutral-700 rounded-full text-neutral-400 hover:text-red-400 hover:border-red-500/50 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                  title="Retirer ce fichier"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Unassign button (when panel assigned) */}
                {hasPanel && onUnassignPanel && (
                  <button
                    onClick={() => onUnassignPanel(file.id)}
                    className="absolute top-1 right-1 z-10 p-1 bg-neutral-900/80 rounded text-neutral-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Retirer l'affectation"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                <div className="flex flex-col items-center justify-center h-full p-3 text-center">
                  {/* Panel image or file icon */}
                  {hasPanel && file.assignedPanel ? (
                    <>
                      {file.assignedPanel.imageUrl ? (
                        <div className="relative w-16 h-16 mb-2 rounded-lg overflow-hidden border border-neutral-700">
                          <Image
                            src={file.assignedPanel.imageUrl}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 mb-2 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                          <Layers className="w-8 h-8 text-neutral-500" />
                        </div>
                      )}
                      <Check className="absolute top-2 left-2 w-4 h-4 text-emerald-500/70" />
                    </>
                  ) : (
                    <div className={`w-16 h-16 mb-2 rounded-lg flex items-center justify-center ${
                      isDragOver ? 'bg-white/10' : 'bg-neutral-800/80'
                    }`}>
                      <FileIcon className={`w-10 h-10 ${isDxf ? 'text-blue-400/80' : 'text-neutral-400'}`} />
                    </div>
                  )}

                  {/* File name */}
                  <span className="text-xs font-medium truncate w-full text-white">
                    {file.name.replace(/\.(xlsx|xls|dxf)$/i, '')}
                  </span>

                  {/* Panel info or drop hint */}
                  {hasPanel && file.assignedPanel ? (
                    <span className="text-[10px] text-neutral-400 truncate w-full mt-0.5">
                      {file.assignedPanel.nom}
                    </span>
                  ) : (
                    <span className={`text-[10px] mt-0.5 ${isDragOver ? 'text-white font-medium' : 'text-neutral-500'}`}>
                      {isDragOver ? 'Déposez ici' : `${file.lines.length} pièces`}
                    </span>
                  )}

                  {/* Thickness badge */}
                  <div className={`mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    hasPanel
                      ? 'bg-neutral-700 text-neutral-300'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    <Package className="w-2.5 h-2.5 inline mr-1" />
                    {file.primaryThickness}mm
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isImporting && (
            <div className="flex-shrink-0 w-[150px] h-[150px] rounded-xl bg-neutral-800/50 border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-xs text-neutral-400">Import...</span>
            </div>
          )}

          {/* Add more files zone */}
          <div className="flex-shrink-0 w-[150px] h-[150px] rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 text-neutral-600 hover:text-neutral-400 transition-colors flex flex-col items-center justify-center cursor-pointer">
            <Upload className="w-7 h-7 mb-2" />
            <span className="text-xs font-medium">+ Ajouter</span>
            <span className="text-[10px] text-neutral-600">fichier</span>
          </div>
        </div>

      </div>

      {/* Floating drag & drop indicator - positioned outside header, floating below */}
      {filesWithoutPanel.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-40 pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-neutral-900/90 backdrop-blur-md border border-white/15 shadow-2xl shadow-black/50">
            {/* Animated hand + panel */}
            <div className="relative flex items-center w-6 h-5">
              <div className="hand-drag-anim">
                <MousePointer2 className="w-4 h-4 text-white/80 rotate-[-15deg]" />
              </div>
              <div className="ghost-panel absolute -top-0.5 left-3 w-2.5 h-2 rounded-sm bg-white/50" />
            </div>

            {/* Arrows going up */}
            <div className="flex items-center gap-0.5">
              <ArrowUp className="w-3.5 h-3.5 text-white/40 float-up-arrow" />
              <ArrowUp className="w-3.5 h-3.5 text-white/60 float-up-arrow" style={{ animationDelay: '0.2s' }} />
              <ArrowUp className="w-3.5 h-3.5 text-white/80 float-up-arrow" style={{ animationDelay: '0.4s' }} />
            </div>

            {/* Text */}
            <span className="text-xs font-medium text-white/90 whitespace-nowrap">
              Glissez un panneau sur un fichier
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
