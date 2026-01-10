'use client';

/**
 * FilesPanel - Right side of the Import Workspace
 * Shows imported files with accordion behavior (one expanded at a time)
 * Files are drop targets for panels
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Check } from 'lucide-react';
import type { FilesPanelProps } from './types';
import type { SearchProduct } from '../types';
import type { ImportedFileData } from '../hooks/useFileImport';
import { AccordionFileCard, DropZoneVisual } from './components';

// Re-export DropZoneVisual for backward compatibility
export { DropZoneVisual } from './components';

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
  onSplitByThickness,
  onSearchChant,
  onSearchSuggestedChant,
  onAssignChant,
  onClearChant,
}: FilesPanelProps & {
  onSearchSuggestedChant?: (file: ImportedFileData) => void;
  onAssignChant?: (fileId: string, chant: SearchProduct) => void;
}) {
  // Track which files are expanded (multiple can be expanded)
  const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(new Set());
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const prevFilesCountRef = useRef(files.length);

  // Handle file drag events for adding more files
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    const supportedExts = ['dxf', 'xlsx', 'xls'];

    // Process ALL dropped files, not just the first one
    if (onFileDrop) {
      for (let i = 0; i < droppedFiles.length; i++) {
        const file = droppedFiles[i];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext && supportedExts.includes(ext)) {
          onFileDrop(file);
        }
      }
    }
  }, [onFileDrop]);

  // Auto-expand newly added files
  useEffect(() => {
    if (files.length > prevFilesCountRef.current) {
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

  const assignedCount = files.filter(f => f.assignedPanel).length;
  const pendingCount = files.length - assignedCount;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--cx-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-amber-500/70" />
            <h2 className="text-base font-semibold text-[var(--cx-text)]">Fichiers</h2>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {pendingCount} en attente
              </span>
            )}
            {assignedCount > 0 && (
              <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                {assignedCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Files list - single column or 2-column grid when many files */}
      <div className="flex-1 overflow-y-auto p-3">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <DropZoneVisual isDragging={false} />
          </div>
        ) : (
          <div className={files.length > 10 ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {/* All files in order of import - status shown visually */}
            {files.map((file, index) => (
              <div
                key={file.id}
                data-file-card={index === 0 ? 'first' : undefined}
                className={files.length > 10 && expandedFileIds.has(file.id) ? 'col-span-2' : ''}
              >
                <AccordionFileCard
                  file={file}
                  isExpanded={expandedFileIds.has(file.id)}
                  onToggle={() => handleToggleExpand(file.id)}
                  onRemove={() => onRemoveFile(file.id)}
                  onUnassign={() => onUnassignPanel(file.id)}
                  onDrop={(panel) => onAssignPanel(file.id, panel)}
                  onSearchPanel={onSearchPanel}
                  onSplitByThickness={onSplitByThickness}
                  onSearchChant={onSearchChant}
                  onSearchSuggestedChant={onSearchSuggestedChant}
                  onDropChant={onAssignChant ? (chant) => onAssignChant(file.id, chant) : undefined}
                  onClearChant={onClearChant}
                  isCompact={files.length > 10 && !expandedFileIds.has(file.id)}
                />
              </div>
            ))}

            {/* Add more files zone - spans full width in grid mode */}
            {onFileDrop && (
              <div className={files.length > 10 ? 'col-span-2' : ''}>
                <div
                  onDragOver={handleFileDragOver}
                  onDragLeave={handleFileDragLeave}
                  onDrop={handleFileDrop}
                  className="mt-6 py-4"
                >
                  <DropZoneVisual isDragging={isDraggingFile} isImporting={isImporting} compact />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
