// Détecteur automatique de format Excel pour l'import
import * as XLSX from 'xlsx';
import type { FormatExcel, ResultatImport } from './types';
import { IDEABOIS_COLUMNS } from './types';
import { parseBouneyExcel } from './bouney-parser';
import { parseIdeaBoisExcel } from './ideabois-parser';
import { parseDebitExcel } from './debit-parser';

/**
 * Récupère la valeur d'une cellule Excel
 */
function getCellValue(sheet: XLSX.WorkSheet, cellAddress: string): string | number | null {
  const cell = sheet[cellAddress];
  if (!cell) return null;
  return cell.v;
}

/**
 * Détecte le format d'un fichier Excel en analysant son contenu
 */
export function detecterFormatExcel(workbook: XLSX.WorkBook): FormatExcel {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return 'inconnu';
  }

  // Vérifier si c'est un format DEBIT
  // Marqueur: première ligne contient les colonnes MATIERE, LONGUEUR, LARGEUR, DESIGNATION
  const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })[0] as any[];
  if (headerRow && Array.isArray(headerRow)) {
    const headerStr = headerRow.map(h => String(h).toLowerCase()).join(' ');
    const hasDebitColumns =
      headerStr.includes('matiere') &&
      headerStr.includes('longueur') &&
      headerStr.includes('largeur') &&
      headerStr.includes('designation');

    if (hasDebitColumns) {
      return 'debit';
    }
  }

  // Vérifier si c'est un format IDEA BOIS
  // Marqueur: cellule H1 contient "FICHE DE DEBIT PANNEAUX"
  const titreIdeaBois = getCellValue(sheet, IDEABOIS_COLUMNS.TITRE_FICHE);
  if (titreIdeaBois && String(titreIdeaBois).toUpperCase().includes('FICHE DE DEBIT')) {
    return 'ideabois';
  }

  // Vérifier si c'est un format Bouney
  // Marqueur: cellule AU11 existe (référence chantier Bouney)
  // ou présence de données en ligne 27+ avec colonnes O/T/Y
  const refBouney = getCellValue(sheet, 'AU11');
  const hasBouneyStructure = getCellValue(sheet, 'O27') !== null ||
                             getCellValue(sheet, 'T27') !== null;

  if (refBouney || hasBouneyStructure) {
    return 'bouney';
  }

  // Si aucun format reconnu, essayer de deviner par la structure
  // Vérifier la présence de données aux emplacements IDEA BOIS
  const hasIdeaBoisData = getCellValue(sheet, 'F18') !== null ||
                          getCellValue(sheet, 'I18') !== null;
  if (hasIdeaBoisData) {
    return 'ideabois';
  }

  return 'inconnu';
}

/**
 * Parse un fichier Excel en détectant automatiquement son format
 */
export function parseExcelAuto(file: File): Promise<ResultatImport> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({
            success: false,
            erreur: 'Impossible de lire le fichier',
            avertissements: [],
          });
          return;
        }

        // Lire le workbook pour détecter le format
        const workbook = XLSX.read(data, { type: 'binary' });
        const format = detecterFormatExcel(workbook);

        // Parser selon le format détecté
        switch (format) {
          case 'debit':
            resolve(await parseDebitExcel(file));
            break;
          case 'ideabois':
            resolve(await parseIdeaBoisExcel(file));
            break;
          case 'bouney':
            resolve(await parseBouneyExcel(file));
            break;
          default:
            // Essayer Bouney par défaut (format original)
            const result = await parseBouneyExcel(file);
            if (!result.success) {
              // Si Bouney échoue, essayer IDEA BOIS
              const resultIdeaBois = await parseIdeaBoisExcel(file);
              if (resultIdeaBois.success) {
                resolve(resultIdeaBois);
                return;
              }
            }
            resolve({
              ...result,
              avertissements: [
                'Format de fichier non reconnu automatiquement, tentative avec le parser Bouney',
                ...result.avertissements,
              ],
            });
        }
      } catch (error) {
        resolve({
          success: false,
          erreur: `Erreur lors de la détection du format: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          avertissements: [],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        erreur: 'Erreur lors de la lecture du fichier',
        avertissements: [],
      });
    };

    reader.readAsBinaryString(file);
  });
}
