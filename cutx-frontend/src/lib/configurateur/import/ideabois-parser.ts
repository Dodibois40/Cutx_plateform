// Parser spécifique pour les fichiers Excel IDEA BOIS (Fiche de débit panneaux)
import * as XLSX from 'xlsx';
import type { Materiau } from '../types';
import type { DonneesImportees, LigneImportee, ResultatImport } from './types';
import { IDEABOIS_COLUMNS } from './types';

/**
 * Mapping des mots-clés vers les types de matériaux du configurateur
 */
const MATERIAU_KEYWORDS: { keywords: string[]; value: Materiau }[] = [
  { keywords: ['mdf', 'medium'], value: 'mdf' },
  { keywords: ['plaqué', 'plaque', 'stratifié', 'strat'], value: 'plaque_bois' },
  { keywords: ['agglo', 'aggloméré'], value: 'plaque_bois' },
  { keywords: ['massif', 'chêne', 'hêtre', 'noyer', 'frêne'], value: 'bois_massif' },
  { keywords: ['mélaminé', 'melamine', 'méla', 'mela', 'egger', 'kronospan'], value: 'melamine' },
];

/**
 * Parse la cellule matériau pour extraire le type
 * Exemples: "Agglo chêne", "MDF", "Mélaminé blanc"
 */
function parseMateriau(value: string | number | null): Materiau | null {
  if (value === null || value === undefined) {
    return null;
  }

  const str = String(value).toLowerCase().trim();

  for (const mapping of MATERIAU_KEYWORDS) {
    if (mapping.keywords.some(kw => str.includes(kw))) {
      return mapping.value;
    }
  }

  return null;
}

/**
 * Parse la cellule épaisseur pour extraire le nombre
 * Exemples: "Epaisseur : 19", "19mm", "19"
 */
function parseEpaisseur(value: string | number | null): number {
  if (value === null || value === undefined) {
    return 19; // Valeur par défaut
  }

  if (typeof value === 'number') {
    return value;
  }

  const str = String(value);
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 19;
}

/**
 * Parse la cellule référence chantier
 * Format: "Observation / référence chantier  : Marche dressing escalier"
 */
function parseReferenceChantier(value: string | number | null): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value).trim();
  // Chercher après le ":" s'il y en a un
  const colonIndex = str.indexOf(':');
  if (colonIndex !== -1) {
    return str.substring(colonIndex + 1).trim();
  }
  return str;
}

/**
 * Récupère la valeur d'une cellule Excel
 */
function getCellValue(sheet: XLSX.WorkSheet, cellAddress: string): string | number | null {
  const cell = sheet[cellAddress];
  if (!cell) return null;
  return cell.v;
}

/**
 * Récupère la valeur d'une cellule par ligne et colonne
 */
function getCellByRowCol(
  sheet: XLSX.WorkSheet,
  col: string,
  row: number
): string | number | null {
  const cellAddress = `${col}${row}`;
  return getCellValue(sheet, cellAddress);
}

/**
 * Vérifie si une valeur représente un chant coché (x, X, ou toute valeur truthy)
 */
function isChantCoche(value: string | number | null): boolean {
  if (value === null || value === undefined) return false;
  const strValue = String(value).trim().toLowerCase();
  return strValue === 'x' || strValue === '1' || strValue === 'oui' || strValue === 'o';
}

/**
 * Vérifie si un chant est coché en testant plusieurs colonnes possibles
 */
function checkChantInColumns(
  sheet: XLSX.WorkSheet,
  columns: readonly string[],
  row: number
): boolean {
  for (const col of columns) {
    if (isChantCoche(getCellByRowCol(sheet, col, row))) {
      return true;
    }
  }
  return false;
}

/**
 * Parse un nombre depuis une valeur Excel (gère les formats français avec virgule)
 */
function parseNumber(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Remplacer virgule par point pour les décimaux français
  const cleaned = String(value).replace(',', '.').replace(/\s/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse un fichier Excel IDEA BOIS et extrait les données
 */
export function parseIdeaBoisExcel(file: File): Promise<ResultatImport> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
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

        // Lire le workbook
        const workbook = XLSX.read(data, { type: 'binary' });

        // Prendre la première feuille
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          resolve({
            success: false,
            erreur: 'Aucune feuille trouvée dans le fichier',
            avertissements: [],
          });
          return;
        }

        const avertissements: string[] = [];

        // Extraire la référence chantier (cellule S10)
        const referenceChantierRaw = getCellValue(sheet, IDEABOIS_COLUMNS.REFERENCE_CHANTIER);
        const referenceChantier = parseReferenceChantier(referenceChantierRaw);

        if (!referenceChantier) {
          avertissements.push('Référence chantier non trouvée (cellule S10)');
        }

        // Extraire le matériau (cellule K7)
        const materiauRaw = getCellValue(sheet, IDEABOIS_COLUMNS.MATERIAU);
        const materiau = parseMateriau(materiauRaw);

        if (!materiau) {
          avertissements.push(`Matériau non reconnu dans "${materiauRaw}" (cellule K7)`);
        }

        // Extraire l'épaisseur (cellule Y7)
        const epaisseurRaw = getCellValue(sheet, IDEABOIS_COLUMNS.EPAISSEUR);
        const epaisseur = parseEpaisseur(epaisseurRaw);

        if (epaisseur === 19 && !String(epaisseurRaw || '').includes('19')) {
          avertissements.push('Épaisseur non trouvée (cellule Y7), valeur par défaut 19mm');
        }

        // Extraire les lignes de données (à partir de la ligne 18)
        const lignes: LigneImportee[] = [];
        let row = IDEABOIS_COLUMNS.PREMIERE_LIGNE_DONNEES;
        let lignesVides = 0;
        const MAX_LIGNES_VIDES = 5; // Arrêter après 5 lignes vides consécutives

        while (lignesVides < MAX_LIGNES_VIDES) {
          const reference = getCellByRowCol(sheet, IDEABOIS_COLUMNS.COL_REFERENCE, row);
          const longueur = getCellByRowCol(sheet, IDEABOIS_COLUMNS.COL_LONGUEUR, row);
          const largeur = getCellByRowCol(sheet, IDEABOIS_COLUMNS.COL_LARGEUR, row);
          const quantite = getCellByRowCol(sheet, IDEABOIS_COLUMNS.COL_QUANTITE, row);

          // Vérifier si la ligne a des données
          const hasReference = reference !== null && String(reference).trim() !== '';
          const hasLongueur = longueur !== null && parseNumber(longueur) > 0;
          const hasLargeur = largeur !== null && parseNumber(largeur) > 0;

          if (!hasReference && !hasLongueur && !hasLargeur) {
            lignesVides++;
            row++;
            continue;
          }

          // Réinitialiser le compteur de lignes vides
          lignesVides = 0;

          // Extraire les chants (vérifier plusieurs colonnes)
          const chantA = checkChantInColumns(sheet, IDEABOIS_COLUMNS.COL_CHANT_A1, row);
          const chantC = checkChantInColumns(sheet, IDEABOIS_COLUMNS.COL_CHANT_A2, row);
          const chantB = checkChantInColumns(sheet, IDEABOIS_COLUMNS.COL_CHANT_B1, row);
          const chantD = checkChantInColumns(sheet, IDEABOIS_COLUMNS.COL_CHANT_B2, row);

          const ligne: LigneImportee = {
            reference: String(reference || '').trim(),
            longueur: parseNumber(longueur),
            largeur: parseNumber(largeur),
            quantite: Math.max(1, Math.round(parseNumber(quantite))),
            chants: {
              A: chantA, // A1 = Longueur côté 1
              B: chantB, // B1 = Largeur côté 1
              C: chantC, // A2 = Longueur côté 2
              D: chantD, // B2 = Largeur côté 2
            },
          };

          // Validation de la ligne
          if (!ligne.reference) {
            avertissements.push(`Ligne ${row}: référence manquante`);
          }
          if (ligne.longueur === 0) {
            avertissements.push(`Ligne ${row}: longueur invalide ou manquante`);
          }
          if (ligne.largeur === 0) {
            avertissements.push(`Ligne ${row}: largeur invalide ou manquante`);
          }

          // Ajouter la ligne si elle a au moins une dimension valide
          if (ligne.longueur > 0 || ligne.largeur > 0 || ligne.reference) {
            lignes.push(ligne);
          }

          row++;
        }

        if (lignes.length === 0) {
          resolve({
            success: false,
            erreur: 'Aucune ligne de données trouvée dans le fichier',
            avertissements,
          });
          return;
        }

        const donnees: DonneesImportees = {
          referenceChantier,
          epaisseur: epaisseur || 19,
          materiau,
          lignes,
        };

        resolve({
          success: true,
          donnees,
          avertissements,
        });
      } catch (error) {
        resolve({
          success: false,
          erreur: `Erreur lors de la lecture du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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
