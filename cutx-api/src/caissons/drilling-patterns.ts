// caissons/drilling-patterns.ts
// Patterns de percage pour les ferrures des differents fournisseurs
// Basé sur les specifications techniques officielles

// ============================================
// TYPES
// ============================================

export interface DrillingHole {
  offsetX: number;      // Offset X depuis le point de reference (mm)
  offsetY: number;      // Offset Y depuis le point de reference (mm)
  diameter: number;     // Diametre du trou (mm)
  depth: number;        // Profondeur du trou (mm)
  type: 'blind' | 'through';
  purpose: string;      // Description: 'cup', 'screw', 'pilot', etc.
}

export interface FittingDrillingPattern {
  reference: string;
  name: string;
  brand: 'BLUM' | 'HETTICH' | 'HAFELE' | 'GRASS' | 'GENERIC';
  category: 'hinge' | 'drawer_runner' | 'shelf_support' | 'connector' | 'lift_system';

  // Point de reference pour le percage
  referencePoint: 'center' | 'edge' | 'corner';

  // Distance du bord du panneau (mm)
  edgeDistance: number;

  // Trous a percer
  holes: DrillingHole[];

  // Compatibilite epaisseur panneau (mm)
  minThickness: number;
  maxThickness: number;

  // Accessoires necessaires
  accessories: {
    reference: string;
    name: string;
    quantity: number;
  }[];

  // Documentation
  documentUrl?: string;
}

// ============================================
// CHARNIERES BLUM
// ============================================

export const BLUM_HINGES: FittingDrillingPattern[] = [
  // CLIP top BLUMOTION 110°
  {
    reference: '71B3550',
    name: 'CLIP top BLUMOTION 110° - Pose standard',
    brand: 'BLUM',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 21.5,
    holes: [
      // Cuvette principale (sur la porte)
      { offsetX: 0, offsetY: 0, diameter: 35, depth: 13, type: 'blind', purpose: 'cup' },
      // Trous de vis pour embase
      { offsetX: 32, offsetY: -22.5, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
      { offsetX: 32, offsetY: 22.5, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
    ],
    minThickness: 16,
    maxThickness: 24,
    accessories: [
      { reference: '175H3100', name: 'Embase CLIP cruciforme 0mm', quantity: 1 },
      { reference: '70.1503', name: 'Cache bras de charniere', quantity: 1 },
    ],
    documentUrl: 'https://www.blum.com/file/clip_top_blumotion_ti',
  },

  // CLIP top BLUMOTION 110° - Pose Inserta
  {
    reference: '71B3590',
    name: 'CLIP top BLUMOTION 110° - INSERTA',
    brand: 'BLUM',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 21.5,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 35, depth: 13, type: 'blind', purpose: 'cup' },
      // Pas de trous de vis - utilise embase a clipser
    ],
    minThickness: 16,
    maxThickness: 24,
    accessories: [
      { reference: '177H3100E', name: 'Embase CLIP INSERTA 0mm', quantity: 1 },
      { reference: '70.1503', name: 'Cache bras de charniere', quantity: 1 },
    ],
  },

  // CLIP top BLUMOTION 155° grand angle
  {
    reference: '71B7550',
    name: 'CLIP top BLUMOTION 155° - Grand angle',
    brand: 'BLUM',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 21.5,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 35, depth: 13, type: 'blind', purpose: 'cup' },
      { offsetX: 32, offsetY: -22.5, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
      { offsetX: 32, offsetY: 22.5, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
    ],
    minThickness: 16,
    maxThickness: 24,
    accessories: [
      { reference: '175H3100', name: 'Embase CLIP cruciforme 0mm', quantity: 1 },
    ],
  },

  // CLIP top 170° bi-fold
  {
    reference: '71T6550',
    name: 'CLIP top 170° - Bi-fold',
    brand: 'BLUM',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 21.5,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 35, depth: 13, type: 'blind', purpose: 'cup' },
      { offsetX: 32, offsetY: -22.5, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
      { offsetX: 32, offsetY: 22.5, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
    ],
    minThickness: 16,
    maxThickness: 22,
    accessories: [
      { reference: '175H3100', name: 'Embase CLIP cruciforme 0mm', quantity: 1 },
    ],
  },
];

// Embases CLIP (percage sur le cote du caisson)
export const BLUM_HINGE_BASES: FittingDrillingPattern[] = [
  {
    reference: '175H3100',
    name: 'Embase CLIP cruciforme 0mm',
    brand: 'BLUM',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 37, // Distance du bord avant du cote
    holes: [
      // Trous de fixation embase sur le cote
      { offsetX: 0, offsetY: -16, diameter: 5, depth: 13, type: 'blind', purpose: 'screw' },
      { offsetX: 0, offsetY: 16, diameter: 5, depth: 13, type: 'blind', purpose: 'screw' },
    ],
    minThickness: 16,
    maxThickness: 22,
    accessories: [],
  },
  {
    reference: '177H3100E',
    name: 'Embase CLIP INSERTA 0mm',
    brand: 'BLUM',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 37,
    holes: [
      // Un seul trou pilote pour INSERTA
      { offsetX: 0, offsetY: 0, diameter: 10, depth: 12, type: 'blind', purpose: 'pilot' },
    ],
    minThickness: 16,
    maxThickness: 22,
    accessories: [],
  },
];

// ============================================
// CHARNIERES HETTICH
// ============================================

export const HETTICH_HINGES: FittingDrillingPattern[] = [
  // Sensys 8631i 110°
  {
    reference: '9071204',
    name: 'Sensys 8631i 110° - Amortisseur integre',
    brand: 'HETTICH',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 21.5,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 35, depth: 13.5, type: 'blind', purpose: 'cup' },
      { offsetX: 32, offsetY: -22.5, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
      { offsetX: 32, offsetY: 22.5, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
    ],
    minThickness: 15,
    maxThickness: 24,
    accessories: [
      { reference: '9071560', name: 'Embase Sensys cruciforme', quantity: 1 },
    ],
  },

  // Sensys 8645i 155°
  {
    reference: '9094637',
    name: 'Sensys 8645i 155° - Grand angle',
    brand: 'HETTICH',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 21.5,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 35, depth: 13.5, type: 'blind', purpose: 'cup' },
      { offsetX: 32, offsetY: -26, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
      { offsetX: 32, offsetY: 26, diameter: 5, depth: 11, type: 'blind', purpose: 'screw' },
    ],
    minThickness: 15,
    maxThickness: 24,
    accessories: [
      { reference: '9071560', name: 'Embase Sensys cruciforme', quantity: 1 },
    ],
  },

  // Intermat 9930
  {
    reference: '9930',
    name: 'Intermat 9930 110°',
    brand: 'HETTICH',
    category: 'hinge',
    referencePoint: 'center',
    edgeDistance: 21,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 35, depth: 12.5, type: 'blind', purpose: 'cup' },
      { offsetX: 32, offsetY: -20, diameter: 5, depth: 10, type: 'blind', purpose: 'screw' },
      { offsetX: 32, offsetY: 20, diameter: 5, depth: 10, type: 'blind', purpose: 'screw' },
    ],
    minThickness: 16,
    maxThickness: 22,
    accessories: [
      { reference: '1066529', name: 'Embase Intermat cruciforme', quantity: 1 },
    ],
  },
];

// ============================================
// COULISSES BLUM
// ============================================

export const BLUM_DRAWER_RUNNERS: FittingDrillingPattern[] = [
  // TANDEM 550H - Ouverture totale
  {
    reference: '550H5500',
    name: 'TANDEM 550H - 550mm ouverture totale',
    brand: 'BLUM',
    category: 'drawer_runner',
    referencePoint: 'edge',
    edgeDistance: 37, // Distance du bord avant
    holes: [
      // Percages sur le cote du caisson (System 32)
      { offsetX: 0, offsetY: 32, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 64, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 96, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
      // Trou arriere
      { offsetX: 513, offsetY: 32, diameter: 5, depth: 13, type: 'blind', purpose: 'rear_mount' },
    ],
    minThickness: 16,
    maxThickness: 19,
    accessories: [
      { reference: 'T51.1700', name: 'Clips de facade TANDEM', quantity: 2 },
    ],
  },

  // MOVENTO 760H - Ouverture totale charge 40kg
  {
    reference: '760H5500S',
    name: 'MOVENTO 760H - 550mm charge 40kg',
    brand: 'BLUM',
    category: 'drawer_runner',
    referencePoint: 'edge',
    edgeDistance: 37,
    holes: [
      { offsetX: 0, offsetY: 32, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 64, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
      { offsetX: 513, offsetY: 32, diameter: 5, depth: 13, type: 'blind', purpose: 'rear_mount' },
    ],
    minThickness: 16,
    maxThickness: 19,
    accessories: [
      { reference: '760H0002S', name: 'Attaches facade MOVENTO', quantity: 2 },
    ],
  },
];

// ============================================
// COULISSES HETTICH
// ============================================

export const HETTICH_DRAWER_RUNNERS: FittingDrillingPattern[] = [
  // Quadro V6 550mm
  {
    reference: '9149284',
    name: 'Quadro V6 550mm - Ouverture totale',
    brand: 'HETTICH',
    category: 'drawer_runner',
    referencePoint: 'edge',
    edgeDistance: 37,
    holes: [
      { offsetX: 0, offsetY: 32, diameter: 5, depth: 12, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 64, diameter: 5, depth: 12, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 96, diameter: 5, depth: 12, type: 'blind', purpose: 'mounting' },
      { offsetX: 513, offsetY: 32, diameter: 5, depth: 12, type: 'blind', purpose: 'rear_mount' },
    ],
    minThickness: 16,
    maxThickness: 19,
    accessories: [
      { reference: '9149291', name: 'Attaches facade Quadro', quantity: 2 },
    ],
  },

  // ArciTech 500mm
  {
    reference: '9217586',
    name: 'ArciTech 500mm - Systeme tiroir design',
    brand: 'HETTICH',
    category: 'drawer_runner',
    referencePoint: 'edge',
    edgeDistance: 37,
    holes: [
      { offsetX: 0, offsetY: 32, diameter: 5, depth: 12, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 64, diameter: 5, depth: 12, type: 'blind', purpose: 'mounting' },
      { offsetX: 463, offsetY: 32, diameter: 5, depth: 12, type: 'blind', purpose: 'rear_mount' },
    ],
    minThickness: 16,
    maxThickness: 19,
    accessories: [
      { reference: '9217605', name: 'Kit facade ArciTech', quantity: 1 },
    ],
  },
];

// ============================================
// SUPPORTS ETAGERE
// ============================================

export const SHELF_SUPPORTS: FittingDrillingPattern[] = [
  // Support etagere standard 5mm
  {
    reference: 'SHELF_PIN_5',
    name: 'Taquet etagere 5mm',
    brand: 'GENERIC',
    category: 'shelf_support',
    referencePoint: 'center',
    edgeDistance: 37,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 5, depth: 13, type: 'blind', purpose: 'shelf_pin' },
    ],
    minThickness: 16,
    maxThickness: 25,
    accessories: [],
  },

  // Support etagere Blum
  {
    reference: '291.00.701',
    name: 'Support etagere CLIP Blum',
    brand: 'BLUM',
    category: 'shelf_support',
    referencePoint: 'center',
    edgeDistance: 37,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 5, depth: 13, type: 'blind', purpose: 'shelf_pin' },
    ],
    minThickness: 16,
    maxThickness: 22,
    accessories: [],
  },
];

// ============================================
// CONNECTEURS
// ============================================

export const CONNECTORS: FittingDrillingPattern[] = [
  // Excentrique 15mm standard
  {
    reference: 'RASTEX_15',
    name: 'Excentrique Rastex 15mm',
    brand: 'HETTICH',
    category: 'connector',
    referencePoint: 'center',
    edgeDistance: 8, // Distance du chant
    holes: [
      // Trou boitier excentrique
      { offsetX: 0, offsetY: 0, diameter: 15, depth: 12.5, type: 'blind', purpose: 'body' },
    ],
    minThickness: 16,
    maxThickness: 25,
    accessories: [
      { reference: 'BOLT_34', name: 'Boulon 34mm', quantity: 1 },
    ],
  },

  // Tourillon 8mm
  {
    reference: 'DOWEL_8',
    name: 'Tourillon bois 8x35mm',
    brand: 'GENERIC',
    category: 'connector',
    referencePoint: 'edge',
    edgeDistance: 0,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 8, depth: 18, type: 'blind', purpose: 'dowel' },
    ],
    minThickness: 16,
    maxThickness: 50,
    accessories: [],
  },

  // VB 35/16 Blum
  {
    reference: 'VB_35_16',
    name: 'Connecteur VB 35/16 Blum',
    brand: 'BLUM',
    category: 'connector',
    referencePoint: 'edge',
    edgeDistance: 8,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 35, depth: 16, type: 'blind', purpose: 'body' },
      { offsetX: 0, offsetY: 34, diameter: 5, depth: 20, type: 'through', purpose: 'bolt' },
    ],
    minThickness: 16,
    maxThickness: 19,
    accessories: [],
  },
];

// ============================================
// RELEVABLES BLUM AVENTOS
// ============================================

export const BLUM_LIFT_SYSTEMS: FittingDrillingPattern[] = [
  // AVENTOS HF bi-fold
  {
    reference: '20F2200',
    name: 'AVENTOS HF bi-fold',
    brand: 'BLUM',
    category: 'lift_system',
    referencePoint: 'edge',
    edgeDistance: 37,
    holes: [
      // Fixation mecanisme sur le cote
      { offsetX: 0, offsetY: 0, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 32, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 64, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
    ],
    minThickness: 16,
    maxThickness: 19,
    accessories: [
      { reference: '20F8000', name: 'Mecanisme de force AVENTOS', quantity: 2 },
      { reference: '21F8000', name: 'Bras AVENTOS', quantity: 2 },
    ],
  },

  // AVENTOS HL
  {
    reference: '21L3500',
    name: 'AVENTOS HL relevable',
    brand: 'BLUM',
    category: 'lift_system',
    referencePoint: 'edge',
    edgeDistance: 37,
    holes: [
      { offsetX: 0, offsetY: 0, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
      { offsetX: 0, offsetY: 32, diameter: 5, depth: 13, type: 'blind', purpose: 'mounting' },
    ],
    minThickness: 16,
    maxThickness: 19,
    accessories: [
      { reference: '21L8000', name: 'Mecanisme AVENTOS HL', quantity: 2 },
    ],
  },
];

// ============================================
// UTILITAIRES
// ============================================

/**
 * Recherche un pattern de percage par reference
 */
export function findPatternByReference(reference: string): FittingDrillingPattern | undefined {
  const allPatterns = [
    ...BLUM_HINGES,
    ...BLUM_HINGE_BASES,
    ...HETTICH_HINGES,
    ...BLUM_DRAWER_RUNNERS,
    ...HETTICH_DRAWER_RUNNERS,
    ...SHELF_SUPPORTS,
    ...CONNECTORS,
    ...BLUM_LIFT_SYSTEMS,
  ];

  return allPatterns.find(p => p.reference === reference);
}

/**
 * Recherche tous les patterns par marque
 */
export function findPatternsByBrand(brand: string): FittingDrillingPattern[] {
  const allPatterns = [
    ...BLUM_HINGES,
    ...BLUM_HINGE_BASES,
    ...HETTICH_HINGES,
    ...BLUM_DRAWER_RUNNERS,
    ...HETTICH_DRAWER_RUNNERS,
    ...SHELF_SUPPORTS,
    ...CONNECTORS,
    ...BLUM_LIFT_SYSTEMS,
  ];

  const normalizedBrand = brand.toUpperCase();
  return allPatterns.filter(p => p.brand === normalizedBrand);
}

/**
 * Recherche tous les patterns par categorie
 */
export function findPatternsByCategory(category: string): FittingDrillingPattern[] {
  const allPatterns = [
    ...BLUM_HINGES,
    ...BLUM_HINGE_BASES,
    ...HETTICH_HINGES,
    ...BLUM_DRAWER_RUNNERS,
    ...HETTICH_DRAWER_RUNNERS,
    ...SHELF_SUPPORTS,
    ...CONNECTORS,
    ...BLUM_LIFT_SYSTEMS,
  ];

  const normalizedCategory = category.toLowerCase();
  return allPatterns.filter(p => p.category === normalizedCategory);
}

/**
 * Exporte tous les patterns disponibles
 */
export function getAllPatterns(): FittingDrillingPattern[] {
  return [
    ...BLUM_HINGES,
    ...BLUM_HINGE_BASES,
    ...HETTICH_HINGES,
    ...BLUM_DRAWER_RUNNERS,
    ...HETTICH_DRAWER_RUNNERS,
    ...SHELF_SUPPORTS,
    ...CONNECTORS,
    ...BLUM_LIFT_SYSTEMS,
  ];
}
