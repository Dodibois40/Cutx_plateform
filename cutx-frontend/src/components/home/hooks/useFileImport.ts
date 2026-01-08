/**
 * Hook pour l'import de fichiers Excel/DXF depuis la homepage
 * Réutilise les parsers existants du configurateur
 */
import { useState, useCallback } from 'react';
import { parseExcelAuto, parseDxfFile } from '@/lib/configurateur/import';
import { creerNouvelleLigne } from '@/lib/configurateur/constants';
import { mettreAJourCalculsLigne } from '@/lib/configurateur/calculs';
import type { LignePrestationV3 } from '@/lib/configurateur/types';

// Session storage key for imported lines
export const IMPORT_STORAGE_KEY = 'cutx_homepage_import';

export interface ImportedFileInfo {
  name: string;
  linesCount: number;
}

export interface UseFileImportReturn {
  isImporting: boolean;
  importError: string | null;
  importedFile: ImportedFileInfo | null;
  importedLines: LignePrestationV3[];
  processFile: (file: File) => Promise<string | null>; // Returns reference if found
  resetImport: () => void;
  saveToSession: () => void;
  clearSession: () => void;
}

export function useFileImport(): UseFileImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedFile, setImportedFile] = useState<ImportedFileInfo | null>(null);
  const [importedLines, setImportedLines] = useState<LignePrestationV3[]>([]);

  const resetImport = useCallback(() => {
    setImportedFile(null);
    setImportedLines([]);
    setImportError(null);
  }, []);

  const processFile = useCallback(async (file: File): Promise<string | null> => {
    console.log('[useFileImport] processFile called with:', file.name);
    setIsImporting(true);
    setImportError(null);
    let foundReference: string | null = null;

    try {
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
            } else if (donnees.materiau) {
              nouvelleLigne.materiau = donnees.materiau;
            }

            lines.push(mettreAJourCalculsLigne(nouvelleLigne));
          }
        }

      } else if (extension === 'dxf') {
        console.log('[useFileImport] Parsing DXF file...');
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

      setImportedLines(lines);
      setImportedFile({ name: file.name, linesCount: lines.length });
      return foundReference;

    } catch (error) {
      console.error('[useFileImport] Error:', error);
      setImportError(error instanceof Error ? error.message : 'Erreur inconnue');
      setImportedFile(null);
      setImportedLines([]);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const saveToSession = useCallback(() => {
    if (importedLines.length > 0) {
      sessionStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(importedLines));
    }
  }, [importedLines]);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(IMPORT_STORAGE_KEY);
  }, []);

  return {
    isImporting,
    importError,
    importedFile,
    importedLines,
    processFile,
    resetImport,
    saveToSession,
    clearSession,
  };
}

/**
 * Lit les lignes importées depuis sessionStorage
 * À utiliser côté configurateur
 */
export function readImportedLinesFromSession(): LignePrestationV3[] | null {
  try {
    const data = sessionStorage.getItem(IMPORT_STORAGE_KEY);
    if (!data) return null;

    const lines = JSON.parse(data) as LignePrestationV3[];
    // Clear after reading
    sessionStorage.removeItem(IMPORT_STORAGE_KEY);
    return lines;
  } catch {
    return null;
  }
}
