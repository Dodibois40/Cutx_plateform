'use client';

import { useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText } from 'lucide-react';
import type { ImportedFileInfo } from './hooks/useFileImport';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  isImporting: boolean;
  importedFile: ImportedFileInfo | null;
  importError: string | null;
  isDragging: boolean;
  onDragStateChange: (isDragging: boolean) => void;
}

export default function FileDropZone({
  onFileSelect,
  isImporting,
  importedFile,
  importError,
  isDragging,
  onDragStateChange,
}: FileDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(true);
  }, [onDragStateChange]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);
  }, [onDragStateChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);

    const files = e.dataTransfer.files;
    console.log('[FileDropZone] Drop event - files:', files.length);
    // Process ALL dropped files
    for (let i = 0; i < files.length; i++) {
      console.log('[FileDropZone] Calling onFileSelect with:', files[i].name);
      onFileSelect(files[i]);
    }
  }, [onFileSelect, onDragStateChange]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    // Process ALL selected files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        onFileSelect(files[i]);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-2">
      {/* Hidden file input - multiple files allowed */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.dxf"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded p-4 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10'
            : importedFile
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/30'
        }`}
      >
        {isImporting ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-neutral-400">Import en cours...</span>
          </div>
        ) : importedFile ? (
          <div className="py-1">
            <div className="flex items-center justify-center gap-2 text-green-500 mb-1">
              {importedFile.name.toLowerCase().endsWith('.dxf') ? (
                <FileText className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span className="text-sm font-medium truncate max-w-[200px]">{importedFile.name}</span>
            </div>
            <p className="text-xs text-green-400/80">
              1 fichier importé • {importedFile.linesCount} pièce{importedFile.linesCount > 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-neutral-500 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">
              Glisser un fichier <span className="text-amber-500">.xlsx</span> ou <span className="text-amber-500">.dxf</span>
            </p>
            <p className="text-[10px] text-neutral-600 mt-1">
              ou cliquer pour parcourir
            </p>
          </>
        )}
      </div>

      {/* Error message */}
      {importError && (
        <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded">
          {importError}
        </p>
      )}
    </div>
  );
}
