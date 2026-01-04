/* ================================================
   CONSTANTS - Constantes de l'application
   ================================================ */

// Distance d'explosion (en mm)
export const EXPLODE_DISTANCE = 250;

// Grille d'aimantation (en mm)
export const SNAP_GRID_SIZE = 50;

// Distance minimale entre caissons (en mm)
// -10 = permet un chevauchement pour un collage parfait visuel
export const MIN_CAISSON_SPACING = -10;

// Couleurs de sélection
export const SELECTION_COLOR = 0x4CAF50; // Vert
export const HOVER_COLOR = 0x2196F3;     // Bleu

// Épaisseur de l'outline de sélection
export const SELECTION_OUTLINE_THICKNESS = 3;

// Valeurs par défaut des dimensions
export const DEFAULT_DIMENSIONS = {
  width: 600,
  height: 900,
  depth: 350,
  thickness: 18,
  doorThickness: 18,
  gapTop: 3,
  gapBottom: 0,
  gapLeft: 0,
  gapRight: 0,
  doorOffset: 3
};

// Configuration par defaut des charnieres
export const DEFAULT_HINGE_CONFIG = {
  enabled: true,                    // Charnieres activees
  type: 'CLIP_TOP_BLUMOTION_110',  // Type de charniere Blum
  side: 'left',                     // Cote de montage (left ou right)
  count: 2,                         // Nombre de charnieres (auto-calcule si null)
  showDrillings: true,              // Afficher les percages sur la porte
  showHinges: true,                 // Afficher les modeles 3D des charnieres
  mountingPlate: 'STANDARD_0MM'     // Type d'embase
};

// Specifications des percages charnieres Blum
export const HINGE_DRILLING_SPECS = {
  cupDiameter: 35,        // mm - Diametre du trou cup
  cupDepth: 13,           // mm - Profondeur du trou cup
  cupDistanceFromEdge: 21, // mm - Distance centre cup au chant (pas 23mm comme INSERTA)
  fixingDiameter: 8,      // mm - Diametre trous de fixation
  fixingDepth: 12,        // mm - Profondeur trous de fixation
  fixingSpacing: 45.5,    // mm - Espacement entre les 2 trous de fixation
  // Positions Y selon hauteur porte
  minDistanceFromEdge: 80, // mm du haut/bas de la porte
  maxSpacing: 500          // mm max entre 2 charnieres
};

// Couleurs par défaut
export const DEFAULT_COLORS = {
  caisson: 0xFFFFFF,
  door: 0xFFFFFF
};
