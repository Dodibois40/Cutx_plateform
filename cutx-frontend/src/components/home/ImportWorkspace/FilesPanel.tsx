'use client';

/**
 * FilesPanel - Right side of the Import Workspace
 * Shows imported files with accordion behavior (one expanded at a time)
 * Files are drop targets for panels
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, ChevronDown, ChevronRight, FileSpreadsheet, FileCode, X, Check, ArrowRight, Loader2, Search } from 'lucide-react';
import Image from 'next/image';
import type { FilesPanelProps } from './types';
import type { SearchProduct } from '../types';
import type { ImportedFileData } from '../hooks/useFileImport';

export default function FilesPanel({
  files,
  selectedFileId,
  onSelectFile,
  onRemoveFile,
  onUnassignPanel,
  onAssignPanel,
  onFileDrop,
  isImporting = false,
  onSearchPanel,
}: FilesPanelProps) {
  // Track which files are expanded (multiple can be expanded)
  const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(new Set());
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const prevFilesCountRef = useRef(files.length);

  // Handle file drag events for adding more files
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if it's a file (not a panel)
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0 && onFileDrop) {
      const file = droppedFiles[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      const supportedExts = ['dxf', 'xlsx', 'xls'];
      if (ext && supportedExts.includes(ext)) {
        onFileDrop(file);
      }
    }
  }, [onFileDrop]);

  // Auto-expand newly added files
  useEffect(() => {
    if (files.length > prevFilesCountRef.current) {
      // New file was added - expand it
      const newestFile = files[files.length - 1];
      setExpandedFileIds(prev => new Set([...prev, newestFile.id]));
    }
    prevFilesCountRef.current = files.length;
  }, [files]);

  // Only auto-expand on initial mount if files exist
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && files.length > 0 && expandedFileIds.size === 0) {
      hasInitializedRef.current = true;
      const firstUnassigned = files.find(f => !f.assignedPanel);
      if (firstUnassigned) {
        setExpandedFileIds(new Set([firstUnassigned.id]));
      } else {
        setExpandedFileIds(new Set([files[0].id]));
      }
    }
  }, [files, expandedFileIds.size]);

  const handleToggleExpand = (fileId: string) => {
    setExpandedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
    onSelectFile(fileId);
  };

  const filesWithoutPanel = files.filter(f => !f.assignedPanel);
  const filesWithPanel = files.filter(f => f.assignedPanel);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--cx-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-amber-500/70" />
            <h2 className="text-base font-semibold text-[var(--cx-text)]">Fichiers</h2>
          </div>
          <div className="text-xs text-[var(--cx-text-muted)] bg-white/5 px-2 py-1 rounded-full">
            {filesWithPanel.length}/{files.length}
          </div>
        </div>
      </div>

      {/* Files list */}
      <div className="flex-1 overflow-y-auto p-3">
        {files.length === 0 ? (
          <EmptyFilesState />
        ) : (
          <div className="space-y-2">
            {/* Unassigned files first */}
            {filesWithoutPanel.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-amber-500 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  En attente ({filesWithoutPanel.length})
                </div>
                {filesWithoutPanel.map((file) => (
                  <AccordionFileCard
                    key={file.id}
                    file={file}
                    isExpanded={expandedFileIds.has(file.id)}
                    onToggle={() => handleToggleExpand(file.id)}
                    onRemove={() => onRemoveFile(file.id)}
                    onUnassign={() => onUnassignPanel(file.id)}
                    onDrop={(panel) => onAssignPanel(file.id, panel)}
                    onSearchPanel={onSearchPanel}
                  />
                ))}
              </div>
            )}

            {/* Separator */}
            {filesWithoutPanel.length > 0 && filesWithPanel.length > 0 && (
              <div className="my-3 h-px bg-white/5" />
            )}

            {/* Assigned files */}
            {filesWithPanel.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-green-500 px-1">
                  <Check className="w-3 h-3" />
                  Assignés ({filesWithPanel.length})
                </div>
                {filesWithPanel.map((file) => (
                  <AccordionFileCard
                    key={file.id}
                    file={file}
                    isExpanded={expandedFileIds.has(file.id)}
                    onToggle={() => handleToggleExpand(file.id)}
                    onRemove={() => onRemoveFile(file.id)}
                    onUnassign={() => onUnassignPanel(file.id)}
                    onDrop={(panel) => onAssignPanel(file.id, panel)}
                    onSearchPanel={onSearchPanel}
                  />
                ))}
              </div>
            )}

            {/* Add more files zone - same visual as empty state */}
            {onFileDrop && (
              <AddMoreFilesZone
                isDragging={isDraggingFile}
                isImporting={isImporting}
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
                onDrop={handleFileDrop}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Accordion File Card with collapsed/expanded states
interface AccordionFileCardProps {
  file: ImportedFileData;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUnassign: () => void;
  onDrop: (panel: SearchProduct) => void;
  onSearchPanel?: (query: string) => void;
}

function AccordionFileCard({
  file,
  isExpanded,
  onToggle,
  onRemove,
  onUnassign,
  onDrop,
  onSearchPanel,
}: AccordionFileCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const hasPanel = !!file.assignedPanel;
  const isDxf = file.name.toLowerCase().endsWith('.dxf');
  const FileIcon = isDxf ? FileCode : FileSpreadsheet;

  // Handle drag events
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
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/5 transition-colors"
      >
        {/* Expand/collapse icon */}
        <button className="flex-shrink-0 text-[var(--cx-text-muted)]">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* File icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          hasPanel ? 'bg-green-500/10' : 'bg-white/5'
        }`}>
          {hasPanel ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : isDragOver ? (
            <ArrowRight className="w-4 h-4 text-amber-500 animate-pulse" />
          ) : (
            <FileIcon className={`w-4 h-4 ${isDxf ? 'text-amber-400' : 'text-[var(--cx-text-muted)]'}`} />
          )}
        </div>

        {/* File name and quick stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--cx-text)] truncate">
              {file.name.replace(/\.(xlsx|xls|dxf)$/i, '')}
            </span>
          </div>
          {isDragOver && !hasPanel ? (
            <div className="text-xs text-amber-500 font-medium animate-pulse">
              ↓ Relâchez pour affecter
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[var(--cx-text-muted)]">
              <span>{file.lines.length} pcs</span>
              <span>•</span>
              <span>{file.primaryThickness}mm</span>
              {file.isMixedThickness && (
                <>
                  <span>•</span>
                  <span className="text-amber-500">Mix</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 p-1.5 rounded-full text-[var(--cx-text-muted)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
          title="Retirer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded details */}
      <div className={`overflow-hidden transition-all duration-200 ${
        isExpanded ? 'max-h-[500px]' : 'max-h-0'
      }`}>
        <div className="px-3 pb-3 pt-2 space-y-2 border-t border-[var(--cx-border)]">
          {/* Detection summary - simple text */}
          {file.detection && (
            <div className="text-[11px] text-[var(--cx-text-muted)] space-y-1">
              <div className="flex items-center justify-between">
                <span>Format détecté</span>
                <span className="text-[var(--cx-text)]">{file.detection.formatLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pièces</span>
                <span className="text-[var(--cx-text)]">{file.detection.totalQuantity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Formats uniques</span>
                <span className="text-[var(--cx-text)]">{file.detection.uniqueDimensions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Épaisseur</span>
                <span className="text-[var(--cx-text)]">
                  {file.primaryThickness}mm
                  {file.isMixedThickness && ' (mix)'}
                </span>
              </div>
              {file.detection.hasEdgeBanding && (
                <div className="flex items-center justify-between">
                  <span>Chants</span>
                  <span className="text-[var(--cx-text)]">{file.detection.edgeBandingCount} pcs</span>
                </div>
              )}
              {file.detection.materialHint && (
                <div className="flex items-center justify-between">
                  <span>Matériau</span>
                  <span className="text-[var(--cx-text)]">{file.detection.materialHint}</span>
                </div>
              )}
            </div>
          )}

          {/* Detected panel - clickable to search */}
          {!hasPanel && file.detection?.panelSearchQuery && onSearchPanel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchPanel(file.detection!.panelSearchQuery!);
              }}
              className="w-full p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-blue-400">Panneau détecté</p>
                  <p className="text-xs font-medium text-[var(--cx-text)] truncate">
                    {file.detection.panelSearchLabel}
                  </p>
                </div>
                <span className="text-[10px] text-blue-400 flex-shrink-0">
                  Rechercher
                </span>
              </div>
            </button>
          )}

          {/* Reference if found */}
          {file.foundReference && (
            <div className="text-[10px] text-[var(--cx-text-muted)]">
              Réf: <span className="text-[var(--cx-text)]">{file.foundReference}</span>
            </div>
          )}

          {/* Assigned panel info */}
          {hasPanel && file.assignedPanel && (
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2">
                {file.assignedPanel.imageUrl && (
                  <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={file.assignedPanel.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-500 truncate">
                    {file.assignedPanel.nom}
                  </p>
                  <p className="text-[10px] text-[var(--cx-text-muted)] truncate">
                    {file.assignedPanel.refFabricant || file.assignedPanel.reference}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnassign();
                  }}
                  className="flex-shrink-0 px-2 py-1 text-[10px] text-[var(--cx-text-muted)] hover:text-amber-500 transition-colors"
                >
                  Changer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared drop zone visual component - exported for reuse in page.tsx
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
        {isImporting ? 'Import en cours...' : isDragging ? 'Déposez ici' : 'Glissez vos fichiers'}
      </h3>

      <p className={`text-[var(--cx-text-muted)] mb-4 ${compact ? 'text-xs max-w-[160px]' : 'text-sm max-w-[180px]'}`}>
        {isImporting
          ? 'Analyse du fichier...'
          : isDragging
          ? 'Relâchez pour importer'
          : 'Importez vos fichiers Excel ou DXF pour commencer'
        }
      </p>

      {!isDragging && !isImporting && (
        <div className={`flex flex-col gap-2 text-[var(--cx-text-muted)] ${compact ? 'text-[10px]' : 'text-xs'}`}>
          <span className="flex items-center gap-1.5 justify-center">
            <FileSpreadsheet className="w-4 h-4" />
            .xlsx, .xls
          </span>
          <span className="flex items-center gap-1.5 justify-center">
            <FileCode className="w-4 h-4" />
            .dxf
          </span>
        </div>
      )}
    </div>
  );
}

// Empty state when no files are imported (full height)
function EmptyFilesState() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <DropZoneVisual isDragging={false} />
    </div>
  );
}

// Add more files zone at bottom of list
interface AddMoreFilesZoneProps {
  isDragging: boolean;
  isImporting: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function AddMoreFilesZone({ isDragging, isImporting, onDragOver, onDragLeave, onDrop }: AddMoreFilesZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="mt-6 py-4"
    >
      <DropZoneVisual isDragging={isDragging} isImporting={isImporting} compact />
    </div>
  );
}
