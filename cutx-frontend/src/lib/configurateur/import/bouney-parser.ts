// Parser spécifique pour les fichiers Excel Bouney (Feuille de débits)
import * as XLSX from 'xlsx';
import type { Materiau } from '../types';
import type { DonneesImportees, LigneImportee, ResultatImport } from './types';
import { BOUNEY_COLUMNS } from './types';

/**
 * Mapping des mots-clés vers les types de matériaux du configurateur
 */
const MATERIAU_KEYWORDS: { keywords: string[]; value: Materiau }[] = [
  { keywords: ['mdf', 'medium'], value: 'mdf' },
  { keywords: ['plaqué', 'plaque', 'stratifié', 'strat'], value: 'plaque_bois' },
  { keywords: ['massif', 'chêne', 'hêtre', 'noyer', 'frêne', 'bois'], value: 'bois_massif' },
  { keywords: ['mélaminé', 'melamine', 'méla', 'mela', 'egger', 'kronospan'], value: 'melamine' },
];

/**
 * Parse la cellule "Référence / Épaisseur du matériau" pour extraire matériau et épaisseur
 * Exemples: "mdf 30", "MDF 19", "Mélaminé 18", "plaqué chêne 22"
 */
function parseMateriauEpaisseur(value: string | number | null): { materiau: Materiau | null; epaisseur: number } {
  if (value === null || value === undefined) {
    return { materiau: null, epaisseur: 19 };
  }

  const str = String(value).toLowerCase().trim();

  // Extraire l'épaisseur (chercher un nombre dans la chaîne)
  const epaisseurMatch = str.match(/(\d+)/);
  const epaisseur = epaisseurMatch ? parseInt(epaisseurMatch[1], 10) : 19;

  // Identifier le matériau par mots-clés
  let materiau: Materiau | null = null;
  for (const mapping of MATERIAU_KEYWORDS) {
    if (mapping.keywords.some(kw => str.includes(kw))) {
      materiau = mapping.value;
      break;
    }
  }

  return { materiau, epaisseur };
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
  return strValue === 'x' || strValue === 'X' || strValue === '1' || strValue === 'oui';
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
 * Parse un fichier Excel Bouney et extrait les données
 */
export function parseBouneyExcel(file: File): Promise<ResultatImport> {
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

        // Prendre la première feuille (ou chercher "Bouney")
        let sheetName = workbook.SheetNames[0];
        if (workbook.SheetNames.includes('Bouney')) {
          sheetName = 'Bouney';
        }
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

        // Extraire la référence chantier (cellule AU11)
        const referenceChantier = String(
          getCellValue(sheet, BOUNEY_COLUMNS.REFERENCE_CHANTIER) || ''
        ).trim();

        if (!referenceChantier) {
          avertissements.push('Référence chantier non trouvée (cellule AU11)');
        }

        // Extraire matériau + épaisseur (cellule N17, ex: "mdf 30")
        const materiauEpaisseurRaw = getCellValue(sheet, BOUNEY_COLUMNS.EPAISSEUR);
        const { materiau, epaisseur } = parseMateriauEpaisseur(materiauEpaisseurRaw);

        if (!materiau) {
          avertissements.push(`Matériau non reconnu dans "${materiauEpaisseurRaw}" (cellule N17)`);
        }
        if (epaisseur === 19 && !String(materiauEpaisseurRaw || '').includes('19')) {
          avertissements.push('Épaisseur non trouvée (cellule N17), valeur par défaut 19mm');
        }

        // Extraire les lignes de données (à partir de la ligne 27)
        const lignes: LigneImportee[] = [];
        let row = BOUNEY_COLUMNS.PREMIERE_LIGNE_DONNEES;
        let lignesVides = 0;
        const MAX_LIGNES_VIDES = 5; // Arrêter après 5 lignes vides consécutives

        while (lignesVides < MAX_LIGNES_VIDES) {
          const reference = getCellByRowCol(sheet, BOUNEY_COLUMNS.COL_REFERENCE, row);
          const longueur = getCellByRowCol(sheet, BOUNEY_COLUMNS.COL_LONGUEUR, row);
          const largeur = getCellByRowCol(sheet, BOUNEY_COLUMNS.COL_LARGEUR, row);
          const quantite = getCellByRowCol(sheet, BOUNEY_COLUMNS.COL_QUANTITE, row);

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

          // Extraire les chants
          const chantA = getCellByRowCol(sheet, BOUNEY_COLUMNS.COL_CHANT_A, row);
          const chantB = getCellByRowCol(sheet, BOUNEY_COLUMNS.COL_CHANT_B, row);
          const chantC = getCellByRowCol(sheet, BOUNEY_COLUMNS.COL_CHANT_C, row);
          const chantD = getCellByRowCol(sheet, BOUNEY_COLUMNS.COL_CHANT_D, row);

          const ligne: LigneImportee = {
            reference: String(reference || '').trim(),
            longueur: parseNumber(longueur),
            largeur: parseNumber(largeur),
            quantite: Math.max(1, Math.round(parseNumber(quantite))),
            chants: {
              A: isChantCoche(chantA),
              B: isChantCoche(chantB),
              C: isChantCoche(chantC),
              D: isChantCoche(chantD),
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
          epaisseur: epaisseur || 19, // Valeur par défaut
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

/**
 * Compte le nombre total de lignes qui seront créées (en tenant compte des quantités)
 */
export function compterLignesACreer(donnees: DonneesImportees): number {
  return donnees.lignes.reduce((total, ligne) => total + ligne.quantite, 0);
}
