/**
 * DXF Router - Point d'entrée unifié pour l'import DXF
 *
 * Détecte automatiquement le format du fichier DXF et appelle le parser approprié:
 * - TopSolid Wood: Calques "Brut", "TEXTE", "Percage X prof.Y"
 * - Blum DYNAPLAN: Blocs "TitleBlock_*", "*Paper_Space*"
 * - Générique: Fallback pour les autres formats
 */

import DxfParser from 'dxf-parser';
import { isTopSolidDxf, parseTopSolidDxfContent } from './topsolid-dxf-parser';
import { parseDxfContent as parseBlumDxfContent } from './dxf-parser';
import type { DxfResultatImport } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DxfParsed = any;

export type DxfFormat = 'topsolid' | 'blum' | 'generic';

interface DetectionResult {
  format: DxfFormat;
  confidence: number; // 0-1
  details: string;
}

/**
 * Point d'entrée principal pour parser un fichier DXF
 * Détecte automatiquement le format et appelle le parser approprié
 */
export async function parseDxfFile(file: File): Promise<DxfResultatImport> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) {
        resolve({
          success: false,
          erreur: 'Impossible de lire le fichier DXF',
          avertissements: [],
        });
        return;
      }

      try {
        const result = await parseDxfContentWithDetection(content, file.name);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          erreur: `Erreur de parsing DXF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
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

    reader.readAsText(file);
  });
}

/**
 * Parse le contenu DXF avec détection automatique du format
 */
export async function parseDxfContentWithDetection(
  content: string,
  fileName: string
): Promise<DxfResultatImport> {
  const avertissements: string[] = [];

  // Parser le DXF pour analyser sa structure
  const parser = new DxfParser();
  let dxf: DxfParsed;

  try {
    dxf = parser.parseSync(content);
  } catch (error) {
    return {
      success: false,
      erreur: `Erreur de parsing DXF: ${error instanceof Error ? error.message : 'Fichier invalide'}`,
      avertissements: [],
    };
  }

  if (!dxf) {
    return {
      success: false,
      erreur: 'Fichier DXF invalide ou vide',
      avertissements: [],
    };
  }

  // Détecter le format
  const detection = detectDxfFormat(dxf, fileName);
  console.log(`[DXF Router] Detected format: ${detection.format} (confidence: ${detection.confidence})`);
  console.log(`[DXF Router] Details: ${detection.details}`);

  avertissements.push(`Format détecté: ${formatLabel(detection.format)}`);

  // Appeler le parser approprié
  let result: DxfResultatImport;

  switch (detection.format) {
    case 'topsolid':
      result = parseTopSolidDxfContent(content, fileName);
      break;

    case 'blum':
      result = parseBlumDxfContent(content, fileName);
      break;

    case 'generic':
    default:
      // Essayer d'abord TopSolid (plus permissif), puis Blum en fallback
      result = parseTopSolidDxfContent(content, fileName);
      if (!result.success || (result.donnees?.panels.length || 0) === 0) {
        result = parseBlumDxfContent(content, fileName);
      }
      break;
  }

  // Ajouter les avertissements de détection
  result.avertissements = [...avertissements, ...(result.avertissements || [])];

  return result;
}

/**
 * Détecte le format du fichier DXF
 */
function detectDxfFormat(dxf: DxfParsed, fileName: string): DetectionResult {
  // Collecter les indices pour chaque format
  let topSolidScore = 0;
  let blumScore = 0;
  const details: string[] = [];

  // === Indices TopSolid ===

  // Vérifier les calques caractéristiques
  const layers = dxf.tables?.layer?.layers || {};
  const layerNames = Object.keys(layers).map(n => n.toLowerCase());

  if (layerNames.includes('brut')) {
    topSolidScore += 3;
    details.push('Calque "Brut" trouvé (+3 TopSolid)');
  }

  if (layerNames.includes('texte')) {
    topSolidScore += 2;
    details.push('Calque "TEXTE" trouvé (+2 TopSolid)');
  }

  if (layerNames.some(n => n.includes('percage') && n.includes('prof'))) {
    topSolidScore += 3;
    details.push('Calque "Percage...prof." trouvé (+3 TopSolid)');
  }

  if (layerNames.some(n => n.includes('poche') && n.includes('prof'))) {
    topSolidScore += 2;
    details.push('Calque "Poche...prof." trouvé (+2 TopSolid)');
  }

  if (layerNames.some(n => n.includes('rainure'))) {
    topSolidScore += 2;
    details.push('Calque "Rainure" trouvé (+2 TopSolid)');
  }

  if (layerNames.includes('tracé') || layerNames.includes('trace')) {
    topSolidScore += 1;
    details.push('Calque "Tracé" trouvé (+1 TopSolid)');
  }

  // === Indices Blum DYNAPLAN ===

  // Vérifier les blocs caractéristiques
  const blockNames = Object.keys(dxf.blocks || {});

  if (blockNames.some(n => n.startsWith('TitleBlock_'))) {
    blumScore += 5;
    details.push('Bloc "TitleBlock_*" trouvé (+5 Blum)');
  }

  if (blockNames.some(n => n.includes('Paper_Space'))) {
    blumScore += 2;
    details.push('Bloc "*Paper_Space*" trouvé (+2 Blum)');
  }

  if (blockNames.some(n => /^\*T\d+$/.test(n))) {
    blumScore += 2;
    details.push('Bloc "*T*" trouvé (+2 Blum)');
  }

  // Vérifier les dimensions (caractéristique Blum)
  const hasDimensions = dxf.entities?.some(
    (e: { type: string; actualMeasurement?: number }) =>
      e.type === 'DIMENSION' && typeof e.actualMeasurement === 'number' && e.actualMeasurement > 0
  );
  if (hasDimensions) {
    blumScore += 1;
    details.push('Entités DIMENSION trouvées (+1 Blum)');
  }

  // === Décision ===

  // Vérifier avec la fonction isTopSolidDxf pour confirmation
  if (isTopSolidDxf(dxf)) {
    topSolidScore += 2;
    details.push('isTopSolidDxf() retourne true (+2 TopSolid)');
  }

  // Calculer les scores finaux
  const totalScore = topSolidScore + blumScore;
  let format: DxfFormat;
  let confidence: number;

  if (topSolidScore > blumScore && topSolidScore >= 3) {
    format = 'topsolid';
    confidence = totalScore > 0 ? topSolidScore / totalScore : 0.5;
  } else if (blumScore > topSolidScore && blumScore >= 3) {
    format = 'blum';
    confidence = totalScore > 0 ? blumScore / totalScore : 0.5;
  } else {
    format = 'generic';
    confidence = 0.3;
  }

  return {
    format,
    confidence: Math.min(confidence, 1),
    details: details.join('; '),
  };
}

/**
 * Retourne un label lisible pour le format
 */
function formatLabel(format: DxfFormat): string {
  switch (format) {
    case 'topsolid':
      return 'TopSolid Wood';
    case 'blum':
      return 'Blum DYNAPLAN';
    case 'generic':
      return 'DXF générique';
  }
}

/**
 * Re-export pour compatibilité
 */
export { parseTopSolidDxfContent, isTopSolidDxf } from './topsolid-dxf-parser';
export { parseDxfContent as parseBlumDxfContent } from './dxf-parser';
