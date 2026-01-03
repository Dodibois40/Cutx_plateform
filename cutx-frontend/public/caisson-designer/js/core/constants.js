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

// Couleurs par défaut
export const DEFAULT_COLORS = {
  caisson: 0xFFFFFF,
  door: 0xFFFFFF
};
