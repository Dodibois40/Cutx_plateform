// lib/caissons/dxf-generator.ts
// Generateur de fichiers DXF professionnels avec Maker.js
// Pour export CNC des panneaux de caisson

import makerjs from 'makerjs';
import type { ConfigCaisson, ResultatCalculCaisson, PanneauCalcule } from './types';
import {
  SYSTEM32,
  CHARNIERES,
  MINIFIX,
  CONFIRMAT,
  RAINURES,
  calculerTrousSystem32,
  calculerNombreCharnieres,
  calculerDistanceRainure,
} from '@/components/configurateur/caissons/vues-techniques/constants';
import type { TypeEmbaseBlum } from './blum-hardware';
import {
  calculerTousPercagesCharnieres,
  type PercageAbsolu,
  type ResultatPercagesCharnieres,
} from './calcul-percages';

// ============================================================================
// TYPES
// ============================================================================

interface DxfOptions {
  includeSystem32: boolean;
  includeAssemblage: boolean;
  includeRainure: boolean;
  includeCotations: boolean;
  includeHingeDrillings: boolean;
  typeAssemblage: 'minifix' | 'confirmat' | 'tourillon';
  typeEmbase: TypeEmbaseBlum;
  units: 'mm' | 'cm';
}

interface PanelDxf {
  nom: string;
  nomCourt: string;
  dxfContent: string;
  largeur: number;
  longueur: number;
}

// ============================================================================
// CONSTANTES LAYERS DXF (standards industriels)
// ============================================================================

const LAYERS = {
  CONTOUR: 'CONTOUR',           // Contour de decoupe
  DRILLING_5MM: 'DRILLING_5MM', // Percages System 32 (5mm) / Vis Wing
  DRILLING_8MM: 'DRILLING_8MM', // Percages INSERTA (8mm) / tourillons/confirmat
  DRILLING_10MM: 'DRILLING_10MM', // Percages embase pilote (10mm)
  DRILLING_15MM: 'DRILLING_15MM', // Percages Minifix (15mm)
  DRILLING_35MM: 'DRILLING_35MM', // Percages charnieres cup (35mm)
  RAINURE: 'RAINURE',           // Rainures
  COTATIONS: 'COTATIONS',       // Cotations
  TEXTE: 'TEXTE',               // Annotations texte
};

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Cree un cercle de percage
 */
function createDrillingHole(
  x: number,
  y: number,
  diameter: number
): makerjs.IModel {
  return new makerjs.models.Ellipse(diameter / 2, diameter / 2);
}

/**
 * Cree une grille de trous System 32
 */
function createSystem32Pattern(
  hauteur: number,
  profondeur: number,
  rangeeAvant: boolean = true,
  rangeeArriere: boolean = true
): makerjs.IModel {
  const model: makerjs.IModel = { models: {} };

  // Premier trou a 37mm du bas
  const premierTrou = SYSTEM32.premierTrouOffset;
  const nombreTrous = Math.floor((hauteur - premierTrou - 32) / SYSTEM32.espacementTrous) + 1;

  for (let i = 0; i < nombreTrous; i++) {
    const y = premierTrou + i * SYSTEM32.espacementTrous;

    // Rangee avant (37mm du bord avant)
    if (rangeeAvant) {
      const xAvant = profondeur - SYSTEM32.distanceBordAvant;
      const hole = createDrillingHole(0, 0, SYSTEM32.diametreTrouSysteme);
      makerjs.model.move(hole, [xAvant, y]);
      model.models![`hole_front_${i}`] = hole;
    }

    // Rangee arriere (37mm du bord arriere)
    if (rangeeArriere) {
      const xArriere = SYSTEM32.distanceBordArriere;
      const hole = createDrillingHole(0, 0, SYSTEM32.diametreTrouSysteme);
      makerjs.model.move(hole, [xArriere, y]);
      model.models![`hole_rear_${i}`] = hole;
    }
  }

  return model;
}

/**
 * Cree les percages Minifix pour assemblage
 */
function createMinifixHoles(
  largeur: number,
  distanceBord: number = 50
): makerjs.IModel {
  const model: makerjs.IModel = { models: {} };

  // 2 Minifix par jonction: a 50mm de chaque bord
  const positions = [distanceBord, largeur - distanceBord];

  positions.forEach((x, i) => {
    const hole = createDrillingHole(0, 0, MINIFIX.diametreLogement);
    makerjs.model.move(hole, [x, MINIFIX.distanceBord24]);
    model.models![`minifix_${i}`] = hole;
  });

  return model;
}

/**
 * Cree les percages Confirmat
 */
function createConfirmatHoles(
  largeur: number,
  distanceBord: number = 50
): makerjs.IModel {
  const model: makerjs.IModel = { models: {} };

  const positions = [distanceBord, largeur - distanceBord];

  positions.forEach((x, i) => {
    const hole = createDrillingHole(0, 0, CONFIRMAT.diametreAvantTrouFace);
    makerjs.model.move(hole, [x, 9]); // 9mm du bord (centre dans 18mm)
    model.models![`confirmat_${i}`] = hole;
  });

  return model;
}

/**
 * Cree une rainure pour le fond
 */
function createRainure(
  longueur: number,
  epaisseurFond: number,
  distanceBord: number
): makerjs.IModel {
  const largeurRainure = epaisseurFond + RAINURES.toleranceLargeur;

  // Rainure = rectangle
  const rainure = new makerjs.models.Rectangle(longueur, largeurRainure);
  makerjs.model.move(rainure, [0, distanceBord - largeurRainure / 2]);

  return rainure;
}

/**
 * Cree les percages pour charnieres (cups 35mm)
 */
function createHingeHoles(
  hauteur: number,
  cote: 'gauche' | 'droite',
  largeur: number
): makerjs.IModel {
  const model: makerjs.IModel = { models: {} };

  const nombreCharnieres = calculerNombreCharnieres(hauteur);
  const x = cote === 'gauche'
    ? CHARNIERES.distanceBordPorte
    : largeur - CHARNIERES.distanceBordPorte;

  const espacement = nombreCharnieres > 1
    ? (hauteur - 2 * CHARNIERES.distanceHautBas) / (nombreCharnieres - 1)
    : 0;

  for (let i = 0; i < nombreCharnieres; i++) {
    const y = CHARNIERES.distanceHautBas + i * espacement;
    const cup = createDrillingHole(0, 0, CHARNIERES.diametreCup);
    makerjs.model.move(cup, [x, y]);
    model.models![`hinge_cup_${i}`] = cup;

    // Trous de vis (45mm d'espacement, 9.5mm derriere le cup)
    const xVis = cote === 'gauche'
      ? x + CHARNIERES.distanceVisCentre
      : x - CHARNIERES.distanceVisCentre;

    const vis1 = createDrillingHole(0, 0, CHARNIERES.diametreVis);
    makerjs.model.move(vis1, [xVis, y - CHARNIERES.distanceVis / 2]);
    model.models![`hinge_screw_${i}_1`] = vis1;

    const vis2 = createDrillingHole(0, 0, CHARNIERES.diametreVis);
    makerjs.model.move(vis2, [xVis, y + CHARNIERES.distanceVis / 2]);
    model.models![`hinge_screw_${i}_2`] = vis2;
  }

  return model;
}

/**
 * Cree les percages charnieres PRECIS depuis calcul-percages
 * Utilise les coordonnees exactes calculees
 */
function createPreciseHingeDrillings(
  percages: PercageAbsolu[]
): makerjs.IModel {
  const model: makerjs.IModel = { models: {} };

  percages.forEach((percage, index) => {
    const hole = createDrillingHole(0, 0, percage.diametre);
    makerjs.model.move(hole, [percage.x, percage.y]);

    // Nommer selon le type pour le layer
    const prefix = percage.type.replace('_', '').replace('mm', '');
    model.models![`${prefix}_${index}`] = hole;
  });

  return model;
}

/**
 * Cree les percages embases PRECIS sur un cote
 */
function createPreciseEmbaseDrillings(
  percages: PercageAbsolu[]
): makerjs.IModel {
  const model: makerjs.IModel = { models: {} };

  percages.forEach((percage, index) => {
    const hole = createDrillingHole(0, 0, percage.diametre);
    makerjs.model.move(hole, [percage.x, percage.y]);

    const prefix = percage.type === 'pilote_10mm' ? 'pilote' : 'vis';
    model.models![`${prefix}_${index}`] = hole;
  });

  return model;
}

/**
 * Cree une ligne de cotation
 */
function createDimensionLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number = 15
): makerjs.IModel {
  const model: makerjs.IModel = { paths: {} };

  const isHorizontal = Math.abs(y2 - y1) < 0.01;

  if (isHorizontal) {
    // Ligne de cotation horizontale
    const yLine = y1 + offset;

    // Lignes d'extension
    model.paths!['ext1'] = new makerjs.paths.Line([x1, y1], [x1, yLine]);
    model.paths!['ext2'] = new makerjs.paths.Line([x2, y2], [x2, yLine]);

    // Ligne de cote
    model.paths!['dim'] = new makerjs.paths.Line([x1, yLine], [x2, yLine]);

    // Fleches (triangles simples)
    const arrowSize = 3;
    model.paths!['arrow1a'] = new makerjs.paths.Line([x1, yLine], [x1 + arrowSize, yLine + arrowSize / 2]);
    model.paths!['arrow1b'] = new makerjs.paths.Line([x1, yLine], [x1 + arrowSize, yLine - arrowSize / 2]);
    model.paths!['arrow2a'] = new makerjs.paths.Line([x2, yLine], [x2 - arrowSize, yLine + arrowSize / 2]);
    model.paths!['arrow2b'] = new makerjs.paths.Line([x2, yLine], [x2 - arrowSize, yLine - arrowSize / 2]);
  } else {
    // Ligne de cotation verticale
    const xLine = x1 + offset;

    model.paths!['ext1'] = new makerjs.paths.Line([x1, y1], [xLine, y1]);
    model.paths!['ext2'] = new makerjs.paths.Line([x2, y2], [xLine, y2]);
    model.paths!['dim'] = new makerjs.paths.Line([xLine, y1], [xLine, y2]);

    const arrowSize = 3;
    model.paths!['arrow1a'] = new makerjs.paths.Line([xLine, y1], [xLine + arrowSize / 2, y1 + arrowSize]);
    model.paths!['arrow1b'] = new makerjs.paths.Line([xLine, y1], [xLine - arrowSize / 2, y1 + arrowSize]);
    model.paths!['arrow2a'] = new makerjs.paths.Line([xLine, y2], [xLine + arrowSize / 2, y2 - arrowSize]);
    model.paths!['arrow2b'] = new makerjs.paths.Line([xLine, y2], [xLine - arrowSize / 2, y2 - arrowSize]);
  }

  return model;
}

// ============================================================================
// GENERATION DXF PAR TYPE DE PANNEAU
// ============================================================================

/**
 * Genere le DXF pour un panneau lateral (cote gauche ou droit)
 */
function generateCoteDxf(
  panneau: PanneauCalcule,
  config: ConfigCaisson,
  options: DxfOptions,
  percagesCharnieres?: ResultatPercagesCharnieres
): makerjs.IModel {
  const { longueur, largeur } = panneau; // longueur = hauteur, largeur = profondeur

  const model: makerjs.IModel = {
    models: {},
    paths: {},
  };

  // Contour du panneau
  const contour = new makerjs.models.Rectangle(largeur, longueur);
  model.models!['contour'] = contour;

  // System 32 (trous 5mm)
  if (options.includeSystem32) {
    const system32 = createSystem32Pattern(longueur, largeur, true, true);
    model.models!['system32'] = system32;
  }

  // Assemblage haut et bas
  if (options.includeAssemblage) {
    if (options.typeAssemblage === 'minifix') {
      // Minifix en haut
      const minifixHaut = createMinifixHoles(largeur, 50);
      makerjs.model.move(minifixHaut, [0, longueur - MINIFIX.distanceBord24 * 2]);
      model.models!['minifix_haut'] = minifixHaut;

      // Minifix en bas
      const minifixBas = createMinifixHoles(largeur, 50);
      model.models!['minifix_bas'] = minifixBas;
    } else if (options.typeAssemblage === 'confirmat') {
      // Confirmat en haut
      const confirmatHaut = createConfirmatHoles(largeur, 50);
      makerjs.model.move(confirmatHaut, [0, longueur - 18]);
      model.models!['confirmat_haut'] = confirmatHaut;

      // Confirmat en bas
      const confirmatBas = createConfirmatHoles(largeur, 50);
      model.models!['confirmat_bas'] = confirmatBas;
    }
  }

  // Rainure pour fond
  if (options.includeRainure && (config.typeFond === 'rainure' || config.typeFond === 'encastre')) {
    const distanceRainure = calculerDistanceRainure(config.epaisseurFond);
    const rainure = createRainure(longueur, config.epaisseurFond, distanceRainure);
    makerjs.model.rotate(rainure, 90, [0, 0]);
    makerjs.model.move(rainure, [distanceRainure, 0]);
    model.models!['rainure'] = rainure;
  }

  // Percages embases charnieres (PRECIS)
  if (options.includeHingeDrillings && percagesCharnieres && config.avecFacade) {
    const cote = panneau.nomCourt === 'CTG' ? 'gauche' : 'droite';
    const percagesCote = cote === 'gauche'
      ? percagesCharnieres.percages.coteGauche
      : percagesCharnieres.percages.coteDroit;

    if (percagesCote.length > 0) {
      const embaseDrillings = createPreciseEmbaseDrillings(percagesCote);
      model.models!['embase_drillings'] = embaseDrillings;
    }
  }

  // Cotations
  if (options.includeCotations) {
    // Cotation largeur (profondeur)
    const cotLargeur = createDimensionLine(0, 0, largeur, 0, -20);
    model.models!['cot_largeur'] = cotLargeur;

    // Cotation longueur (hauteur)
    const cotLongueur = createDimensionLine(0, 0, 0, longueur, -20);
    model.models!['cot_longueur'] = cotLongueur;
  }

  return model;
}

/**
 * Genere le DXF pour le panneau haut ou bas
 */
function generateHautBasDxf(
  panneau: PanneauCalcule,
  config: ConfigCaisson,
  options: DxfOptions,
  position: 'haut' | 'bas'
): makerjs.IModel {
  const { longueur, largeur } = panneau; // longueur = largeur int, largeur = profondeur

  const model: makerjs.IModel = {
    models: {},
    paths: {},
  };

  // Contour du panneau
  const contour = new makerjs.models.Rectangle(longueur, largeur);
  model.models!['contour'] = contour;

  // Percages dans les chants (pour assemblage aux cotes)
  // Ces trous sont dans le chant, donc on les represente comme des cercles sur le bord
  if (options.includeAssemblage) {
    if (options.typeAssemblage === 'minifix') {
      // Trous boulon Minifix sur les chants gauche et droit
      const boulonGauche = createDrillingHole(0, 0, MINIFIX.diametreBoulon5);
      makerjs.model.move(boulonGauche, [0, 50]);
      model.models!['boulon_g1'] = boulonGauche;

      const boulonGauche2 = createDrillingHole(0, 0, MINIFIX.diametreBoulon5);
      makerjs.model.move(boulonGauche2, [0, largeur - 50]);
      model.models!['boulon_g2'] = boulonGauche2;

      const boulonDroit = createDrillingHole(0, 0, MINIFIX.diametreBoulon5);
      makerjs.model.move(boulonDroit, [longueur, 50]);
      model.models!['boulon_d1'] = boulonDroit;

      const boulonDroit2 = createDrillingHole(0, 0, MINIFIX.diametreBoulon5);
      makerjs.model.move(boulonDroit2, [longueur, largeur - 50]);
      model.models!['boulon_d2'] = boulonDroit2;
    }
  }

  // Rainure pour fond (sur le panneau bas uniquement)
  if (options.includeRainure && position === 'bas' && (config.typeFond === 'rainure' || config.typeFond === 'encastre')) {
    const distanceRainure = calculerDistanceRainure(config.epaisseurFond);
    const rainure = createRainure(longueur, config.epaisseurFond, distanceRainure);
    model.models!['rainure'] = rainure;
  }

  // Cotations
  if (options.includeCotations) {
    const cotLargeur = createDimensionLine(0, 0, longueur, 0, -20);
    model.models!['cot_largeur'] = cotLargeur;

    const cotLongueur = createDimensionLine(0, 0, 0, largeur, -20);
    model.models!['cot_longueur'] = cotLongueur;
  }

  return model;
}

/**
 * Genere le DXF pour le fond
 */
function generateFondDxf(
  panneau: PanneauCalcule,
  config: ConfigCaisson,
  options: DxfOptions
): makerjs.IModel {
  const { longueur, largeur } = panneau;

  const model: makerjs.IModel = {
    models: {},
  };

  // Contour simple du fond
  const contour = new makerjs.models.Rectangle(longueur, largeur);
  model.models!['contour'] = contour;

  // Cotations
  if (options.includeCotations) {
    const cotLargeur = createDimensionLine(0, 0, longueur, 0, -15);
    model.models!['cot_largeur'] = cotLargeur;

    const cotLongueur = createDimensionLine(0, 0, 0, largeur, -15);
    model.models!['cot_longueur'] = cotLongueur;
  }

  return model;
}

/**
 * Genere le DXF pour une facade avec percages PRECIS
 */
function generateFacadeDxf(
  panneau: PanneauCalcule,
  config: ConfigCaisson,
  options: DxfOptions,
  percagesCharnieres?: ResultatPercagesCharnieres
): makerjs.IModel {
  const { longueur, largeur } = panneau; // longueur = hauteur, largeur = largeur

  const model: makerjs.IModel = {
    models: {},
  };

  // Contour de la facade
  const contour = new makerjs.models.Rectangle(largeur, longueur);
  model.models!['contour'] = contour;

  // Percages charnieres (PRECIS si disponible, sinon legacy)
  if (options.includeHingeDrillings && percagesCharnieres) {
    // Utiliser les percages precis du module calcul-percages
    const hingeDrillings = createPreciseHingeDrillings(percagesCharnieres.percages.facade);
    model.models!['hinges_precise'] = hingeDrillings;
  } else {
    // Fallback: ancien systeme (cups 35mm seulement)
    const hingeHoles = createHingeHoles(
      longueur,
      config.positionCharniere,
      largeur
    );
    model.models!['hinges'] = hingeHoles;
  }

  // Cotations
  if (options.includeCotations) {
    const cotLargeur = createDimensionLine(0, 0, largeur, 0, -25);
    model.models!['cot_largeur'] = cotLargeur;

    const cotLongueur = createDimensionLine(0, 0, 0, longueur, -25);
    model.models!['cot_longueur'] = cotLongueur;
  }

  return model;
}

// ============================================================================
// API PRINCIPALE
// ============================================================================

/**
 * Genere tous les fichiers DXF pour un caisson avec percages precis
 */
export function generateCaissonDxf(
  config: ConfigCaisson,
  resultat: ResultatCalculCaisson,
  options: Partial<DxfOptions> = {}
): PanelDxf[] {
  const defaultOptions: DxfOptions = {
    includeSystem32: true,
    includeAssemblage: true,
    includeRainure: true,
    includeCotations: true,
    includeHingeDrillings: true,
    typeAssemblage: 'minifix',
    typeEmbase: config.typeEmbase || 'EXPANDO_0mm',
    units: 'mm',
  };

  const opts = { ...defaultOptions, ...options };
  const dxfFiles: PanelDxf[] = [];

  // Calculer les percages charnieres si necessaire
  let percagesCharnieres: ResultatPercagesCharnieres | undefined;
  if (opts.includeHingeDrillings && config.avecFacade) {
    percagesCharnieres = calculerTousPercagesCharnieres(config, opts.typeEmbase);
  }

  for (const panneau of resultat.panneaux) {
    let model: makerjs.IModel;

    // Generer le modele selon le type de panneau
    switch (panneau.nomCourt) {
      case 'CTG':
      case 'CTD':
        model = generateCoteDxf(panneau, config, opts, percagesCharnieres);
        break;
      case 'PHT':
        model = generateHautBasDxf(panneau, config, opts, 'haut');
        break;
      case 'PBS':
        model = generateHautBasDxf(panneau, config, opts, 'bas');
        break;
      case 'FND':
        model = generateFondDxf(panneau, config, opts);
        break;
      case 'FAC':
        model = generateFacadeDxf(panneau, config, opts, percagesCharnieres);
        break;
      default:
        // Panneau generique (contour seulement)
        model = {
          models: {
            contour: new makerjs.models.Rectangle(panneau.longueur, panneau.largeur),
          },
        };
    }

    // Ajouter les unites
    model.units = opts.units === 'mm'
      ? makerjs.unitType.Millimeter
      : makerjs.unitType.Centimeter;

    // Exporter en DXF
    const dxfContent = makerjs.exporter.toDXF(model, {
      units: opts.units === 'mm'
        ? makerjs.unitType.Millimeter
        : makerjs.unitType.Centimeter,
    });

    dxfFiles.push({
      nom: panneau.nom,
      nomCourt: panneau.nomCourt,
      dxfContent,
      largeur: panneau.largeur,
      longueur: panneau.longueur,
    });
  }

  return dxfFiles;
}

/**
 * Telecharge tous les DXF dans un fichier ZIP
 */
export async function downloadDxfZip(
  dxfFiles: PanelDxf[],
  nomCaisson: string = 'caisson'
): Promise<void> {
  // Import dynamique de JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Ajouter chaque fichier DXF au ZIP
  dxfFiles.forEach((file, index) => {
    const fileName = `${file.nomCourt}_${file.longueur}x${file.largeur}.dxf`;
    zip.file(fileName, file.dxfContent);
  });

  // Generer et telecharger le ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomCaisson}_plans_dxf.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Telecharge un seul fichier DXF
 */
export function downloadSingleDxf(dxfFile: PanelDxf): void {
  const blob = new Blob([dxfFile.dxfContent], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${dxfFile.nomCourt}_${dxfFile.longueur}x${dxfFile.largeur}.dxf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
