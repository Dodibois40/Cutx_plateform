/**
 * Hook pour l'import de fichiers Excel/DXF depuis la homepage
 * Supporte l'import de plusieurs fichiers avec analyse intelligente des épaisseurs
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseExcelAuto, parseDxfFile } from '@/lib/configurateur/import';
import { creerNouvelleLigne } from '@/lib/configurateur/constants';
import { mettreAJourCalculsLigne } from '@/lib/configurateur/calculs';
import type { LignePrestationV3 } from '@/lib/configurateur/types';
import type { SearchProduct } from '../types';

// Session storage keys
export const IMPORT_STORAGE_KEY = 'cutx_homepage_import'; // Legacy single file
export const MULTI_IMPORT_STORAGE_KEY = 'cutx_multi_import'; // New multi-file

// File size limits
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const WARN_FILE_SIZE_MB = 10;
const WARN_FILE_SIZE_BYTES = WARN_FILE_SIZE_MB * 1024 * 1024;

// === TYPES ===

// Legacy single file info (for backward compat)
export interface ImportedFileInfo {
  name: string;
  linesCount: number;
}

// Breakdown of lines by thickness
export interface ThicknessBreakdown {
  thickness: number;
  count: number;
  lines: LignePrestationV3[];
}

// Detected file format
export type DetectedFormat = 'bouney' | 'ideabois' | 'debit' | 'dxf' | 'inconnu';

// Detection summary for display
export interface DetectionSummary {
  format: DetectedFormat;
  formatLabel: string; // Human-readable label
  columnsDetected: string[]; // e.g., ['Longueur', 'Largeur', 'Quantité', 'Chants']
  hasEdgeBanding: boolean;
  edgeBandingCount: number; // Number of pieces with at least one edge
  hasMaterial: boolean;
  materialHint: string | null; // Detected material name
  uniqueDimensions: number; // Number of unique L×l combinations
  totalQuantity: number; // Sum of all quantities
}

// Multi-file data structure with thickness analysis
export interface ImportedFileData {
  id: string;
  name: string;
  lines: LignePrestationV3[];
  foundReference: string | null;
  // Thickness analysis
  thicknessBreakdown: ThicknessBreakdown[];
  primaryThickness: number; // Most frequent thickness
  isMixedThickness: boolean; // True if multiple thicknesses
  // Detection info
  detection: DetectionSummary;
  // Assigned panel (set when user assigns a panel to this file)
  assignedPanel?: SearchProduct;
}

export interface UseFileImportReturn {
  isImporting: boolean;
  importError: string | null;
  // Multi-file support
  importedFiles: ImportedFileData[];
  totalLines: number;
  totalFiles: number;
  hasMixedThicknessFiles: boolean;
  // Files with/without assigned panels
  filesWithPanel: ImportedFileData[];
  filesWithoutPanel: ImportedFileData[];
  allFilesHavePanel: boolean;
  someFilesHavePanel: boolean;
  // Legacy single file (backward compat with existing UI)
  importedFile: ImportedFileInfo | null;
  importedLines: LignePrestationV3[];
  // Actions
  processFile: (file: File) => Promise<string | null>;
  removeFile: (fileId: string) => void;
  removeFiles: (fileIds: string[]) => void;
  assignPanelToFile: (fileId: string, panel: SearchProduct) => void;
  assignPanelToFiles: (fileIds: string[], panel: SearchProduct) => void;
  unassignPanel: (fileId: string) => void;
  resetImport: () => void;
  saveToSession: () => void;
  saveMultiToSession: () => void;
  clearSession: () => void;
}

// === HELPER FUNCTIONS ===

/**
 * Get human-readable format label
 */
function getFormatLabel(format: DetectedFormat): string {
  switch (format) {
    case 'bouney': return 'Bouney';
    case 'ideabois': return 'IDEA Bois';
    case 'debit': return 'Feuille de débit';
    case 'dxf': return 'DXF (CAO)';
    default: return 'Format inconnu';
  }
}

/**
 * Analyze lines to build detection summary
 */
function analyzeDetection(
  lines: LignePrestationV3[],
  format: DetectedFormat,
  materialHint: string | null
): DetectionSummary {
  // Count pieces with edge banding
  let edgeBandingCount = 0;
  const dimensionsSet = new Set<string>();

  for (const line of lines) {
    // Check if has any edge banding
    const chants = line.chants || {};
    const hasChant = chants.A || chants.B || chants.C || chants.D;
    if (hasChant) edgeBandingCount++;

    // Track unique dimensions
    if (line.dimensions?.longueur && line.dimensions?.largeur) {
      dimensionsSet.add(`${line.dimensions.longueur}×${line.dimensions.largeur}`);
    }
  }

  // Determine what columns were detected
  const columnsDetected: string[] = ['Dimensions'];
  if (lines.some(l => l.reference)) columnsDetected.push('Référence');
  if (edgeBandingCount > 0) columnsDetected.push('Chants');
  if (materialHint) columnsDetected.push('Matériau');

  return {
    format,
    formatLabel: getFormatLabel(format),
    columnsDetected,
    hasEdgeBanding: edgeBandingCount > 0,
    edgeBandingCount,
    hasMaterial: !!materialHint,
    materialHint,
    uniqueDimensions: dimensionsSet.size,
    totalQuantity: lines.length,
  };
}

/**
 * Analyze thickness distribution in a set of lines
 */
function analyzeThicknesses(lines: LignePrestationV3[]): {
  thicknessBreakdown: ThicknessBreakdown[];
  primaryThickness: number;
  isMixedThickness: boolean;
} {
  const thicknessMap = new Map<number, LignePrestationV3[]>();

  lines.forEach(line => {
    const thickness = line.dimensions?.epaisseur || 0;
    if (!thicknessMap.has(thickness)) {
      thicknessMap.set(thickness, []);
    }
    thicknessMap.get(thickness)!.push(line);
  });

  const breakdown = Array.from(thicknessMap.entries())
    .map(([thickness, lineList]) => ({
      thickness,
      count: lineList.length,
      lines: lineList,
    }))
    .sort((a, b) => b.count - a.count); // Sort by frequency (most common first)

  return {
    thicknessBreakdown: breakdown,
    primaryThickness: breakdown[0]?.thickness || 0,
    isMixedThickness: breakdown.length > 1,
  };
}

// === HOOK ===

// Key for persisting remaining files across navigation
const PENDING_FILES_KEY = 'cutx_pending_import_files';

export function useFileImport(): UseFileImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedFiles, setImportedFiles] = useState<ImportedFileData[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore from sessionStorage ONLY after hydration (client-side only)
  useEffect(() => {
    setIsHydrated(true);
    try {
      const stored = sessionStorage.getItem(PENDING_FILES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ImportedFileData[];
        console.log('[useFileImport] Restored', parsed.length, 'files from sessionStorage');
        setImportedFiles(parsed);
      }
    } catch (e) {
      console.error('[useFileImport] Error restoring files:', e);
    }
  }, []);

  // Persist to sessionStorage whenever importedFiles changes (only after hydration)
  useEffect(() => {
    if (!isHydrated) return; // Skip during SSR/initial render
    if (importedFiles.length > 0) {
      sessionStorage.setItem(PENDING_FILES_KEY, JSON.stringify(importedFiles));
      console.log('[useFileImport] Saved', importedFiles.length, 'files to sessionStorage');
    } else {
      sessionStorage.removeItem(PENDING_FILES_KEY);
    }
  }, [importedFiles, isHydrated]);

  // Computed values
  const totalLines = useMemo(
    () => importedFiles.reduce((sum, f) => sum + f.lines.length, 0),
    [importedFiles]
  );

  const totalFiles = importedFiles.length;

  const hasMixedThicknessFiles = useMemo(
    () => importedFiles.some(f => f.isMixedThickness),
    [importedFiles]
  );

  // Files with/without assigned panels
  const filesWithPanel = useMemo(
    () => importedFiles.filter(f => f.assignedPanel),
    [importedFiles]
  );

  const filesWithoutPanel = useMemo(
    () => importedFiles.filter(f => !f.assignedPanel),
    [importedFiles]
  );

  const allFilesHavePanel = importedFiles.length > 0 && filesWithoutPanel.length === 0;
  const someFilesHavePanel = filesWithPanel.length > 0;

  // Legacy compatibility: expose first file as single file
  const importedFile = useMemo<ImportedFileInfo | null>(() => {
    if (importedFiles.length === 0) return null;
    return {
      name: importedFiles.length === 1
        ? importedFiles[0].name
        : `${importedFiles.length} fichiers`,
      linesCount: totalLines,
    };
  }, [importedFiles, totalLines]);

  const importedLines = useMemo<LignePrestationV3[]>(
    () => importedFiles.flatMap(f => f.lines),
    [importedFiles]
  );

  // Reset all imports
  const resetImport = useCallback(() => {
    setImportedFiles([]);
    setImportError(null);
  }, []);

  // Remove a specific file
  const removeFile = useCallback((fileId: string) => {
    setImportedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Remove multiple files at once
  const removeFiles = useCallback((fileIds: string[]) => {
    const idsSet = new Set(fileIds);
    setImportedFiles(prev => prev.filter(f => !idsSet.has(f.id)));
  }, []);

  // Assign a panel to a specific file
  const assignPanelToFile = useCallback((fileId: string, panel: SearchProduct) => {
    setImportedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, assignedPanel: panel } : f
    ));
    console.log('[useFileImport] Assigned panel to file:', fileId, panel.nom);
  }, []);

  // Assign a panel to multiple files
  const assignPanelToFiles = useCallback((fileIds: string[], panel: SearchProduct) => {
    const idsSet = new Set(fileIds);
    setImportedFiles(prev => prev.map(f =>
      idsSet.has(f.id) ? { ...f, assignedPanel: panel } : f
    ));
    console.log('[useFileImport] Assigned panel to', fileIds.length, 'files:', panel.nom);
  }, []);

  // Remove panel assignment from a file
  const unassignPanel = useCallback((fileId: string) => {
    setImportedFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, assignedPanel: undefined } : f
    ));
    console.log('[useFileImport] Unassigned panel from file:', fileId);
  }, []);

  // Process and add a file
  const processFile = useCallback(async (file: File): Promise<string | null> => {
    console.log('[useFileImport] processFile called with:', file.name, 'size:', file.size);
    setIsImporting(true);
    setImportError(null);
    let foundReference: string | null = null;
    let detectedFormat: DetectedFormat = 'inconnu';
    let materialHint: string | null = null;

    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: ${MAX_FILE_SIZE_MB} MB`);
      }

      if (file.size > WARN_FILE_SIZE_BYTES) {
        console.warn(`[useFileImport] Large file: ${(file.size / 1024 / 1024).toFixed(1)} MB - processing may be slow`);
      }

      // Check for duplicate file name
      const existingFile = importedFiles.find(f => f.name === file.name);
      if (existingFile) {
        throw new Error(`Le fichier "${file.name}" est déjà importé`);
      }

      const extension = file.name.split('.').pop()?.toLowerCase();
      console.log('[useFileImport] Extension detected:', extension);
      const lines: LignePrestationV3[] = [];

      if (extension === 'xlsx' || extension === 'xls') {
        const result = await parseExcelAuto(file);
        if (!result.success || !result.donnees) {
          throw new Error(result.erreur || 'Erreur lors de l\'import Excel');
        }

        const { donnees } = result;
        foundReference = donnees.referenceChantier || null;

        // Detect format from file name patterns or content
        const fileName = file.name.toLowerCase();
        if (fileName.includes('bouney')) {
          detectedFormat = 'bouney';
        } else if (fileName.includes('idea') || fileName.includes('fiche')) {
          detectedFormat = 'ideabois';
        } else if (fileName.includes('debit')) {
          detectedFormat = 'debit';
        } else {
          // Default to debit if we got data
          detectedFormat = 'debit';
        }

        // Extract material hint (Materiau is a string type)
        if (donnees.materiau) {
          materialHint = donnees.materiau;
        }

        for (const ligneImport of donnees.lignes) {
          for (let i = 1; i <= ligneImport.quantite; i++) {
            const suffixe = ligneImport.quantite > 1 ? ` (${i}/${ligneImport.quantite})` : '';
            const nouvelleLigne = creerNouvelleLigne();

            nouvelleLigne.reference = `${ligneImport.reference}${suffixe}`;
            nouvelleLigne.dimensions = {
              longueur: ligneImport.longueur,
              largeur: ligneImport.largeur,
              epaisseur: donnees.epaisseur || 19,
            };
            nouvelleLigne.chants = { ...ligneImport.chants };

            if (ligneImport.materiau) {
              nouvelleLigne.materiau = ligneImport.materiau;
              if (!materialHint) materialHint = ligneImport.materiau;
            } else if (donnees.materiau) {
              nouvelleLigne.materiau = donnees.materiau;
            }

            lines.push(mettreAJourCalculsLigne(nouvelleLigne));
          }
        }

      } else if (extension === 'dxf') {
        console.log('[useFileImport] Parsing DXF file...');
        detectedFormat = 'dxf';
        const result = await parseDxfFile(file);
        console.log('[useFileImport] DXF result:', result.success, result.erreur, result.donnees?.panels?.length);
        if (!result.success || !result.donnees) {
          throw new Error(result.erreur || 'Erreur lors de l\'import DXF');
        }

        const { donnees } = result;
        foundReference = donnees.projet || null;
        console.log('[useFileImport] DXF panels count:', donnees.panels.length);

        for (const panel of donnees.panels) {
          for (let i = 1; i <= panel.quantite; i++) {
            const suffixe = panel.quantite > 1 ? ` (${i}/${panel.quantite})` : '';
            const nouvelleLigne = creerNouvelleLigne();

            nouvelleLigne.reference = `${panel.reference}${suffixe}`;
            nouvelleLigne.forme = 'rectangle';
            nouvelleLigne.dimensions = {
              longueur: panel.dimensions.longueur,
              largeur: panel.dimensions.largeur,
              epaisseur: panel.dimensions.epaisseur || 19,
            };
            nouvelleLigne.chantsConfig = {
              type: 'rectangle',
              edges: { A: false, B: false, C: false, D: false },
            };

            lines.push(mettreAJourCalculsLigne(nouvelleLigne));
          }
        }

      } else {
        throw new Error('Format non supporté. Utilisez .xlsx, .xls ou .dxf');
      }

      console.log('[useFileImport] Import success! Lines:', lines.length);

      if (lines.length === 0) {
        throw new Error('Aucune pièce trouvée dans le fichier. Vérifiez le format.');
      }

      // Analyze thicknesses
      const thicknessAnalysis = analyzeThicknesses(lines);
      console.log('[useFileImport] Thickness analysis:', {
        primary: thicknessAnalysis.primaryThickness,
        mixed: thicknessAnalysis.isMixedThickness,
        breakdown: thicknessAnalysis.thicknessBreakdown.map(t => `${t.thickness}mm: ${t.count}`),
      });

      // Analyze detection
      const detection = analyzeDetection(lines, detectedFormat, materialHint);
      console.log('[useFileImport] Detection:', detection);

      // Create file data with analysis
      const fileData: ImportedFileData = {
        id: crypto.randomUUID(),
        name: file.name,
        lines,
        foundReference,
        ...thicknessAnalysis,
        detection,
      };

      // Add to list (append, don't replace)
      setImportedFiles(prev => [...prev, fileData]);

      return foundReference;

    } catch (error) {
      console.error('[useFileImport] Error:', error);
      setImportError(error instanceof Error ? error.message : 'Erreur inconnue');
      return null;
    } finally {
      setIsImporting(false);
    }
  }, [importedFiles]);

  // Legacy: Save all lines to session (single file format)
  const saveToSession = useCallback(() => {
    if (importedLines.length > 0) {
      sessionStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(importedLines));
    }
  }, [importedLines]);

  // New: Save multi-file data to session
  const saveMultiToSession = useCallback(() => {
    if (importedFiles.length > 0) {
      sessionStorage.setItem(MULTI_IMPORT_STORAGE_KEY, JSON.stringify(importedFiles));
    }
  }, [importedFiles]);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(IMPORT_STORAGE_KEY);
    sessionStorage.removeItem(MULTI_IMPORT_STORAGE_KEY);
  }, []);

  return {
    isImporting,
    importError,
    // Multi-file
    importedFiles,
    totalLines,
    totalFiles,
    hasMixedThicknessFiles,
    // Files with/without panels
    filesWithPanel,
    filesWithoutPanel,
    allFilesHavePanel,
    someFilesHavePanel,
    // Legacy compat
    importedFile,
    importedLines,
    // Actions
    processFile,
    removeFile,
    removeFiles,
    assignPanelToFile,
    assignPanelToFiles,
    unassignPanel,
    resetImport,
    saveToSession,
    saveMultiToSession,
    clearSession,
  };
}

// === UTILITY FUNCTIONS FOR READING IMPORTED DATA ===

/**
 * Read imported lines from sessionStorage (legacy single-file format)
 */
export function readImportedLinesFromSession(): LignePrestationV3[] | null {
  try {
    const data = sessionStorage.getItem(IMPORT_STORAGE_KEY);
    if (!data) return null;

    const lines = JSON.parse(data) as LignePrestationV3[];
    sessionStorage.removeItem(IMPORT_STORAGE_KEY);
    return lines;
  } catch {
    return null;
  }
}

/**
 * Read multi-file import data from sessionStorage
 */
export function readMultiImportFromSession(): ImportedFileData[] | null {
  try {
    const data = sessionStorage.getItem(MULTI_IMPORT_STORAGE_KEY);
    if (!data) return null;

    const files = JSON.parse(data) as ImportedFileData[];
    sessionStorage.removeItem(MULTI_IMPORT_STORAGE_KEY);
    return files;
  } catch {
    return null;
  }
}
