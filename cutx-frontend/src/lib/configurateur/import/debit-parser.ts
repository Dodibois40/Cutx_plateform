// Parser spécifique pour les fichiers Excel DEBIT (format multi-onglets)
import * as XLSX from 'xlsx';
import type { Materiau } from '../types';
import type { DonneesImportees, LigneImportee, ResultatImport } from './types';

/**
 * Parse le nom de matériau pour extraire le type
 * Retourne le nom du matériau exactement tel qu'il apparaît dans l'Excel
 * Exemples: "Aggloméré hydro" → "Aggloméré hydro", "MDF" → "MDF", "Mela blanc 19mm" → "Mela blanc 19mm"
 */
function parseMateriau(value: string | number | null): Materiau | null {
  if (value === null || value === undefined) {
    return null;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Retourner le nom du matériau tel quel
  return str;
}

/**
 * Détecte les indices des colonnes importantes dans le header
 */
function detecterColonnes(headerRow: any[]): {
  designation?: number;
  chantLong1?: number;
  chantLong2?: number;
  chantLarg1?: number;
  chantLarg2?: number;
} {
  const indices: any = {};

  headerRow.forEach((header, index) => {
    const headerStr = String(header).toLowerCase().trim();

    if (headerStr.includes('designation')) {
      indices.designation = index;
    } else if (headerStr.includes('chant_long_1') || headerStr.includes('chant long 1')) {
      indices.chantLong1 = index;
    } else if (headerStr.includes('chant_long_2') || headerStr.includes('chant long 2')) {
      indices.chantLong2 = index;
    } else if (headerStr.includes('chant_larg_1') || headerStr.includes('chant larg 1')) {
      indices.chantLarg1 = index;
    } else if (headerStr.includes('chant_larg_2') || headerStr.includes('chant larg 2')) {
      indices.chantLarg2 = index;
    }
  });

  return indices;
}

/**
 * Parse une ligne du fichier DEBIT
 * Format attendu: [MATIERE, ÉPAISSEUR, LONGUEUR, LARGEUR, NB., DESIGNATION, ...]
 * Colonnes optionnelles: CHANT_LONG_1, CHANT_LONG_2, CHANT_LARG_1, CHANT_LARG_2
 */
function parseLigneDebit(
  row: any[],
  sheetName: string,
  colonnes: ReturnType<typeof detecterColonnes>,
  avertissements: string[]
): { lignes: LigneImportee[]; epaisseur: number; materiau: Materiau | null } | null {
  // Colonnes attendues (positions fixes)
  const matiere = row[0];
  const epaisseur = row[1];
  const longueur = row[2];
  const largeur = row[3];
  const quantite = row[4];

  // Colonne DESIGNATION (position variable)
  const indexDesignation = colonnes.designation !== undefined ? colonnes.designation : 5;
  const designation = row[indexDesignation];

  // Vérifier que la ligne contient des données
  if (!designation || !longueur || !largeur) {
    return null;
  }

  // Parser les valeurs
  const materiau = parseMateriau(matiere);
  const epaisseurNum = typeof epaisseur === 'number' ? epaisseur : 19;
  const longueurNum = typeof longueur === 'number' ? Math.round(longueur) : 0;
  const largeurNum = typeof largeur === 'number' ? Math.round(largeur) : 0;
  const quantiteNum = typeof quantite === 'number' ? Math.round(quantite) : 1;
  const reference = String(designation).trim();

  // Vérifier les dimensions
  if (longueurNum <= 0 || largeurNum <= 0) {
    avertissements.push(`Ligne "${reference}": dimensions invalides (${longueurNum} × ${largeurNum})`);
    return null;
  }

  // Créer autant de lignes que la quantité
  const lignes: LigneImportee[] = [];

  // Référence de base (sans préfixe, uniquement la désignation)
  const refBase = reference;

  // Parser les chants (si les colonnes existent)
  const chantA = colonnes.chantLong1 !== undefined
    ? Boolean(row[colonnes.chantLong1])
    : false; // Par défaut false si pas de colonne
  const chantC = colonnes.chantLong2 !== undefined
    ? Boolean(row[colonnes.chantLong2])
    : false;
  const chantB = colonnes.chantLarg1 !== undefined
    ? Boolean(row[colonnes.chantLarg1])
    : false;
  const chantD = colonnes.chantLarg2 !== undefined
    ? Boolean(row[colonnes.chantLarg2])
    : false;

  for (let i = 0; i < quantiteNum; i++) {
    lignes.push({
      reference: refBase, // La référence sera numérotée plus tard dans le parseur principal
      longueur: longueurNum,
      largeur: largeurNum,
      quantite: 1,
      materiau: materiau,
      chants: {
        A: chantA,
        B: chantB,
        C: chantC,
        D: chantD,
      },
    });
  }

  return { lignes, epaisseur: epaisseurNum, materiau };
}

/**
 * Parse un fichier Excel au format DEBIT (multi-onglets)
 */
export async function parseDebitExcel(file: File): Promise<ResultatImport> {
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
        const avertissements: string[] = [];
        const toutesLesLignes: LigneImportee[] = [];
        let epaisseurGlobale = 19;
        let materiauGlobal: Materiau | null = null;

        // Compteur pour rendre les références uniques
        const refCounter = new Map<string, number>();

        // Parcourir tous les onglets
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          // Convertir en array
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

          // Vérifier que la première ligne est bien un header
          const headerRow = rows[0];
          if (!headerRow || !Array.isArray(headerRow)) {
            avertissements.push(`Onglet "${sheetName}": aucune donnée trouvée`);
            continue;
          }

          // Vérifier que le header contient les colonnes attendues
          const headerStr = headerRow.map(h => String(h).toLowerCase()).join(' ');
          const hasExpectedColumns =
            headerStr.includes('matiere') &&
            headerStr.includes('longueur') &&
            headerStr.includes('largeur') &&
            headerStr.includes('designation');

          if (!hasExpectedColumns) {
            avertissements.push(`Onglet "${sheetName}": format non reconnu (colonnes attendues: MATIERE, LONGUEUR, LARGEUR, DESIGNATION)`);
            continue;
          }

          // Détecter les colonnes importantes (DESIGNATION et chants optionnels)
          const colonnes = detecterColonnes(headerRow);

          // Parser les lignes (en sautant le header)
          let lignesParseesOnglet = 0;
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !Array.isArray(row)) continue;

            const resultat = parseLigneDebit(row, sheetName, colonnes, avertissements);
            if (resultat) {
              // Numéroter les références pour les rendre uniques
              for (const ligne of resultat.lignes) {
                const refBase = ligne.reference;

                // Incrémenter le compteur pour cette référence
                const count = (refCounter.get(refBase) || 0) + 1;
                refCounter.set(refBase, count);

                // Ajouter le numéro de séquence à la référence
                ligne.reference = `${refBase}_${count}`;

                toutesLesLignes.push(ligne);
                lignesParseesOnglet++;
              }

              // Utiliser l'épaisseur et le matériau de la première ligne valide
              if (lignesParseesOnglet === resultat.lignes.length) {
                epaisseurGlobale = resultat.epaisseur;
                materiauGlobal = resultat.materiau;
              }
            }
          }

          if (lignesParseesOnglet > 0) {
            avertissements.push(`Onglet "${sheetName}": ${lignesParseesOnglet} ligne(s) importée(s)`);
          } else {
            avertissements.push(`Onglet "${sheetName}": aucune ligne valide trouvée`);
          }
        }

        // Vérifier qu'on a bien des lignes
        if (toutesLesLignes.length === 0) {
          resolve({
            success: false,
            erreur: 'Aucune ligne valide trouvée dans le fichier',
            avertissements,
          });
          return;
        }

        // Retourner le résultat
        resolve({
          success: true,
          donnees: {
            referenceChantier: `Import DEBIT - ${file.name}`,
            epaisseur: epaisseurGlobale,
            materiau: materiauGlobal,
            lignes: toutesLesLignes,
          },
          avertissements: [
            `✓ ${toutesLesLignes.length} ligne(s) importée(s) depuis ${workbook.SheetNames.length} onglet(s)`,
            ...avertissements,
          ],
        });
      } catch (error) {
        resolve({
          success: false,
          erreur: `Erreur lors du parsing: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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
