// vues-techniques/constants.ts
// Constantes pour les vues techniques 2D du configurateur caisson
//
// SOURCES TECHNIQUES:
// - Wikipedia: 32mm Cabinetmaking System (https://en.wikipedia.org/wiki/32_mm_cabinetmaking_system)
// - WoodWeb: Methods of 32mm System Layout (https://woodweb.com/knowledge_base/Methods_of_32_mm_system_layout.html)
// - WoodWeb: Blum Hinge Drilling Locations (https://woodweb.com/knowledge_base/Blum_hinge_drilling_locations.html)
// - Hafele: Minifix 15 Specifications (https://www.hafele.com/us/en/product/connector-housing-minifix-15/)
// - dprojects/Woodworking FreeCAD (https://github.com/dprojects/Woodworking)

// Couleurs des elements
export const COULEURS = {
  // Structure
  structure: '#4a5568',       // Gris structure (cotes, haut, bas)
  structureFill: '#e2e8f0',   // Remplissage structure
  structureStroke: '#2d3748', // Contour structure

  // Fond
  fond: '#718096',            // Gris clair fond
  fondFill: '#cbd5e0',        // Remplissage fond
  fondStroke: '#4a5568',      // Contour fond

  // Facade
  facade: '#2b6cb0',          // Bleu facade
  facadeFill: 'rgba(66, 153, 225, 0.3)', // Remplissage transparent
  facadeStroke: '#2b6cb0',    // Contour facade

  // Rainure / Feuillure
  rainure: '#e53e3e',         // Rouge rainure
  rainureStroke: '#c53030',   // Contour rainure

  // Cotations
  cotation: '#1a202c',        // Noir cotations
  cotationText: '#2d3748',    // Texte cotations
  extension: '#a0aec0',       // Gris lignes extension

  // System 32 / Percages
  percage: '#d69e2e',         // Or percages
  percageFill: '#faf089',     // Remplissage percage
  lignePercage: '#ed8936',    // Ligne de percage

  // Charnieres
  charniere: '#38a169',       // Vert charnieres
  charniereFill: '#9ae6b4',   // Remplissage charniere

  // Fond SVG
  background: '#f7fafc',      // Fond clair
  grid: '#e2e8f0',            // Grille

  // Annotations
  annotation: '#805ad5',      // Violet annotations
};

// Epaisseurs de traits
export const STROKE_WIDTH = {
  contour: 2,                 // Contour principal
  structure: 1.5,             // Elements structure
  fond: 1,                    // Fond
  facade: 1.5,                // Facade (pointille)
  cotation: 0.75,             // Lignes de cotation
  extension: 0.5,             // Lignes d'extension
  rainure: 1,                 // Rainure
  percage: 0.75,              // Cercles percage
  charniere: 1,               // Cercles charniere
};

// ============================================================================
// SYSTEM 32 - Standard international de percage (32mm Cabinetmaking System)
// Source: Wikipedia, WoodWeb, Blum documentation
// ============================================================================
export const SYSTEM32 = {
  // Rangee avant (front row)
  distanceBordAvant: 37,      // mm - centre du trou au bord avant du panneau
  // Rangee arriere (rear row)
  distanceBordArriere: 37,    // mm - centre du trou au bord arriere (ou multiple de 32)
  // Espacement vertical entre trous
  espacementTrous: 32,        // mm - standard System 32
  // Trous systeme (shelf pins, hinges)
  diametreTrouSysteme: 5,     // mm - diametre standard
  profondeurTrouSysteme: 13,  // mm - profondeur recommandee (12.5-14mm)
  // Trous construction (dowels, confirmats)
  diametreTrouConstruction: 8, // mm - pour tourillons 8mm
  profondeurTrouConstruction: 12, // mm
  // Premier trou depuis le bord
  premierTrouOffset: 37,      // mm depuis le bas du panneau (ou 32+5)
  // Alias pour compatibilite
  diametreTrou: 5,            // mm (legacy)
};

// ============================================================================
// CHARNIERES BLUM CLIP TOP
// Source: WoodWeb, Blum catalogue, specifications officielles
// ============================================================================
export const CHARNIERES = {
  // Position sur la porte (facade)
  distanceBordPorte: 23,      // mm - distance bord porte au centre cup (frameless)
  distanceBordPorteMin: 3,    // mm - minimum (125°)
  distanceBordPorteMax: 8,    // mm - maximum (170°)
  // Position sur le cote du caisson
  distanceBord: 21.5,         // mm - du bord vertical du cote
  // Distances haut/bas de la facade
  distanceHautBas: 100,       // mm - premiere charniere depuis bord haut/bas
  // Percage cup (Forstner)
  diametreCup: 35,            // mm - diametre standard europeen
  profondeurCup: 11.7,        // mm - profondeur percage (peut aller jusqu'a 13mm)
  // Vis de fixation
  distanceVis: 45,            // mm - espacement entre les 2 vis
  distanceVisCentre: 9.5,     // mm - centre cup au centre des vis
  diametreVis: 3.5,           // mm - pre-percage vis
  // Nombre de charnieres selon hauteur facade
  seuilCharniere2: 600,       // mm - 2 charnieres jusqu'a cette hauteur
  seuilCharniere3: 1000,      // mm - 3 charnieres jusqu'a cette hauteur
  seuilCharniere4: 1400,      // mm - 4 charnieres jusqu'a cette hauteur
  seuilCharniere5: 1800,      // mm - 5 charnieres jusqu'a cette hauteur
};

// ============================================================================
// MINIFIX 15 - Connecteur excentrique Hafele
// Source: Hafele specifications officielles
// ============================================================================
export const MINIFIX = {
  // Logement (housing)
  diametreLogement: 15,       // mm - percage principal
  profondeurLogement: 12.5,   // mm - profondeur standard (+0.5mm tolerance)
  diametreCollerette: 16.5,   // mm - pour versions avec collerette
  // Boulon de connexion
  diametreBoulon5: 5,         // mm - boulon standard
  diametreBoulon7: 7,         // mm - boulon renforce
  diametreBoulon8: 8,         // mm - boulon large
  // Distance du bord
  distanceBord24: 24,         // mm - pour boulon 5mm
  distanceBord34: 34,         // mm - pour boulon 7/8mm
  // Epaisseur minimale panneau
  epaisseurMin16: 16,         // mm - pour profondeur 12.5mm
  epaisseurMin19: 19,         // mm - pour profondeur 14mm+
};

// ============================================================================
// VIS CONFIRMAT (Euroscrew)
// Source: Standards industriels, dprojects/Woodworking
// ============================================================================
export const CONFIRMAT = {
  // Percage face (dans le panneau qui recoit la tete)
  diametreAvantTrouFace: 8,   // mm - fraisure/degagement tete
  // Percage chant (dans le panneau perpendiculaire)
  diametreAvantTrouChant: 5,  // mm - avant-trou
  // Dimensions vis courantes
  vis5x50: { diametre: 5, longueur: 50, profondeurPercage: 45 },
  vis7x50: { diametre: 7, longueur: 50, profondeurPercage: 45 },
  vis7x70: { diametre: 7, longueur: 70, profondeurPercage: 65 },
};

// ============================================================================
// TOURILLONS (Dowels)
// Source: Standards DIN, dprojects/Woodworking
// ============================================================================
export const TOURILLONS = {
  // Tourillon 6mm
  diametre6: { diametre: 6, profondeur: 25, espacement: 32 },
  // Tourillon 8mm (standard)
  diametre8: { diametre: 8, profondeur: 30, espacement: 32 },
  // Tourillon 10mm
  diametre10: { diametre: 10, profondeur: 35, espacement: 64 },
};

// ============================================================================
// COULISSES BLUM TANDEM
// Source: Blum specifications, WoodWeb
// ============================================================================
export const TANDEM = {
  // Retrait du bord avant
  retraitAvant: 3,            // mm - standard
  retraitAvantEdge: 4,        // mm - version TANDEM Edge
  // Trou arriere tiroir (pour crochet)
  diametreTrouArriere: 6,     // mm
  profondeurTrouArriere: 10,  // mm
  // Encoche arriere
  hauteurEncoche: 12.7,       // mm (1/2")
  largeurEncoche: 35,         // mm minimum
  // Calcul largeur tiroir: ouverture - 42mm
  reductionLargeur: 42,       // mm a soustraire de l'ouverture
};

// ============================================================================
// RAINURES POUR FOND
// Source: Standards menuiserie, pratiques industrielles
// ============================================================================
export const RAINURES = {
  // Position depuis le bord arriere
  distanceBordFond3: 10,      // mm - pour fond 3mm HDF
  distanceBordFond5: 12,      // mm - pour fond 5mm CP
  distanceBordFond8: 15,      // mm - pour fond 8mm MDF
  // Largeur rainure = epaisseur fond + 1mm
  toleranceLargeur: 1,        // mm
  // Profondeur rainure
  profondeurStandard: 10,     // mm
};

// Taille des fleches de cotation
export const FLECHE = {
  width: 8,
  height: 4,
};

// Padding autour des vues
export const PADDING = {
  cotation: 40,               // Espace pour les cotations
  vue: 20,                    // Padding interne vue
  entreVues: 30,              // Espace entre vues
};

// Taille des labels
export const FONT_SIZE = {
  dimension: 11,              // Taille valeur cotation
  unite: 9,                   // Taille "mm"
  label: 10,                  // Labels (epaisseur, etc.)
  titre: 12,                  // Titre de vue
};

// Styles de traits
export const DASH_PATTERNS = {
  facade: '4,3',              // Facade en pointilles
  rainure: '2,2',             // Rainure
  axe: '8,4,2,4',             // Axe (trait mixte)
  extension: '1,2',           // Extension cotation
};

// Calcul echelle automatique
export function calculerEchelle(
  dimensionReelle: number,    // en mm
  dimensionDisponible: number, // en pixels
  paddingTotal: number = 80   // padding en pixels
): number {
  return (dimensionDisponible - paddingTotal) / dimensionReelle;
}

// Formater une dimension pour affichage
export function formaterDimension(valeur: number): string {
  if (valeur >= 1000) {
    return `${(valeur / 1000).toFixed(2)} m`;
  }
  if (Number.isInteger(valeur)) {
    return `${valeur}`;
  }
  return valeur.toFixed(1);
}

// ============================================================================
// FONCTIONS DE CALCUL DES PERCAGES (basees sur standards reels)
// ============================================================================

/**
 * Type de percage avec position et specifications
 */
export interface PercagePosition {
  x: number;          // mm - position horizontale depuis bord gauche
  y: number;          // mm - position verticale depuis bord bas
  diametre: number;   // mm
  profondeur: number; // mm
  type: 'system32' | 'construction' | 'charniere' | 'minifix' | 'confirmat';
  face: 'face' | 'chant'; // surface percee
}

/**
 * Calcule les positions des trous System 32 sur un panneau lateral
 * @param hauteurPanneau - hauteur du panneau en mm
 * @param profondeurPanneau - profondeur du panneau en mm
 * @param rangeeAvant - activer la rangee avant (37mm du bord avant)
 * @param rangeeArriere - activer la rangee arriere (37mm du bord arriere)
 */
export function calculerTrousSystem32(
  hauteurPanneau: number,
  profondeurPanneau: number,
  rangeeAvant = true,
  rangeeArriere = true
): PercagePosition[] {
  const trous: PercagePosition[] = [];

  // Premier trou a 37mm du bas (ou multiple de 32 proche de 37)
  const premierTrou = SYSTEM32.premierTrouOffset;
  // Nombre de trous = (hauteur - premierTrou - marge) / 32
  const nombreTrous = Math.floor((hauteurPanneau - premierTrou - 32) / SYSTEM32.espacementTrous) + 1;

  for (let i = 0; i < nombreTrous; i++) {
    const y = premierTrou + i * SYSTEM32.espacementTrous;

    // Rangee avant (37mm du bord avant = profondeur - 37)
    if (rangeeAvant) {
      trous.push({
        x: profondeurPanneau - SYSTEM32.distanceBordAvant,
        y,
        diametre: SYSTEM32.diametreTrouSysteme,
        profondeur: SYSTEM32.profondeurTrouSysteme,
        type: 'system32',
        face: 'face',
      });
    }

    // Rangee arriere (37mm du bord arriere)
    if (rangeeArriere) {
      trous.push({
        x: SYSTEM32.distanceBordArriere,
        y,
        diametre: SYSTEM32.diametreTrouSysteme,
        profondeur: SYSTEM32.profondeurTrouSysteme,
        type: 'system32',
        face: 'face',
      });
    }
  }

  return trous;
}

/**
 * Calcule le nombre de charnieres selon la hauteur de facade (standard Blum)
 * @param hauteurFacade - hauteur de la facade en mm
 */
export function calculerNombreCharnieres(hauteurFacade: number): number {
  if (hauteurFacade <= CHARNIERES.seuilCharniere2) return 2;
  if (hauteurFacade <= CHARNIERES.seuilCharniere3) return 3;
  if (hauteurFacade <= CHARNIERES.seuilCharniere4) return 4;
  if (hauteurFacade <= CHARNIERES.seuilCharniere5) return 5;
  return 6;
}

/**
 * Calcule les positions des cups de charnieres sur une facade
 * @param hauteurFacade - hauteur de la facade en mm
 * @param coteCharniere - 'gauche' ou 'droite'
 * @param largeurFacade - largeur de la facade en mm
 */
export function calculerPositionsCharnieres(
  hauteurFacade: number,
  coteCharniere: 'gauche' | 'droite',
  largeurFacade: number
): PercagePosition[] {
  const nombreCharnieres = calculerNombreCharnieres(hauteurFacade);
  const charnieres: PercagePosition[] = [];

  // Position X: 23mm du bord (standard frameless)
  const x = coteCharniere === 'gauche'
    ? CHARNIERES.distanceBordPorte
    : largeurFacade - CHARNIERES.distanceBordPorte;

  // Espacement uniforme entre charnieres
  const espacement = nombreCharnieres > 1
    ? (hauteurFacade - 2 * CHARNIERES.distanceHautBas) / (nombreCharnieres - 1)
    : 0;

  for (let i = 0; i < nombreCharnieres; i++) {
    const y = CHARNIERES.distanceHautBas + i * espacement;

    // Cup principal 35mm
    charnieres.push({
      x,
      y,
      diametre: CHARNIERES.diametreCup,
      profondeur: CHARNIERES.profondeurCup,
      type: 'charniere',
      face: 'face',
    });
  }

  return charnieres;
}

/**
 * Calcule les positions Minifix pour l'assemblage du caisson
 * @param largeur - largeur du panneau en mm
 * @param epaisseur - epaisseur du panneau perpendiculaire en mm
 */
export function calculerPositionsMinifix(
  largeur: number,
  epaisseur: number
): { logement: PercagePosition; boulon: PercagePosition }[] {
  const assemblages: { logement: PercagePosition; boulon: PercagePosition }[] = [];

  // 2 Minifix par jonction: a ~50mm de chaque bord
  const positions = [50, largeur - 50];

  positions.forEach(pos => {
    // Logement Minifix (dans le panneau horizontal)
    assemblages.push({
      logement: {
        x: pos,
        y: MINIFIX.distanceBord24, // 24mm du bord pour boulon 5mm
        diametre: MINIFIX.diametreLogement,
        profondeur: MINIFIX.profondeurLogement,
        type: 'minifix',
        face: 'face',
      },
      // Boulon (dans le chant du panneau vertical)
      boulon: {
        x: pos,
        y: epaisseur / 2, // centre du chant
        diametre: MINIFIX.diametreBoulon5,
        profondeur: 34, // traverse le panneau
        type: 'minifix',
        face: 'chant',
      },
    });
  });

  return assemblages;
}

/**
 * Calcule la distance de rainure depuis le bord arriere selon epaisseur fond
 * @param epaisseurFond - epaisseur du fond en mm
 */
export function calculerDistanceRainure(epaisseurFond: number): number {
  if (epaisseurFond <= 3) return RAINURES.distanceBordFond3;
  if (epaisseurFond <= 5) return RAINURES.distanceBordFond5;
  return RAINURES.distanceBordFond8;
}

/**
 * Calcule la largeur interieure d'un tiroir pour coulisses TANDEM
 * @param ouvertureCaisson - largeur interieure du caisson en mm
 */
export function calculerLargeurTiroir(ouvertureCaisson: number): number {
  return ouvertureCaisson - TANDEM.reductionLargeur;
}
