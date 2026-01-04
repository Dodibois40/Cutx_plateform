/**
 * DXF Parser - Extraction multi-panneaux depuis fichiers DXF (Blum DYNAPLAN)
 *
 * Structure DXF analysée (Nouveau-meuble.DXF):
 * - TitleBlock_* blocks: identifient les panneaux uniques
 * - *T* blocks (MTEXT): contiennent les noms/désignations
 * - *Paper_Space* blocks: contiennent geometry et DIMENSION entities
 * - DIMENSION.actualMeasurement: valeurs des dimensions en mm
 * - Layers table: "Nouveau projet_Nouveau meuble_Panneau supérieur" etc.
 */

import DxfParser from 'dxf-parser';
import type {
  DxfResultatImport,
  DxfDonneesImportees,
  DxfPanelExtracted,
  DxfPanelGeometry,
  DxfCircleInfo,
  DxfPolylineInfo,
  DxfTitleBlockData,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DxfEntity = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DxfBlock = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DxfParsed = any;

interface PanelInfo {
  name: string;
  titleBlockName: string;
  tBlockName: string | null;
  paperSpaceName: string | null;
  layerPrefix: string;
  // Dimensions par vue pour extraction précise
  dimensionsByView: {
    vueDroite: number[];   // Contient épaisseur
    vueDessus: number[];   // Contient longueur × largeur
    other: number[];
  };
  geometry: { lines: DxfEntity[]; circles: DxfEntity[]; polylines: DxfEntity[] };
  designation: string;
  projet: string;
  corpsMeuble: string;
  quantite: number;
  createur: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Parse un fichier DXF et extrait tous les panneaux
 */
export async function parseDxfFile(file: File): Promise<DxfResultatImport> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const result = parseDxfContent(content, file.name);
        resolve(result);
      } else {
        resolve({
          success: false,
          erreur: 'Impossible de lire le fichier DXF',
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
 * Parse le contenu DXF et extrait les panneaux
 */
export function parseDxfContent(dxfContent: string, fileName: string = 'unknown.dxf'): DxfResultatImport {
  const avertissements: string[] = [];

  try {
    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfContent);

    if (!dxf) {
      return {
        success: false,
        erreur: 'Fichier DXF invalide ou vide',
        avertissements: [],
      };
    }

    // 1. Identifier les panneaux depuis les TitleBlock_* blocks
    const panelInfos = identifyPanelsFromBlocks(dxf, avertissements);

    if (panelInfos.length === 0) {
      // Fallback: traiter comme un seul panneau
      avertissements.push('Aucune structure TitleBlock détectée, traitement comme panneau unique');
      const singlePanel = extractSinglePanel(dxf, dxfContent, fileName);
      if (singlePanel) {
        return {
          success: true,
          donnees: {
            sourceFileName: fileName,
            panels: [singlePanel],
            projet: '',
            corpsMeuble: '',
          },
          avertissements,
        };
      }
      return {
        success: false,
        erreur: 'Aucun panneau valide trouvé dans le fichier DXF',
        avertissements,
      };
    }

    // 2. Enrichir les infos des panneaux depuis les *T* blocks et Paper_Space
    enrichPanelInfos(dxf, panelInfos, avertissements);

    // 3. Collecter les dimensions depuis les DIMENSION entities
    collectDimensions(dxf, panelInfos);

    // 4. Collecter la géométrie depuis les Paper_Space et main entities
    collectGeometry(dxf, panelInfos);

    // 5. Convertir en DxfPanelExtracted
    const panels: DxfPanelExtracted[] = panelInfos.map(info =>
      convertToPanelExtracted(info, dxfContent)
    );

    // 6. Extraire infos globales
    const globalInfo = extractGlobalInfo(panelInfos);

    return {
      success: true,
      donnees: {
        sourceFileName: fileName,
        panels,
        projet: globalInfo.projet,
        corpsMeuble: globalInfo.corpsMeuble,
      },
      avertissements,
    };

  } catch (error) {
    return {
      success: false,
      erreur: `Erreur de parsing DXF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      avertissements,
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// PANEL IDENTIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Identifie les panneaux depuis les blocs TitleBlock_*
 */
function identifyPanelsFromBlocks(dxf: DxfParsed, avertissements: string[]): PanelInfo[] {
  const panels: PanelInfo[] = [];

  if (!dxf.blocks) {
    avertissements.push('Aucun bloc trouvé dans le DXF');
    return panels;
  }

  const blockNames = Object.keys(dxf.blocks);

  // Trouver les TitleBlock_* blocks
  const titleBlockNames = blockNames.filter(name => name.startsWith('TitleBlock_'));

  for (const titleBlockName of titleBlockNames) {
    // Extraire le nom du panneau depuis le nom du bloc
    // Ex: "TitleBlock_Panneau supérieur" → "Panneau supérieur"
    const panelName = decodeUnicodeEscapes(titleBlockName.replace('TitleBlock_', ''));

    // Trouver le layer correspondant
    const layerPrefix = findMatchingLayer(dxf, panelName);

    panels.push({
      name: panelName,
      titleBlockName,
      tBlockName: null,
      paperSpaceName: null,
      layerPrefix: layerPrefix || panelName,
      dimensionsByView: {
        vueDroite: [],
        vueDessus: [],
        other: [],
      },
      geometry: { lines: [], circles: [], polylines: [] },
      designation: panelName,
      projet: '',
      corpsMeuble: '',
      quantite: 1,
      createur: '',
    });
  }

  return panels;
}

/**
 * Trouve le layer qui correspond à un nom de panneau
 */
function findMatchingLayer(dxf: DxfParsed, panelName: string): string | null {
  if (!dxf.tables?.layer?.layers) return null;

  const normalizedPanelName = panelName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const layerName of Object.keys(dxf.tables.layer.layers)) {
    const normalizedLayerName = layerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Vérifier si le layer contient le nom du panneau
    // Ex: "Nouveau projet_Nouveau meuble_Panneau supérieur" contient "panneau superieur"
    if (normalizedLayerName.includes(normalizedPanelName) && !normalizedLayerName.includes('vue de')) {
      return layerName;
    }
  }

  return null;
}

/**
 * Enrichit les infos des panneaux depuis les *T* blocks
 */
function enrichPanelInfos(dxf: DxfParsed, panelInfos: PanelInfo[], avertissements: string[]): void {
  if (!dxf.blocks) return;

  const blockNames = Object.keys(dxf.blocks);

  // Trouver les *T* blocks (tables) et les *Paper_Space* blocks
  const tBlocks = blockNames.filter(name => /^\*T\d+$/.test(name));
  const paperSpaceBlocks = blockNames.filter(name =>
    name.includes('Paper_Space') && dxf.blocks[name].entities?.length > 0
  );

  // Pour chaque Paper_Space, trouver quel TitleBlock il référence
  for (const psName of paperSpaceBlocks) {
    const ps = dxf.blocks[psName];
    if (!ps.entities) continue;

    // Chercher INSERT entities qui référencent un TitleBlock
    const inserts = ps.entities.filter((e: DxfEntity) =>
      e.type === 'INSERT' && e.name?.startsWith('TitleBlock_')
    );

    for (const insert of inserts) {
      const titleBlockName = insert.name;
      const panel = panelInfos.find(p => p.titleBlockName === titleBlockName);
      if (panel) {
        panel.paperSpaceName = psName;
      }
    }
  }

  // Pour chaque *T* block, extraire les infos du tableau
  for (let i = 0; i < tBlocks.length && i < panelInfos.length; i++) {
    const tBlock = dxf.blocks[tBlocks[i]];
    if (!tBlock.entities) continue;

    // Extraire les MTEXT
    const mtexts = tBlock.entities
      .filter((e: DxfEntity) => e.type === 'MTEXT')
      .map((e: DxfEntity) => decodeUnicodeEscapes(e.text || ''));

    // Généralement: [projet, corpsMeuble, quantité, désignation, créateur]
    if (mtexts.length >= 4) {
      // Trouver le panneau correspondant (par ordre ou par matching de nom)
      const panel = panelInfos[i] || panelInfos.find(p =>
        mtexts.some((t: string) =>
          normalizeString(p.name).includes(normalizeString(t)) ||
          normalizeString(t).includes(normalizeString(p.name))
        )
      );

      if (panel) {
        panel.tBlockName = tBlocks[i];
        panel.projet = mtexts[0] || panel.projet;
        panel.corpsMeuble = mtexts[1] || panel.corpsMeuble;
        panel.quantite = parseInt(mtexts[2], 10) || 1;
        if (mtexts[3]) panel.designation = mtexts[3];
        if (mtexts[4]) panel.createur = mtexts[4];
      }
    }
  }
}

/**
 * Collecte les dimensions depuis les DIMENSION entities, classifiées par vue
 * - Vue de droite: contient l'épaisseur (19mm typiquement)
 * - Vue de dessus: contient longueur × largeur
 */
function collectDimensions(dxf: DxfParsed, panelInfos: PanelInfo[]): void {
  const addDimension = (entity: DxfEntity, panel: PanelInfo) => {
    if (!entity.layer) return;

    const normalizedLayer = normalizeString(entity.layer);
    const dim = entity.actualMeasurement;

    // Classifier par type de vue
    if (normalizedLayer.includes('vue de droite')) {
      panel.dimensionsByView.vueDroite.push(dim);
    } else if (normalizedLayer.includes('vue de dessus')) {
      panel.dimensionsByView.vueDessus.push(dim);
    } else {
      panel.dimensionsByView.other.push(dim);
    }
  };

  // Collecter depuis les main entities
  if (dxf.entities) {
    for (const entity of dxf.entities) {
      if (entity.type === 'DIMENSION' && entity.actualMeasurement > 0) {
        const panel = findPanelByLayer(panelInfos, entity.layer);
        if (panel) {
          addDimension(entity, panel);
        }
      }
    }
  }

  // Collecter depuis les blocs (Paper_Space, *D*, etc.)
  if (dxf.blocks) {
    for (const blockName of Object.keys(dxf.blocks)) {
      const block = dxf.blocks[blockName];
      if (!block.entities) continue;

      for (const entity of block.entities) {
        if (entity.type === 'DIMENSION' && entity.actualMeasurement > 0) {
          const panel = findPanelByLayer(panelInfos, entity.layer);
          if (panel) {
            addDimension(entity, panel);
          }
        }
      }
    }
  }
}

/**
 * Collecte la géométrie depuis les Paper_Space et main entities
 */
function collectGeometry(dxf: DxfParsed, panelInfos: PanelInfo[]): void {
  // Collecter depuis les Paper_Space blocks
  if (dxf.blocks) {
    for (const panel of panelInfos) {
      if (panel.paperSpaceName) {
        const ps = dxf.blocks[panel.paperSpaceName];
        if (ps?.entities) {
          for (const entity of ps.entities) {
            addEntityToGeometry(entity, panel);
          }
        }
      }
    }
  }

  // Collecter depuis main entities par layer
  if (dxf.entities) {
    for (const entity of dxf.entities) {
      const panel = findPanelByLayer(panelInfos, entity.layer);
      if (panel) {
        addEntityToGeometry(entity, panel);
      }
    }
  }
}

/**
 * Ajoute une entité à la géométrie du panneau
 */
function addEntityToGeometry(entity: DxfEntity, panel: PanelInfo): void {
  switch (entity.type) {
    case 'LINE':
      if (entity.vertices?.length >= 2) {
        panel.geometry.lines.push(entity);
      }
      break;
    case 'CIRCLE':
      if (entity.center && entity.radius) {
        panel.geometry.circles.push(entity);
      }
      break;
    case 'LWPOLYLINE':
    case 'POLYLINE':
      if (entity.vertices?.length >= 2) {
        panel.geometry.polylines.push(entity);
      }
      break;
  }
}

/**
 * Trouve un panneau par son layer
 * Algorithme amélioré pour éviter les faux positifs (ex: "Étagère" ne doit pas matcher "Étagère2")
 */
function findPanelByLayer(panelInfos: PanelInfo[], layer: string | undefined): PanelInfo | undefined {
  if (!layer || layer === '0') return undefined;

  const normalizedLayer = normalizeString(layer);

  // Trier par longueur de nom DESCENDANT pour matcher les noms plus spécifiques d'abord
  // Ex: "etagere2" doit être testé avant "etagere"
  const sortedPanels = [...panelInfos].sort((a, b) =>
    normalizeString(b.name).length - normalizeString(a.name).length
  );

  // Chercher un match précis en utilisant des délimiteurs de mots
  for (const panel of sortedPanels) {
    const normalizedName = normalizeString(panel.name);
    const normalizedLayerPrefix = normalizeString(panel.layerPrefix);

    // Vérifier si le nom apparaît comme un segment distinct dans le layer
    // Les segments sont séparés par _ ou espaces
    const layerSegments = normalizedLayer.split(/[_\s]+/);

    // Match exact sur un segment
    if (layerSegments.some(seg => seg === normalizedName)) {
      return panel;
    }

    // Match sur le layerPrefix (plus spécifique)
    if (normalizedLayer.includes(normalizedLayerPrefix) && normalizedLayerPrefix.length > 3) {
      return panel;
    }
  }

  // Fallback: match partiel mais avec vérification qu'on n'a pas un match plus long
  for (const panel of sortedPanels) {
    const normalizedName = normalizeString(panel.name);

    if (normalizedLayer.includes(normalizedName)) {
      // Vérifier qu'il n'y a pas un panneau avec un nom plus long qui matcherait mieux
      const hasLongerMatch = sortedPanels.some(other => {
        if (other === panel) return false;
        const otherName = normalizeString(other.name);
        return otherName.length > normalizedName.length &&
               otherName.includes(normalizedName) &&
               normalizedLayer.includes(otherName);
      });

      if (!hasLongerMatch) {
        return panel;
      }
    }
  }

  return undefined;
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION TO OUTPUT FORMAT
// ═══════════════════════════════════════════════════════════════

/**
 * Convertit un PanelInfo en DxfPanelExtracted
 */
function convertToPanelExtracted(info: PanelInfo, fullDxfContent: string): DxfPanelExtracted {
  // Extraire les dimensions depuis les vues
  const { vueDroite, vueDessus, other } = info.dimensionsByView;

  // --- ÉPAISSEUR ---
  // Détecter l'épaisseur selon le type de panneau (basé sur le nom)
  // - "Dos" ou "fond" → épaisseurs fines (8mm, 6mm, 3mm)
  // - Autres panneaux → épaisseurs standards (19mm, 18mm, 16mm)
  let epaisseur = 19; // Default standard

  const vueDroiteUnique = Array.from(new Set(vueDroite));
  const otherUnique = Array.from(new Set(other));

  // Vérifier si c'est un panneau de dos/fond (épaisseur fine attendue)
  const panelNameLower = normalizeString(info.name);
  const designationLower = normalizeString(info.designation);
  const isDosPanel = panelNameLower.includes('dos') ||
                     panelNameLower.includes('fond') ||
                     designationLower.includes('dos') ||
                     designationLower.includes('fond');

  // Épaisseurs selon le type de panneau
  const epaisseursFines = [8, 6, 3, 10, 5, 12];  // Pour dos/fond
  const epaisseursStandards = [19, 18, 16, 22, 25, 32, 38, 40, 30, 28];  // Pour panneaux normaux (incluant épaisseurs plans de travail)

  // Toutes les dimensions candidates (3-50mm) de Vue de droite et other
  const allCandidates = [
    ...vueDroiteUnique.filter(d => d >= 3 && d <= 50),
    ...otherUnique.filter(d => d >= 3 && d <= 50),
  ];

  let found = false;

  if (isDosPanel) {
    // Pour les panneaux de dos: chercher une épaisseur fine
    for (const ep of epaisseursFines) {
      if (allCandidates.some(d => Math.abs(d - ep) < 0.5)) {
        epaisseur = ep;
        found = true;
        break;
      }
    }
    // Fallback: épaisseur standard si pas d'épaisseur fine trouvée
    if (!found) {
      for (const ep of epaisseursStandards) {
        if (allCandidates.some(d => Math.abs(d - ep) < 0.5)) {
          epaisseur = ep;
          found = true;
          break;
        }
      }
    }
  } else {
    // Pour les panneaux normaux: chercher une épaisseur standard
    for (const ep of epaisseursStandards) {
      if (allCandidates.some(d => Math.abs(d - ep) < 0.5)) {
        epaisseur = ep;
        found = true;
        break;
      }
    }
    // Fallback: épaisseur fine si pas d'épaisseur standard trouvée
    if (!found) {
      for (const ep of epaisseursFines) {
        if (allCandidates.some(d => Math.abs(d - ep) < 0.5)) {
          epaisseur = ep;
          found = true;
          break;
        }
      }
    }
  }

  // Dernier fallback: prendre la dimension la plus proche d'une épaisseur connue
  if (!found && allCandidates.length > 0) {
    const allEpaisseurs = [...epaisseursStandards, ...epaisseursFines];
    let bestMatch = 19;
    let bestDiff = Infinity;
    for (const candidate of allCandidates) {
      for (const ep of allEpaisseurs) {
        const diff = Math.abs(candidate - ep);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = ep;
        }
      }
    }
    epaisseur = bestMatch;
  }

  // --- LONGUEUR & LARGEUR ---
  // Depuis Vue de dessus: prendre les 2 plus grandes dimensions > 100mm
  // qui sont des dimensions de panneau (pas des cotes d'usinage)
  const vueDessusUnique = Array.from(new Set(vueDessus))
    .filter(d => d > 100) // Exclure petites dimensions (usinages)
    .sort((a, b) => b - a);

  let longueur = 0;
  let largeur = 0;

  if (vueDessusUnique.length >= 2) {
    // La plus grande est la longueur
    longueur = vueDessusUnique[0];

    // Pour la largeur, chercher une dimension "raisonnable"
    // Heuristique: la largeur est généralement < 70% de la longueur pour un panneau
    // ou c'est une dimension commune (comme 560mm profondeur standard)
    const largeurCandidates = vueDessusUnique.slice(1).filter(d =>
      d < longueur * 0.85 || // Plus petite que 85% de la longueur
      [560, 600, 580, 500, 550, 450, 400].includes(Math.round(d)) // Ou dimension standard
    );

    if (largeurCandidates.length > 0) {
      largeur = largeurCandidates[0];
    } else {
      // Fallback: 2ème plus grande
      largeur = vueDessusUnique[1];
    }
  } else if (vueDessusUnique.length === 1) {
    // Panneau carré ou données manquantes
    longueur = vueDessusUnique[0];
    largeur = longueur;
  } else {
    // Pas de dimensions dans Vue de dessus, utiliser other
    const otherUnique = Array.from(new Set(other))
      .filter(d => d > 100)
      .sort((a, b) => b - a);
    longueur = otherUnique[0] || 0;
    largeur = otherUnique[1] || longueur;
  }

  // S'assurer que longueur > largeur
  if (largeur > longueur) {
    [longueur, largeur] = [largeur, longueur];
  }

  // Calculer le bounding box depuis la géométrie
  const boundingBox = calculateBoundingBoxFromGeometry(info.geometry, longueur, largeur);

  // Convertir la géométrie au format attendu
  const geometry = convertGeometry(info.geometry);

  // Calculer surface et périmètre
  const surfaceM2 = (longueur * largeur) / 1_000_000;
  const perimetreM = 2 * (longueur + largeur) / 1000;

  return {
    reference: info.designation || info.name,
    layerPrefix: info.layerPrefix,
    dimensions: {
      longueur: Math.round(longueur),
      largeur: Math.round(largeur),
      epaisseur: Math.round(epaisseur),
    },
    quantite: info.quantite,
    geometry,
    titleBlockData: {
      projet: info.projet,
      corpsMeuble: info.corpsMeuble,
      quantite: info.quantite,
      designation: info.designation,
      createur: info.createur,
      numeroPlan: '',
    },
    dxfData: btoa(unescape(encodeURIComponent(fullDxfContent))),
    surfaceM2,
    perimetreM,
    boundingBox,
  };
}

/**
 * Calcule le bounding box depuis la géométrie ou les dimensions
 */
function calculateBoundingBoxFromGeometry(
  geometry: PanelInfo['geometry'],
  longueur: number,
  largeur: number
): DxfPanelExtracted['boundingBox'] {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;

  const processVertices = (vertices: { x?: number; y?: number }[]) => {
    for (const v of vertices) {
      if (typeof v.x === 'number' && typeof v.y === 'number') {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
        hasPoints = true;
      }
    }
  };

  // Process lines
  for (const line of geometry.lines) {
    if (line.vertices) {
      processVertices(line.vertices);
    }
  }

  // Process polylines
  for (const poly of geometry.polylines) {
    if (poly.vertices) {
      processVertices(poly.vertices);
    }
  }

  // Process circles
  for (const circle of geometry.circles) {
    if (circle.center && circle.radius) {
      minX = Math.min(minX, circle.center.x - circle.radius);
      minY = Math.min(minY, circle.center.y - circle.radius);
      maxX = Math.max(maxX, circle.center.x + circle.radius);
      maxY = Math.max(maxY, circle.center.y + circle.radius);
      hasPoints = true;
    }
  }

  // Si pas de géométrie, utiliser les dimensions
  if (!hasPoints) {
    return {
      minX: 0,
      minY: 0,
      maxX: longueur,
      maxY: largeur,
      width: longueur,
      height: largeur,
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convertit la géométrie au format DxfPanelGeometry
 */
function convertGeometry(geometry: PanelInfo['geometry']): DxfPanelGeometry {
  const polylines: DxfPolylineInfo[] = [];
  const circles: DxfCircleInfo[] = [];

  // Convertir les lignes en polylines (2 vertices chacune)
  for (const line of geometry.lines) {
    if (line.vertices?.length >= 2) {
      polylines.push({
        vertices: line.vertices.map((v: { x?: number; y?: number }) => ({
          x: v.x || 0,
          y: v.y || 0,
        })),
        closed: false,
        layer: line.layer || '0',
      });
    }
  }

  // Convertir les polylines
  for (const poly of geometry.polylines) {
    if (poly.vertices?.length >= 2) {
      polylines.push({
        vertices: poly.vertices.map((v: { x?: number; y?: number }) => ({
          x: v.x || 0,
          y: v.y || 0,
        })),
        closed: poly.shape === true || (poly.flags && (poly.flags & 1) === 1),
        layer: poly.layer || '0',
      });
    }
  }

  // Convertir les circles
  for (const circle of geometry.circles) {
    if (circle.center && circle.radius) {
      circles.push({
        x: circle.center.x,
        y: circle.center.y,
        radius: circle.radius,
        diameter: circle.radius * 2,
        layer: circle.layer || '0',
      });
    }
  }

  return {
    polylines,
    circles,
    arcsCount: 0,
    splinesCount: 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK: SINGLE PANEL
// ═══════════════════════════════════════════════════════════════

/**
 * Extrait un panneau unique (fallback quand pas de structure multi-panneaux)
 */
function extractSinglePanel(
  dxf: DxfParsed,
  fullDxfContent: string,
  fileName: string
): DxfPanelExtracted | null {

  if (!dxf?.entities) return null;

  // Collecter toutes les dimensions
  const dimensions: number[] = [];
  const collectDims = (entities: DxfEntity[]) => {
    for (const e of entities) {
      if (e.type === 'DIMENSION' && e.actualMeasurement > 0) {
        dimensions.push(e.actualMeasurement);
      }
    }
  };

  collectDims(dxf.entities);
  if (dxf.blocks) {
    for (const block of Object.values(dxf.blocks) as DxfBlock[]) {
      if (block.entities) {
        collectDims(block.entities);
      }
    }
  }

  // Extraire les 2 plus grandes dimensions
  const uniqueDims = Array.from(new Set(dimensions)).sort((a, b) => b - a);
  const longueur = uniqueDims[0] || 0;
  const largeur = uniqueDims[1] || longueur;

  if (longueur === 0) {
    // Fallback sur bounding box
    const boundingBox = calculateBoundingBoxFromEntities(dxf.entities);
    if (!boundingBox) return null;

    const dimLongueur = Math.max(boundingBox.width, boundingBox.height);
    const dimLargeur = Math.min(boundingBox.width, boundingBox.height);

    return createSinglePanelResult(dxf.entities, dimLongueur, dimLargeur, fullDxfContent, fileName);
  }

  return createSinglePanelResult(dxf.entities, longueur, largeur, fullDxfContent, fileName);
}

function createSinglePanelResult(
  entities: DxfEntity[],
  longueur: number,
  largeur: number,
  fullDxfContent: string,
  fileName: string
): DxfPanelExtracted {
  const geometry = extractGeometryFromEntities(entities);
  const boundingBox = {
    minX: 0, minY: 0,
    maxX: longueur, maxY: largeur,
    width: longueur, height: largeur,
  };

  const surfaceM2 = (longueur * largeur) / 1_000_000;
  const perimetreM = 2 * (longueur + largeur) / 1000;
  const reference = fileName.replace(/\.[dD][xX][fF]$/, '');

  return {
    reference,
    layerPrefix: '0',
    dimensions: {
      longueur: Math.round(longueur),
      largeur: Math.round(largeur),
      epaisseur: 19,
    },
    quantite: 1,
    geometry,
    titleBlockData: null,
    dxfData: btoa(unescape(encodeURIComponent(fullDxfContent))),
    surfaceM2,
    perimetreM,
    boundingBox,
  };
}

function calculateBoundingBoxFromEntities(entities: DxfEntity[]): DxfPanelExtracted['boundingBox'] | null {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  let hasPoints = false;

  for (const e of entities) {
    if (e.vertices) {
      for (const v of e.vertices) {
        if (typeof v.x === 'number' && typeof v.y === 'number') {
          minX = Math.min(minX, v.x);
          minY = Math.min(minY, v.y);
          maxX = Math.max(maxX, v.x);
          maxY = Math.max(maxY, v.y);
          hasPoints = true;
        }
      }
    }
    if (e.center && e.radius) {
      minX = Math.min(minX, e.center.x - e.radius);
      minY = Math.min(minY, e.center.y - e.radius);
      maxX = Math.max(maxX, e.center.x + e.radius);
      maxY = Math.max(maxY, e.center.y + e.radius);
      hasPoints = true;
    }
  }

  if (!hasPoints) return null;

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function extractGeometryFromEntities(entities: DxfEntity[]): DxfPanelGeometry {
  const polylines: DxfPolylineInfo[] = [];
  const circles: DxfCircleInfo[] = [];
  let arcsCount = 0;
  let splinesCount = 0;

  for (const e of entities) {
    switch (e.type) {
      case 'LINE':
        if (e.vertices?.length >= 2) {
          polylines.push({
            vertices: e.vertices.map((v: { x?: number; y?: number }) => ({ x: v.x || 0, y: v.y || 0 })),
            closed: false,
            layer: e.layer || '0',
          });
        }
        break;
      case 'LWPOLYLINE':
      case 'POLYLINE':
        if (e.vertices?.length >= 2) {
          polylines.push({
            vertices: e.vertices.map((v: { x?: number; y?: number }) => ({ x: v.x || 0, y: v.y || 0 })),
            closed: e.shape === true || (e.flags && (e.flags & 1) === 1),
            layer: e.layer || '0',
          });
        }
        break;
      case 'CIRCLE':
        if (e.center && e.radius) {
          circles.push({
            x: e.center.x, y: e.center.y,
            radius: e.radius, diameter: e.radius * 2,
            layer: e.layer || '0',
          });
        }
        break;
      case 'ARC':
        arcsCount++;
        break;
      case 'SPLINE':
        splinesCount++;
        break;
    }
  }

  return { polylines, circles, arcsCount, splinesCount };
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Décode les séquences Unicode escape (\U+XXXX) en caractères
 */
function decodeUnicodeEscapes(str: string): string {
  return str.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

/**
 * Normalise une chaîne pour comparaison (lowercase, sans accents)
 */
function normalizeString(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Extrait les infos globales depuis les panneaux
 */
function extractGlobalInfo(panels: PanelInfo[]): { projet: string; corpsMeuble: string } {
  for (const panel of panels) {
    if (panel.projet) {
      return {
        projet: panel.projet,
        corpsMeuble: panel.corpsMeuble || '',
      };
    }
  }

  // Essayer d'extraire depuis le layerPrefix
  for (const panel of panels) {
    const parts = panel.layerPrefix.split('_');
    if (parts.length >= 2) {
      return {
        projet: parts[0].replace(/^Nouveau /, ''),
        corpsMeuble: parts[1].replace(/^Nouveau /, ''),
      };
    }
  }

  return { projet: '', corpsMeuble: '' };
}

// ═══════════════════════════════════════════════════════════════
// SVG GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Génère un SVG miniature pour un panneau
 */
export function generatePanelSvg(panel: DxfPanelExtracted, options?: {
  width?: number;
  height?: number;
  showDrillings?: boolean;
}): string {
  const { width = 100, height = 100, showDrillings = true } = options || {};
  const { dimensions, geometry } = panel;

  // Utiliser les dimensions du panneau pour le viewBox
  const longueur = dimensions.longueur || 100;
  const largeur = dimensions.largeur || 100;
  const margin = Math.max(longueur, largeur) * 0.05;

  const viewBox = `${-margin} ${-margin} ${longueur + margin * 2} ${largeur + margin * 2}`;

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}" style="transform: scaleY(-1)">`;

  // Background rect représentant le panneau
  svgContent += `<rect x="0" y="0" width="${longueur}" height="${largeur}" fill="rgba(212, 168, 75, 0.15)" stroke="#d4a84b" stroke-width="${longueur * 0.01}"/>`;

  // Polylines (contours, usinages)
  for (const polyline of geometry.polylines) {
    if (polyline.vertices.length > 1) {
      const points = polyline.vertices.map(v => `${v.x},${v.y}`).join(' ');
      svgContent += `<polyline points="${points}" fill="none" stroke="#666" stroke-width="${longueur * 0.005}"/>`;
    }
  }

  // Circles (perçages)
  if (showDrillings && geometry.circles.length > 0) {
    for (const circle of geometry.circles) {
      svgContent += `<circle cx="${circle.x}" cy="${circle.y}" r="${circle.radius}" fill="none" stroke="#e74c3c" stroke-width="${longueur * 0.003}"/>`;
    }
  }

  svgContent += '</svg>';

  return svgContent;
}
