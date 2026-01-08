'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { X, ShoppingCart, Scissors, ImageIcon, FileSpreadsheet, FileCode, Check, Package } from 'lucide-react';
import type { SearchProduct } from './types';
import FileDropZone from './FileDropZone';
import { useFileImport, type ImportedFileInfo, type ImportedFileData, MULTI_IMPORT_STORAGE_KEY } from './hooks/useFileImport';
import { MULTI_GROUP_CONFIG_KEY, type GroupConfig } from './MultiFileImportWizard';
import type { LignePrestationV3 } from '@/lib/configurateur/types';

interface PanelActionPopupProps {
  open: boolean;
  product: SearchProduct | null;
  onClose: () => void;
  // Pre-imported file from homepage drop zone
  preImportedFile?: ImportedFileInfo | null;
  preImportedLines?: LignePrestationV3[];
  preImportError?: string | null;
  onClearPreImport?: () => void;
  // Multi-file support
  importedFiles?: ImportedFileData[];
  // Callback when panel is assigned to files (assigns without navigating)
  onAssignPanelToFiles?: (fileIds: string[], panel: SearchProduct) => void;
}

export default function PanelActionPopup({
  open,
  product,
  onClose,
  preImportedFile,
  preImportedLines = [],
  preImportError,
  onClearPreImport,
  importedFiles = [],
  onAssignPanelToFiles,
}: PanelActionPopupProps) {
  const t = useTranslations('home');
  const router = useRouter();
  const [step, setStep] = useState<'choice' | 'reference'>('choice');
  const [debitReference, setDebitReference] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Multi-file selection
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Check if we have multiple files to choose from
  const hasMultipleFiles = importedFiles.length > 1;

  const {
    isImporting,
    importError: localImportError,
    importedFile: localImportedFile,
    importedLines: localImportedLines,
    processFile,
    resetImport: resetLocalImport,
    saveToSession,
    clearSession,
  } = useFileImport();

  // Merge pre-imported and local import data (local takes precedence if both exist)
  const effectiveFile = localImportedFile || preImportedFile || null;
  const effectiveLines = localImportedLines.length > 0 ? localImportedLines : preImportedLines;
  const effectiveError = localImportError || preImportError || null;

  // Auto-expand if there are imported files
  useEffect(() => {
    if (open && (preImportedFile || importedFiles.length > 0) && step === 'choice') {
      setStep('reference');
    }
  }, [open, preImportedFile, importedFiles.length, step]);

  // Auto-select all files when opening with multiple files
  useEffect(() => {
    if (open && importedFiles.length > 0) {
      setSelectedFileIds(new Set(importedFiles.map(f => f.id)));
    }
  }, [open, importedFiles]);

  // Toggle file selection
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  // Get selected files
  const selectedFiles = useMemo(() => {
    return importedFiles.filter(f => selectedFileIds.has(f.id));
  }, [importedFiles, selectedFileIds]);

  // Get all lines from selected files
  const selectedLines = useMemo(() => {
    return selectedFiles.flatMap(f => f.lines);
  }, [selectedFiles]);

  const handleSelectCutting = useCallback(() => {
    setStep('reference');
  }, []);

  const resetState = useCallback(() => {
    setStep('choice');
    setDebitReference('');
    setIsDragging(false);
    resetLocalImport();
    // Don't clear pre-import here, only on close
  }, [resetLocalImport]);

  const handleConfirmCutting = useCallback(() => {
    if (!product) return;

    // Multi-file mode: assign panel to selected files (no navigation)
    if (importedFiles.length > 0 && selectedFiles.length > 0) {
      // Assign panel to the selected files
      const assignedIds = selectedFiles.map(f => f.id);
      onAssignPanelToFiles?.(assignedIds, product);

      // Close popup and reset
      onClose();
      resetState();
      return;
    }

    // Legacy single-file mode (no multi-file imports)
    if (effectiveLines.length > 0) {
      if (preImportedLines.length > 0 && localImportedLines.length === 0) {
        sessionStorage.setItem('cutx_homepage_import', JSON.stringify(preImportedLines));
      } else {
        saveToSession();
      }
    } else {
      clearSession();
    }

    const params = new URLSearchParams({ panel: product.reference });
    if (debitReference.trim()) {
      params.set('ref', debitReference.trim());
    }
    if (effectiveLines.length > 0) {
      params.set('import', 'session');
    }

    router.push(`/configurateur?${params.toString()}`);
    onClose();
    onClearPreImport?.();
    resetState();
  }, [product, debitReference, importedFiles, selectedFiles, effectiveLines, preImportedLines, localImportedLines, router, onClose, resetState, saveToSession, clearSession, onClearPreImport, onAssignPanelToFiles]);

  const handleCancel = useCallback(() => resetState(), [resetState]);
  const handleClose = useCallback(() => { onClose(); resetState(); }, [onClose, resetState]);

  const handleFileSelect = useCallback(async (file: File) => {
    console.log('[PanelActionPopup] handleFileSelect called with:', file.name);
    const foundRef = await processFile(file);
    console.log('[PanelActionPopup] processFile returned:', foundRef);
    if (foundRef && !debitReference) {
      setDebitReference(foundRef);
    }
    if (step === 'choice') {
      setStep('reference');
    }
  }, [processFile, debitReference, step]);

  // Handle drag over the entire popup - auto-expand to reference step
  const handlePopupDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Auto-expand when dragging a file over the popup
    if (step === 'choice') {
      setStep('reference');
    }
    setIsDragging(true);
  }, [step]);

  const handlePopupDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if leaving the popup entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handlePopupDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    console.log('[PanelActionPopup] Drop on popup - files:', files.length, files[0]?.name);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  if (!open || !product) return null;

  const { nom, reference, refFabricant, imageUrl, epaisseur, prixAchatM2, prixMl } = product;
  const price = prixAchatM2 || prixMl;
  const priceUnit = prixAchatM2 ? 'm²' : 'ml';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={handleClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full ${hasMultipleFiles ? 'max-w-md' : 'max-w-sm'} bg-[#1c1b1a] border rounded-lg shadow-xl pointer-events-auto transition-colors ${
            isDragging ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-neutral-700'
          }`}
          onClick={(e) => e.stopPropagation()}
          onDragOver={handlePopupDragOver}
          onDragLeave={handlePopupDragLeave}
          onDrop={handlePopupDrop}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-neutral-700">
            <div className="flex gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0 w-16 h-16 bg-neutral-800 rounded overflow-hidden">
                {imageUrl ? (
                  <Image src={imageUrl} alt={nom} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImageIcon className="w-6 h-6 text-neutral-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white truncate">{nom}</h3>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">{refFabricant || reference}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  {epaisseur && <span className="text-neutral-400">{epaisseur}mm</span>}
                  {price && <span className="text-amber-500 font-medium">{price.toFixed(2)} €/{priceUnit}</span>}
                </div>
              </div>
            </div>
            <button onClick={handleClose} className="p-1 text-neutral-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Options */}
          <div className="p-4 space-y-2">
            <button
              disabled
              className="flex items-center gap-3 w-full p-3 bg-neutral-800/50 border border-neutral-700 rounded text-left opacity-50 cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4 text-neutral-500" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-400">{t('actions.orderPanels')}</span>
                <span className="text-[10px] text-neutral-600 bg-neutral-800 px-1.5 py-0.5 rounded">
                  {t('actions.comingSoon')}
                </span>
              </div>
            </button>

            <button
              onClick={handleSelectCutting}
              disabled={step === 'reference'}
              className={`flex items-center gap-3 w-full p-3 rounded text-left transition-colors ${
                step === 'reference'
                  ? 'bg-amber-500/20 border border-amber-500/40'
                  : 'bg-amber-500 hover:bg-amber-400'
              }`}
            >
              <Scissors className={`w-4 h-4 ${step === 'reference' ? 'text-amber-500' : 'text-black'}`} />
              <span className={`text-sm font-medium ${step === 'reference' ? 'text-amber-500' : 'text-black'}`}>
                {t('actions.orderWithCutting')}
              </span>
            </button>
          </div>

          {/* Expanded section */}
          {step === 'reference' && (
            <div className="px-4 pb-4 border-t border-neutral-700 pt-4 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-2">
                  {t('actions.referenceTitle')} <span className="text-neutral-600">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={debitReference}
                  onChange={(e) => setDebitReference(e.target.value)}
                  placeholder={t('actions.referencePlaceholder')}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50"
                  autoFocus
                />
              </div>

              {/* Multi-file selection */}
              {hasMultipleFiles && (
                <div className="space-y-2">
                  <label className="block text-xs text-neutral-400">
                    Affecter ce panneau à :
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {importedFiles.map((file) => {
                      const isSelected = selectedFileIds.has(file.id);
                      const isDxf = file.name.toLowerCase().endsWith('.dxf');
                      const FileIconComponent = isDxf ? FileCode : FileSpreadsheet;
                      const iconColor = isDxf ? 'text-blue-400' : 'text-green-400';

                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => toggleFileSelection(file.id)}
                          className={`flex items-center gap-3 w-full p-2.5 rounded-lg border transition-all text-left ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/40'
                              : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500'
                              : 'border-neutral-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-black" />}
                          </div>

                          {/* File icon */}
                          <FileIconComponent className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />

                          {/* File info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{file.name}</div>
                            <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                              <Package className="w-3 h-3" />
                              <span>{file.lines.length} pièce{file.lines.length > 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>{file.primaryThickness}mm</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="text-xs text-amber-500/80 pt-1">
                      {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''} sélectionné{selectedFiles.length > 1 ? 's' : ''} • {selectedLines.length} pièce{selectedLines.length > 1 ? 's' : ''} au total
                    </div>
                  )}
                </div>
              )}

              {/* Single file mode - show drop zone */}
              {!hasMultipleFiles && (
                <FileDropZone
                  onFileSelect={handleFileSelect}
                  isImporting={isImporting}
                  importedFile={effectiveFile}
                  importError={effectiveError}
                  isDragging={isDragging}
                  onDragStateChange={setIsDragging}
                />
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded text-sm hover:bg-neutral-700 hover:text-white transition-colors"
                >
                  {t('actions.cancel')}
                </button>
                <button
                  onClick={handleConfirmCutting}
                  disabled={isImporting || (hasMultipleFiles && selectedFiles.length === 0)}
                  className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasMultipleFiles ? 'Affecter le panneau' : t('actions.configureCutting')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
