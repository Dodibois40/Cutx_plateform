'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Search, X, Loader2, Sparkles, FileCode, FileSpreadsheet, Upload, CheckCircle, ImageIcon, FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
}: HomeSearchBarProps) {
  const t = useTranslations('home');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const shouldMaintainFocusRef = useRef(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Maintain focus while typing - restore focus after search results update
  useEffect(() => {
    if (shouldMaintainFocusRef.current && inputRef.current) {
      // Use requestAnimationFrame to ensure DOM has settled
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isSearching]);

  // Handle file selection from button click
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileDrop?.(files[0]);
    }
    // Reset input to allow selecting same file again
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

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      // Support DXF, XLSX, XLS, and images
      const supportedExts = ['dxf', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'webp', 'gif'];
      if (ext && supportedExts.includes(ext)) {
        onFileDrop?.(file);
      }
    }
  };

  // Compact mode (after search)
  if (isCompact) {
    return (
      <div className="relative w-full max-w-2xl">
        <div
          className={`relative flex items-center w-full h-12 bg-[var(--cx-surface-1)] rounded-full overflow-hidden border transition-all duration-200 ${isFocused ? 'border-[var(--cx-border-strong)] shadow-lg shadow-black/30' : 'border-[var(--cx-border)] shadow-md shadow-black/20'}`}
        >
          <div className="flex items-center justify-center w-12">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-[var(--cx-text-muted)] animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-[var(--cx-text-muted)]" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { setIsFocused(true); shouldMaintainFocusRef.current = true; }}
            onBlur={() => { setIsFocused(false); setTimeout(() => { shouldMaintainFocusRef.current = false; }, 100); }}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent border-none outline-none text-[var(--cx-text)] placeholder:text-[var(--cx-text-muted)] text-base"
            autoComplete="off"
            spellCheck={false}
          />
          {value && (
            <button
              onClick={handleClear}
              className="flex items-center justify-center w-10 h-10 text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <Sparkles className="mr-4 w-5 h-5 text-[var(--cx-text-muted)]" />
        </div>
      </div>
    );
  }

  // Full mode with drop zone
  return (
    <div className="relative w-full max-w-3xl">
      <div
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
        {/* Search row */}
        <div className="flex items-center h-20 px-6">
          <div className="flex items-center justify-center w-10">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-[var(--cx-text-muted)] animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-[var(--cx-text-muted)]" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { setIsFocused(true); shouldMaintainFocusRef.current = true; }}
            onBlur={() => { setIsFocused(false); setTimeout(() => { shouldMaintainFocusRef.current = false; }, 100); }}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent border-none outline-none text-[var(--cx-text)] placeholder:text-[var(--cx-text-muted)] text-lg"
            autoComplete="off"
            spellCheck={false}
          />
          {value && (
            <button
              onClick={handleClear}
              className="flex items-center justify-center w-10 h-10 text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <Sparkles className="w-6 h-6 text-[var(--cx-text-muted)]" />
        </div>

        {/* Separator */}
        <div className="mx-6 border-t border-[var(--cx-border)]" />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".dxf,.xlsx,.xls,.jpg,.jpeg,.png,.webp,.gif"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Drop zone hint */}
        <div className={`flex items-center justify-center gap-6 h-28 px-6 transition-colors ${isDragging ? 'bg-amber-500/5' : importedFile ? 'bg-green-500/5' : ''}`}>
          {isImporting ? (
            <div className="flex items-center gap-4 text-amber-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-lg font-medium">Import en cours...</span>
            </div>
          ) : isDragging ? (
            <div className="flex items-center gap-4 text-amber-500">
              <Upload className="w-8 h-8 animate-bounce" />
              <span className="text-lg font-medium">Déposez votre fichier ici</span>
            </div>
          ) : importedFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 text-green-500">
                <CheckCircle className="w-6 h-6" />
                <span className="text-base font-medium">{importedFile.name}</span>
              </div>
              <span className="text-sm text-green-400/80">
                {importedFile.linesCount} pièce{importedFile.linesCount > 1 ? 's' : ''} importée{importedFile.linesCount > 1 ? 's' : ''} — Recherchez votre panneau ci-dessus
              </span>
            </div>
          ) : importError ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-red-400">{importError}</span>
              <span className="text-xs text-[var(--cx-text-muted)]/60">
                Glissez un autre fichier pour réessayer
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
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
                  Glissez un fichier ici
                </span>
                <span className="text-[var(--cx-text-muted)]/40">ou</span>
                <button
                  onClick={handleImportClick}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--cx-surface-2)] hover:bg-[var(--cx-surface-3)] border border-[var(--cx-border)] hover:border-[var(--cx-border-strong)] rounded-lg text-sm text-[var(--cx-text-muted)] hover:text-[var(--cx-text)] transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
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
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {['MDF 19mm', 'mélaminé blanc', 'chêne massif', 'OSB 18'].map((example) => (
            <button
              key={example}
              onClick={() => onChange(example)}
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
