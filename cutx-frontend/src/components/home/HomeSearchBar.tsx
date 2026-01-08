'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { FileCode, FileSpreadsheet, Upload, CheckCircle, ImageIcon, FolderOpen, Loader2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import SearchInputRow from './SearchInputRow';
import FileCard from './FileCard';
import type { ImportedFileData } from './hooks/useFileImport';

interface ImportedFileInfo {
  name: string;
  linesCount: number;
}

interface HomeSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  isCompact?: boolean;
  autoFocus?: boolean;
  onFileDrop?: (file: File) => void;
  // Import status
  isImporting?: boolean;
  importedFile?: ImportedFileInfo | null;
  importError?: string | null;
  // Multi-file support
  importedFiles?: ImportedFileData[];
  onRemoveFile?: (fileId: string) => void;
  onUnassignPanel?: (fileId: string) => void;
  // State indicators
  someFilesHavePanel?: boolean;
  allFilesHavePanel?: boolean;
  // Action when ready to configure
  onConfigureAll?: () => void;
}

export default function HomeSearchBar({
  value,
  onChange,
  onSearch,
  isSearching,
  isCompact = false,
  autoFocus = false,
  onFileDrop,
  isImporting = false,
  importedFile,
  importError,
  importedFiles = [],
  onRemoveFile,
  onUnassignPanel,
  someFilesHavePanel = false,
  allFilesHavePanel = false,
  onConfigureAll,
}: HomeSearchBarProps) {
  const t = useTranslations('home');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Maintain focus while typing - restore focus after search results update
  // Only refocus if user was actively focused (isFocused state) and input exists
  useEffect(() => {
    if (isFocused && inputRef.current && document.activeElement !== inputRef.current) {
      // Use requestAnimationFrame to ensure DOM has settled after re-render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isSearching, isFocused]);

  // Handle file selection from button click (supports multiple files)
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Process each file
      Array.from(files).forEach(file => {
        onFileDrop?.(file);
      });
    }
    // Reset input to allow selecting same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileDrop]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Global keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim().length >= 2) {
      onSearch();
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  // Drag & drop handlers with proper leave detection
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDragging to false if we're actually leaving the container
    // Check if the related target (where we're going) is outside our drop zone
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !dropZoneRef.current?.contains(relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    // Support DXF, XLSX, XLS, and images
    const supportedExts = ['dxf', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'webp', 'gif'];

    // Process ALL dropped files
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && supportedExts.includes(ext)) {
        onFileDrop?.(file);
      }
    });
  };

  // Focus handlers for SearchInputRow
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Only mark as blurred if focus is moving outside the search bar container
    // This prevents losing focus when clicking inside the search bar (e.g., clear button)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;

    // Check if the new focus target is within the parent container
    if (relatedTarget && currentTarget.parentElement?.contains(relatedTarget)) {
      // Focus is moving within the search bar, keep isFocused true
      return;
    }

    setIsFocused(false);
  }, []);

  // Compact mode (after search)
  if (isCompact) {
    return (
      <div className="relative w-full max-w-2xl">
        <div
          className={`relative w-full bg-[var(--cx-surface-1)] rounded-full overflow-hidden border transition-all duration-200 ${isFocused ? 'border-[var(--cx-border-strong)] shadow-lg shadow-black/30' : 'border-[var(--cx-border)] shadow-md shadow-black/20'}`}
        >
          <SearchInputRow
            ref={inputRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            onClear={handleClear}
            onFocus={handleFocus}
            onBlur={handleBlur}
            isSearching={isSearching}
            size="compact"
          />
        </div>
      </div>
    );
  }

  // Full mode with drop zone
  return (
    <div className="relative w-full max-w-3xl">
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative w-full rounded-2xl overflow-hidden
          bg-[var(--cx-surface-1)] border-2 border-dashed
          transition-all duration-200
          ${isDragging
            ? 'border-amber-500 bg-amber-500/5 shadow-lg shadow-amber-500/10'
            : isFocused
              ? 'border-[var(--cx-border-strong)] shadow-lg shadow-black/30'
              : 'border-[var(--cx-border)] shadow-md shadow-black/20'
          }
        `}
      >
        {/* Drag overlay - captures drop anywhere in the box */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-amber-500/5" />
        )}

        {/* Search row */}
        <SearchInputRow
          ref={inputRef}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onClear={handleClear}
          onFocus={handleFocus}
          onBlur={handleBlur}
          isSearching={isSearching}
          size="full"
        />

        {/* Separator */}
        <div className="mx-6 border-t border-[var(--cx-border)]" />

        {/* Hidden file input - supports multiple files */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".dxf,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.gif"
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Sélectionner des fichiers à importer"
          multiple
        />

        {/* Drop zone / Files display */}
        <div
          role="region"
          aria-label="Zone de dépôt de fichiers"
          className={`px-6 py-4 transition-colors ${isDragging ? 'bg-amber-500/5' : ''}`}
        >
          {isImporting ? (
            <div className="flex items-center justify-center gap-4 h-20 text-amber-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-lg font-medium">Import en cours...</span>
            </div>
          ) : isDragging ? (
            <div className="flex items-center justify-center gap-4 h-20 text-amber-500">
              <Upload className="w-8 h-8 animate-bounce" />
              <span className="text-lg font-medium">Déposez vos fichiers ici</span>
            </div>
          ) : importedFiles.length > 0 ? (
            /* Files imported - show cards */
            <div className="space-y-3">
              {/* File cards */}
              <div className="flex flex-wrap gap-3">
                {importedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onRemove={(id) => onRemoveFile?.(id)}
                    onUnassignPanel={onUnassignPanel}
                  />
                ))}

                {/* Add more button */}
                <button
                  onClick={handleImportClick}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--cx-border)] hover:border-amber-500/50 rounded-xl text-[var(--cx-text-muted)] hover:text-amber-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">Ajouter</span>
                </button>
              </div>

              {/* Hint or Configure button */}
              {allFilesHavePanel ? (
                <button
                  onClick={onConfigureAll}
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Configurer la découpe ({importedFiles.length} fichier{importedFiles.length > 1 ? 's' : ''})
                </button>
              ) : someFilesHavePanel ? (
                <p className="text-center text-xs text-amber-500/80">
                  Certains fichiers n&apos;ont pas de panneau assigné. Recherchez et assignez un panneau à chaque fichier.
                </p>
              ) : (
                <p className="text-center text-xs text-[var(--cx-text-muted)]/60">
                  Recherchez votre panneau ci-dessus pour affecter ces fichiers
                </p>
              )}
            </div>
          ) : importError ? (
            <div className="flex flex-col items-center justify-center gap-2 h-20">
              <span className="text-sm text-red-400">{importError}</span>
              <span className="text-xs text-[var(--cx-text-muted)]/60">
                Glissez un autre fichier pour réessayer
              </span>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-3 h-20">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[var(--cx-text-muted)]">
                  <FileCode className="w-5 h-5" />
                  <span className="text-sm font-medium">DXF</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--cx-text-muted)]">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="text-sm font-medium">XLSX</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--cx-text-muted)]">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Image</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--cx-text-muted)]/60">
                  Glissez vos fichiers ici
                </span>
                <span className="text-[var(--cx-text-muted)]/40">ou</span>
                <button
                  onClick={handleImportClick}
                  aria-label="Parcourir et sélectionner des fichiers à importer"
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--cx-surface-2)] hover:bg-[var(--cx-surface-3)] border border-[var(--cx-border)] hover:border-[var(--cx-border-strong)] rounded-lg text-sm text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] transition-colors"
                >
                  <FolderOpen className="w-4 h-4" aria-hidden="true" />
                  Parcourir
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hint text */}
      {!value && (
        <p className="mt-4 text-center text-sm text-[var(--cx-text-muted)]">
          {t('search.hint')}
        </p>
      )}

      {/* Examples */}
      {!value && (
        <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Exemples de recherche">
          {['MDF 19mm', 'mélaminé blanc', 'chêne massif', 'OSB 18'].map((example) => (
            <button
              key={example}
              onClick={() => onChange(example)}
              aria-label={`Rechercher ${example}`}
              className="px-4 py-2 text-sm text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] border border-[var(--cx-border)] hover:border-[var(--cx-border-strong)] rounded-full transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
