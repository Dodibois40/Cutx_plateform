/* ================================================
   HARDWARE SPECS - Spécifications des quincailleries et perçages
   Configuration admin pour les perçages
   ================================================ */

/**
 * Spécifications des charnières Blum CLIP top BLUMOTION
 * Ces specs définissent les perçages nécessaires pour chaque type de charnière
 */
export const HINGE_SPECS = {
  // Charnière standard CLIP top 110°
  'CLIP_TOP_110': {
    name: 'CLIP top 110°',
    angle: 110,
    // Perçage principal sur la porte (cup hole)
    cupHole: {
      diameter: 35,        // mm - standard Blum
      depth: 13,           // mm - profondeur du trou borgne
      distanceFromEdge: 5  // mm - distance du chant de la porte (configurable 3-6mm)
    },
    // Trous de fixation sur la porte
    fixingHoles: {
      diameter: 8,         // mm pour les vis
      spacing: 45.5,       // mm entre les 2 trous de fixation
      depth: 12            // mm
    },
    // Embase sur le caisson (montage direct ou avec plaque)
    mountingPlate: {
      screwHoles: [
        { x: 0, y: 0, diameter: 5, depth: 15 },      // Trou principal
        { x: 0, y: 32, diameter: 5, depth: 15 }     // Trou secondaire
      ]
    },
    // Dimensions de la charnière pour le modèle 3D
    dimensions: {
      width: 52,
      height: 45,
      depth: 18
    },
    // Fichier 3D associé
    modelFile: '71B3550_42542984.dae',
    // Couleur par défaut
    color: 0xC0C0C0  // Gris métallique
  },

  // Charnière CLIP top 170° grand angle
  'CLIP_TOP_170': {
    name: 'CLIP top 170°',
    angle: 170,
    cupHole: {
      diameter: 35,
      depth: 13,
      distanceFromEdge: 5
    },
    fixingHoles: {
      diameter: 8,
      spacing: 45.5,
      depth: 12
    },
    mountingPlate: {
      screwHoles: [
        { x: 0, y: 0, diameter: 5, depth: 15 },
        { x: 0, y: 32, diameter: 5, depth: 15 }
      ]
    },
    dimensions: {
      width: 52,
      height: 55,
      depth: 22
    },
    modelFile: '71B3650_41309636.dae',
    color: 0xC0C0C0
  },

  // Charnière CLIP top BLUMOTION 110° avec amortisseur intégré
  'CLIP_TOP_BLUMOTION_110': {
    name: 'CLIP top BLUMOTION 110°',
    angle: 110,
    cupHole: {
      diameter: 35,
      depth: 13,
      distanceFromEdge: 5
    },
    fixingHoles: {
      diameter: 8,
      spacing: 45.5,
      depth: 12
    },
    mountingPlate: {
      screwHoles: [
        { x: 0, y: 0, diameter: 5, depth: 15 },
        { x: 0, y: 32, diameter: 5, depth: 15 }
      ]
    },
    dimensions: {
      width: 52,
      height: 48,
      depth: 20
    },
    modelFile: '71B3550_43192717.dae',
    color: 0xC0C0C0
  }
};

/**
 * Règles de positionnement des charnières selon la hauteur de porte
 */
export const HINGE_PLACEMENT_RULES = {
  // Distances recommandées par rapport aux bords de la porte
  minDistanceFromTop: 80,      // mm minimum du haut
  minDistanceFromBottom: 80,   // mm minimum du bas
  maxDistanceBetween: 500,     // mm max entre 2 charnières

  // Nombre de charnières selon la hauteur de porte
  getRecommendedCount(doorHeight) {
    if (doorHeight <= 800) return 2;
    if (doorHeight <= 1400) return 3;
    if (doorHeight <= 2000) return 4;
    return 5;
  },

  // Calcule les positions Y recommandées pour les charnières
  getRecommendedPositions(doorHeight, count) {
    const positions = [];
    const usableHeight = doorHeight - this.minDistanceFromTop - this.minDistanceFromBottom;

    if (count === 2) {
      positions.push(this.minDistanceFromBottom);
      positions.push(doorHeight - this.minDistanceFromTop);
    } else {
      const spacing = usableHeight / (count - 1);
      for (let i = 0; i < count; i++) {
        positions.push(this.minDistanceFromBottom + (spacing * i));
      }
    }

    return positions;
  }
};

/**
 * Configuration des embases (mounting plates)
 */
export const MOUNTING_PLATE_SPECS = {
  'STANDARD_0MM': {
    name: 'Embase standard 0mm',
    height: 0,      // Surélévation
    screwPattern: 'INLINE',
    modelFile: '173H7100_42501451.dae'
  },
  'STANDARD_3MM': {
    name: 'Embase standard +3mm',
    height: 3,
    screwPattern: 'INLINE',
    modelFile: '173H7130_46403131.dae'
  }
};

/**
 * Configuration par défaut pour une nouvelle charnière
 */
export const DEFAULT_HINGE_CONFIG = {
  type: 'CLIP_TOP_BLUMOTION_110',
  distanceFromTop: 100,         // mm depuis le haut de la porte
  distanceFromBottom: 100,      // mm depuis le bas de la porte
  distanceFromEdge: 21,         // mm depuis le chant (axe du trou 35mm)
  count: 2,                     // nombre de charnières
  mountingPlate: 'STANDARD_0MM'
};

/**
 * Fonction utilitaire pour obtenir les specs d'une charnière
 */
export function getHingeSpecs(type) {
  return HINGE_SPECS[type] || HINGE_SPECS['CLIP_TOP_BLUMOTION_110'];
}

/**
 * Fonction utilitaire pour calculer les perçages d'une porte
 */
export function calculateDoorDrillings(doorHeight, doorWidth, hingeConfig) {
  const specs = getHingeSpecs(hingeConfig.type);
  const positions = HINGE_PLACEMENT_RULES.getRecommendedPositions(doorHeight, hingeConfig.count);

  const drillings = [];

  positions.forEach((yPos, index) => {
    // Perçage principal (cup hole Ø35)
    drillings.push({
      type: 'CUP_HOLE',
      x: hingeConfig.distanceFromEdge,
      y: yPos,
      diameter: specs.cupHole.diameter,
      depth: specs.cupHole.depth,
      hingeIndex: index
    });

    // Trous de fixation
    const halfSpacing = specs.fixingHoles.spacing / 2;
    drillings.push({
      type: 'FIXING_HOLE',
      x: hingeConfig.distanceFromEdge,
      y: yPos - halfSpacing,
      diameter: specs.fixingHoles.diameter,
      depth: specs.fixingHoles.depth,
      hingeIndex: index
    });
    drillings.push({
      type: 'FIXING_HOLE',
      x: hingeConfig.distanceFromEdge,
      y: yPos + halfSpacing,
      diameter: specs.fixingHoles.diameter,
      depth: specs.fixingHoles.depth,
      hingeIndex: index
    });
  });

  return drillings;
}
