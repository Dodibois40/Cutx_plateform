'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '@/i18n/routing';
import {
  X,
  FileSpreadsheet,
  FileCode,
  Trash2,
  AlertTriangle,
  Check,
  ChevronRight,
  Loader2,
  Layers,
  Search,
} from 'lucide-react';
import type { ImportedFileData, ThicknessBreakdown } from './hooks/useFileImport';
import type { SearchProduct } from './types';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import MiniPanelSearch from './MiniPanelSearch';

// === TYPES ===

interface PanelAssignment {
  panel: SearchProduct;
  files: string[]; // File IDs assigned to this panel
}

interface ThicknessGroup {
  thickness: number;
  files: ImportedFileData[];
  totalPieces: number;
  selectedPanel: SearchProduct | null;
}

// Final group config to send to configurateur
export interface GroupConfig {
  panel: SearchProduct;
  lines: LignePrestationV3[];
  sourceFileNames: string[];
}

export const MULTI_GROUP_CONFIG_KEY = 'cutx_multi_group_config';

// === PROPS ===

interface MultiFileImportWizardProps {
  open: boolean;
  importedFiles: ImportedFileData[];
  onClose: () => void;
  onRemoveFile: (fileId: string) => void;
  onReset: () => void;
}

// === HELPER FUNCTIONS ===

/**
 * Group files by their primary thickness
 */
function groupFilesByThickness(files: ImportedFileData[]): ThicknessGroup[] {
  const thicknessMap = new Map<number, ImportedFileData[]>();

  files.forEach(file => {
    // Only consider mono-thickness files for grouping
    if (!file.isMixedThickness) {
      const t = file.primaryThickness;
      if (!thicknessMap.has(t)) {
        thicknessMap.set(t, []);
      }
      thicknessMap.get(t)!.push(file);
    }
  });

  return Array.from(thicknessMap.entries())
    .map(([thickness, groupFiles]) => ({
      thickness,
      files: groupFiles,
      totalPieces: groupFiles.reduce((sum, f) => sum + f.lines.length, 0),
      selectedPanel: null,
    }))
    .sort((a, b) => b.totalPieces - a.totalPieces); // Most pieces first
}

/**
 * Get mixed-thickness files that need special handling
 */
function getMixedThicknessFiles(files: ImportedFileData[]): ImportedFileData[] {
  return files.filter(f => f.isMixedThickness);
}

// === COMPONENT ===

export default function MultiFileImportWizard({
  open,
  importedFiles,
  onClose,
  onRemoveFile,
  onReset,
}: MultiFileImportWizardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Panel assignments per thickness
  const [panelAssignments, setPanelAssignments] = useState<Map<number, SearchProduct>>(new Map());

  // Which thickness group is currently searching
  const [activeSearchThickness, setActiveSearchThickness] = useState<number | null>(null);

  // Mixed file handling: store decisions for each mixed file
  const [mixedFileDecisions, setMixedFileDecisions] = useState<Map<string, 'separate' | 'convert' | null>>(new Map());

  // Compute groups
  const thicknessGroups = useMemo(() => groupFilesByThickness(importedFiles), [importedFiles]);
  const mixedFiles = useMemo(() => getMixedThicknessFiles(importedFiles), [importedFiles]);

  // Total stats
  const totalFiles = importedFiles.length;
  const totalPieces = useMemo(
    () => importedFiles.reduce((sum, f) => sum + f.lines.length, 0),
    [importedFiles]
  );

  // Check if all groups have panels assigned
  const allGroupsAssigned = useMemo(() => {
    return thicknessGroups.every(g => panelAssignments.has(g.thickness));
  }, [thicknessGroups, panelAssignments]);

  // Check if all mixed files have decisions
  const allMixedResolved = useMemo(() => {
    return mixedFiles.every(f => mixedFileDecisions.get(f.id) !== null && mixedFileDecisions.get(f.id) !== undefined);
  }, [mixedFiles, mixedFileDecisions]);

  // Can proceed?
  const canProceed = allGroupsAssigned && (mixedFiles.length === 0 || allMixedResolved);

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset assignments when files change
  useEffect(() => {
    setPanelAssignments(new Map());
    setMixedFileDecisions(new Map());
    setActiveSearchThickness(null);
  }, [importedFiles.length]);

  // Handle panel selection for a thickness group
  const handlePanelSelect = useCallback((thickness: number, panel: SearchProduct) => {
    setPanelAssignments(prev => {
      const next = new Map(prev);
      next.set(thickness, panel);
      return next;
    });
    setActiveSearchThickness(null);
  }, []);

  // Clear panel for a thickness group
  const handleClearPanel = useCallback((thickness: number) => {
    setPanelAssignments(prev => {
      const next = new Map(prev);
      next.delete(thickness);
      return next;
    });
  }, []);

  // Handle mixed file decision
  const handleMixedDecision = useCallback((fileId: string, decision: 'separate' | 'convert') => {
    setMixedFileDecisions(prev => {
      const next = new Map(prev);
      next.set(fileId, decision);
      return next;
    });
  }, []);

  // Generate final config and navigate
  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);

    try {
      // Build group configs
      const groupConfigs: GroupConfig[] = [];
      const panelToConfig = new Map<string, GroupConfig>();

      // Process mono-thickness files grouped by panel
      thicknessGroups.forEach(group => {
        const panel = panelAssignments.get(group.thickness);
        if (!panel) return;

        const panelId = panel.id;
        if (!panelToConfig.has(panelId)) {
          panelToConfig.set(panelId, {
            panel,
            lines: [],
            sourceFileNames: [],
          });
        }

        const config = panelToConfig.get(panelId)!;
        group.files.forEach(file => {
          config.lines.push(...file.lines);
          config.sourceFileNames.push(file.name);
        });
      });

      // Process mixed files based on decisions
      mixedFiles.forEach(file => {
        const decision = mixedFileDecisions.get(file.id);
        if (!decision) return;

        if (decision === 'separate') {
          // Create separate entries for each thickness
          file.thicknessBreakdown.forEach(tb => {
            const panel = panelAssignments.get(tb.thickness);
            if (!panel) return;

            const panelId = panel.id;
            if (!panelToConfig.has(panelId)) {
              panelToConfig.set(panelId, {
                panel,
                lines: [],
                sourceFileNames: [],
              });
            }

            const config = panelToConfig.get(panelId)!;
            config.lines.push(...tb.lines);
            if (!config.sourceFileNames.includes(file.name)) {
              config.sourceFileNames.push(file.name);
            }
          });
        } else if (decision === 'convert') {
          // Use the primary (most common) thickness panel for all lines
          const panel = panelAssignments.get(file.primaryThickness);
          if (!panel) return;

          const panelId = panel.id;
          if (!panelToConfig.has(panelId)) {
            panelToConfig.set(panelId, {
              panel,
              lines: [],
              sourceFileNames: [],
            });
          }

          const config = panelToConfig.get(panelId)!;
          // Add all lines (thickness will be overridden by panel)
          config.lines.push(...file.lines);
          if (!config.sourceFileNames.includes(file.name)) {
            config.sourceFileNames.push(file.name);
          }
        }
      });

      // Convert map to array
      groupConfigs.push(...panelToConfig.values());

      // Save to session storage
      sessionStorage.setItem(MULTI_GROUP_CONFIG_KEY, JSON.stringify(groupConfigs));

      // Navigate to configurateur
      router.push('/configurateur?import=multi');
      onClose();
      onReset();
    } catch (error) {
      console.error('[MultiFileImportWizard] Error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [thicknessGroups, mixedFiles, panelAssignments, mixedFileDecisions, router, onClose, onReset]);

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#1c1b1a] border border-neutral-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700 bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Layers className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Analyse des fichiers</h2>
              <p className="text-xs text-neutral-400">
                {totalFiles} fichier{totalFiles > 1 ? 's' : ''} &bull; {totalPieces} pièce{totalPieces > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Thickness Groups */}
          {thicknessGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                <span>Groupes par épaisseur</span>
                <span className="text-xs text-neutral-500">({thicknessGroups.length})</span>
              </h3>

              {thicknessGroups.map((group) => {
                const assignedPanel = panelAssignments.get(group.thickness);
                const isSearching = activeSearchThickness === group.thickness;

                return (
                  <div
                    key={group.thickness}
                    className={`border rounded-lg overflow-hidden transition-colors ${
                      assignedPanel
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-neutral-700 bg-neutral-800/30'
                    }`}
                  >
                    {/* Group header */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          assignedPanel
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {group.thickness}mm
                        </div>
                        <div>
                          <div className="text-sm text-white font-medium">
                            {group.files.length} fichier{group.files.length > 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-neutral-400">
                            {group.totalPieces} pièce{group.totalPieces > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {assignedPanel ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-500 font-medium max-w-[150px] truncate">
                              {assignedPanel.nom}
                            </span>
                          </div>
                          <button
                            onClick={() => handleClearPanel(group.thickness)}
                            className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Changer de panneau"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveSearchThickness(isSearching ? null : group.thickness)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isSearching
                              ? 'bg-amber-500 text-black'
                              : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                          }`}
                        >
                          <Search className="w-4 h-4" />
                          <span>Choisir panneau</span>
                        </button>
                      )}
                    </div>

                    {/* File list */}
                    <div className="px-4 pb-3">
                      <div className="flex flex-wrap gap-2">
                        {group.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-2 px-2 py-1 bg-neutral-800 rounded text-xs"
                          >
                            {file.name.toLowerCase().endsWith('.dxf') ? (
                              <FileCode className="w-3 h-3 text-blue-400" />
                            ) : (
                              <FileSpreadsheet className="w-3 h-3 text-green-400" />
                            )}
                            <span className="text-neutral-300 max-w-[120px] truncate">{file.name}</span>
                            <span className="text-neutral-500">({file.lines.length})</span>
                            <button
                              onClick={() => onRemoveFile(file.id)}
                              className="text-neutral-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mini panel search */}
                    {isSearching && (
                      <div className="p-4 border-t border-neutral-700 bg-neutral-900/50">
                        <MiniPanelSearch
                          thickness={group.thickness}
                          onSelect={(panel) => handlePanelSelect(group.thickness, panel)}
                          existingPanels={Array.from(panelAssignments.values())}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Mixed Thickness Files */}
          {mixedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-amber-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Fichiers avec plusieurs épaisseurs</span>
              </h3>

              {mixedFiles.map((file) => {
                const decision = mixedFileDecisions.get(file.id);

                return (
                  <div
                    key={file.id}
                    className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {file.name.toLowerCase().endsWith('.dxf') ? (
                          <FileCode className="w-4 h-4 text-blue-400" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-green-400" />
                        )}
                        <span className="text-sm text-white font-medium">{file.name}</span>
                        <span className="text-xs text-neutral-400">({file.lines.length} pièces)</span>
                      </div>
                      <button
                        onClick={() => onRemoveFile(file.id)}
                        className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-amber-400 mb-2">
                        Ce fichier contient plusieurs épaisseurs :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {file.thicknessBreakdown.map((tb) => (
                          <span
                            key={tb.thickness}
                            className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400"
                          >
                            {tb.thickness}mm ({tb.count} pièces)
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMixedDecision(file.id, 'separate')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          decision === 'separate'
                            ? 'bg-amber-500 text-black'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        Séparer par épaisseur
                      </button>
                      <button
                        onClick={() => handleMixedDecision(file.id, 'convert')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          decision === 'convert'
                            ? 'bg-amber-500 text-black'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        Tout en {file.primaryThickness}mm
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-700 bg-neutral-900/50">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Tout annuler
          </button>

          <button
            onClick={handleConfirm}
            disabled={!canProceed || isProcessing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              canProceed && !isProcessing
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Préparation...</span>
              </>
            ) : (
              <>
                <span>Configurer la découpe</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
