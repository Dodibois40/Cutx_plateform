/**
 * DXF Analyzer - Analyse les fichiers DXF pour détecter perçages et usinages
 *
 * Utilise dxf-parser pour parser le contenu DXF et identifier :
 * - Cercles = perçages potentiels
 * - Polylignes complexes = usinages potentiels
 * - Arcs = découpes arrondies
 */

import DxfParser from 'dxf-parser';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DxfAnalysisResult {
  success: boolean;
  error?: string;

  // Perçages détectés
  percages: {
    count: number;
    circles: DxfCircle[];
    diametreMin: number | null;
    diametreMax: number | null;
  };

  // Usinages détectés
  usinages: {
    hasComplexShapes: boolean;
    arcsCount: number;
    polylinesCount: number;
    splinesCount: number;
  };

  // Dimensions du contour
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } | null;

  // Statistiques
  stats: {
    totalEntities: number;
    layers: string[];
  };
}

export interface DxfCircle {
  x: number;
  y: number;
  radius: number;
  diameter: number;
  layer: string;
}

// ═══════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════

/**
 * Analyse un fichier DXF encodé en base64
 */
export function analyzeDxfBase64(base64Data: string): DxfAnalysisResult {
  try {
    // Décoder le base64
    const dxfContent = atob(base64Data);
    return analyzeDxfContent(dxfContent);
  } catch (error) {
    return {
      success: false,
      error: `Erreur décodage base64: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      percages: { count: 0, circles: [], diametreMin: null, diametreMax: null },
      usinages: { hasComplexShapes: false, arcsCount: 0, polylinesCount: 0, splinesCount: 0 },
      boundingBox: null,
      stats: { totalEntities: 0, layers: [] },
    };
  }
}

/**
 * Analyse le contenu brut d'un fichier DXF
 */
export function analyzeDxfContent(dxfContent: string): DxfAnalysisResult {
  try {
    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfContent);

    if (!dxf || !dxf.entities) {
      return {
        success: false,
        error: 'Fichier DXF invalide ou vide',
        percages: { count: 0, circles: [], diametreMin: null, diametreMax: null },
        usinages: { hasComplexShapes: false, arcsCount: 0, polylinesCount: 0, splinesCount: 0 },
        boundingBox: null,
        stats: { totalEntities: 0, layers: [] },
      };
    }

    // Collecter les entités par type
    const circles: DxfCircle[] = [];
    let arcsCount = 0;
    let polylinesCount = 0;
    let splinesCount = 0;
    const layers = new Set<string>();

    // Calculer le bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const entity of dxf.entities) {
      // Cast to any car dxf-parser n'a pas de types complets
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = entity as any;

      // Collecter les layers
      if (e.layer) {
        layers.add(e.layer);
      }

      // Analyser selon le type
      switch (e.type) {
        case 'CIRCLE':
          // Les cercles sont des perçages potentiels
          if (e.center && typeof e.radius === 'number') {
            const circle: DxfCircle = {
              x: e.center.x || 0,
              y: e.center.y || 0,
              radius: e.radius,
              diameter: e.radius * 2,
              layer: e.layer || '0',
            };
            circles.push(circle);

            // Mettre à jour le bounding box
            minX = Math.min(minX, circle.x - circle.radius);
            minY = Math.min(minY, circle.y - circle.radius);
            maxX = Math.max(maxX, circle.x + circle.radius);
            maxY = Math.max(maxY, circle.y + circle.radius);
          }
          break;

        case 'ARC':
          arcsCount++;
          // Les arcs indiquent des formes arrondies (usinages)
          if (e.center && typeof e.radius === 'number') {
            minX = Math.min(minX, e.center.x - e.radius);
            minY = Math.min(minY, e.center.y - e.radius);
            maxX = Math.max(maxX, e.center.x + e.radius);
            maxY = Math.max(maxY, e.center.y + e.radius);
          }
          break;

        case 'POLYLINE':
        case 'LWPOLYLINE':
          polylinesCount++;
          // Mettre à jour le bounding box avec les vertices
          if (e.vertices) {
            for (const vertex of e.vertices) {
              if (typeof vertex.x === 'number' && typeof vertex.y === 'number') {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
              }
            }
          }
          break;

        case 'SPLINE':
          splinesCount++;
          // Les splines sont des courbes complexes
          break;

        case 'LINE':
          // Mettre à jour le bounding box avec les points
          if (e.vertices) {
            for (const vertex of e.vertices) {
              if (typeof vertex.x === 'number' && typeof vertex.y === 'number') {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
              }
            }
          }
          break;
      }
    }

    // Calculer les stats des perçages
    const diametres = circles.map(c => c.diameter);
    const diametreMin = diametres.length > 0 ? Math.min(...diametres) : null;
    const diametreMax = diametres.length > 0 ? Math.max(...diametres) : null;

    // Déterminer si des formes complexes existent
    const hasComplexShapes = arcsCount > 0 || splinesCount > 0 || polylinesCount > 4;

    // Construire le bounding box (si des points ont été trouvés)
    const boundingBox = (minX !== Infinity && maxX !== -Infinity) ? {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    } : null;

    return {
      success: true,
      percages: {
        count: circles.length,
        circles,
        diametreMin,
        diametreMax,
      },
      usinages: {
        hasComplexShapes,
        arcsCount,
        polylinesCount,
        splinesCount,
      },
      boundingBox,
      stats: {
        totalEntities: dxf.entities.length,
        layers: Array.from(layers),
      },
    };

  } catch (error) {
    return {
      success: false,
      error: `Erreur parsing DXF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      percages: { count: 0, circles: [], diametreMin: null, diametreMax: null },
      usinages: { hasComplexShapes: false, arcsCount: 0, polylinesCount: 0, splinesCount: 0 },
      boundingBox: null,
      stats: { totalEntities: 0, layers: [] },
    };
  }
}

/**
 * Analyse un fichier DXF depuis un File object
 */
export async function analyzeDxfFile(file: File): Promise<DxfAnalysisResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        resolve(analyzeDxfContent(content));
      } else {
        resolve({
          success: false,
          error: 'Impossible de lire le fichier',
          percages: { count: 0, circles: [], diametreMin: null, diametreMax: null },
          usinages: { hasComplexShapes: false, arcsCount: 0, polylinesCount: 0, splinesCount: 0 },
          boundingBox: null,
          stats: { totalEntities: 0, layers: [] },
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Erreur lecture fichier',
        percages: { count: 0, circles: [], diametreMin: null, diametreMax: null },
        usinages: { hasComplexShapes: false, arcsCount: 0, polylinesCount: 0, splinesCount: 0 },
        boundingBox: null,
        stats: { totalEntities: 0, layers: [] },
      });
    };

    reader.readAsText(file);
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Filtre les perçages par diamètre
 * Utile pour ignorer les très petits cercles (détails) ou très grands (découpes)
 */
export function filterPercagesByDiameter(
  circles: DxfCircle[],
  minDiameter: number = 3,   // mm - ignorer les cercles < 3mm
  maxDiameter: number = 50   // mm - ignorer les cercles > 50mm (probablement des découpes)
): DxfCircle[] {
  return circles.filter(c => c.diameter >= minDiameter && c.diameter <= maxDiameter);
}

/**
 * Groupe les perçages par diamètre (pour compter les perçages identiques)
 */
export function groupPercagesByDiameter(circles: DxfCircle[]): Map<number, DxfCircle[]> {
  const groups = new Map<number, DxfCircle[]>();

  for (const circle of circles) {
    // Arrondir le diamètre à 0.1mm pour grouper
    const roundedDiameter = Math.round(circle.diameter * 10) / 10;

    if (!groups.has(roundedDiameter)) {
      groups.set(roundedDiameter, []);
    }
    groups.get(roundedDiameter)!.push(circle);
  }

  return groups;
}

/**
 * Résume l'analyse DXF en texte lisible
 */
export function summarizeDxfAnalysis(result: DxfAnalysisResult): string {
  if (!result.success) {
    return `Erreur: ${result.error}`;
  }

  const parts: string[] = [];

  // Perçages
  if (result.percages.count > 0) {
    const filtered = filterPercagesByDiameter(result.percages.circles);
    if (filtered.length > 0) {
      const groups = groupPercagesByDiameter(filtered);
      const groupStrs = Array.from(groups.entries())
        .map(([diam, circles]) => `${circles.length}×Ø${diam}mm`)
        .join(', ');
      parts.push(`Perçages: ${groupStrs}`);
    }
  }

  // Usinages
  if (result.usinages.hasComplexShapes) {
    const details: string[] = [];
    if (result.usinages.arcsCount > 0) details.push(`${result.usinages.arcsCount} arcs`);
    if (result.usinages.splinesCount > 0) details.push(`${result.usinages.splinesCount} courbes`);
    parts.push(`Usinages: ${details.join(', ')}`);
  }

  // Dimensions
  if (result.boundingBox) {
    const { width, height } = result.boundingBox;
    parts.push(`Dimensions: ${width.toFixed(0)}×${height.toFixed(0)}mm`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'Aucune entité détectée';
}
