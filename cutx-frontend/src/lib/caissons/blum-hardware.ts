// lib/caissons/blum-hardware.ts
// Catalogue complet des charnieres et embases Blum CLIP top BLUMOTION
// avec specifications de percage precises

import type { AngleCharniere, TypeCharniere } from './types';

// === TYPES ===

/** Types d'embases Blum disponibles */
export type TypeEmbaseBlum =
  | 'EXPANDO_0mm'   // Embase EXPANDO reglage hauteur 0mm
  | 'EXPANDO_3mm'   // Embase EXPANDO reglage hauteur 3mm
  | 'WING_0mm'      // Embase Wing (cruciforme) 0mm
  | 'INSERTA_0mm';  // Embase INSERTA (clip sans outil) 0mm

/** Cote du caisson pour les percages */
export type CoteCaisson = 'gauche' | 'droit';

/** Face d'un panneau */
export type FacePanneau = 'interne' | 'externe';

// === CONSTANTES DE PERCAGE ===

/**
 * Specifications de percage pour charnieres Blum CLIP top
 * Source: Documentation technique Blum officielle
 */
export const PERCAGE_CHARNIERE_BLUM = {
  // === PERCAGE PORTE (FACADE) ===
  porte: {
    // Cup (trou principal borgne)
    cup: {
      diametre: 35,           // mm - Diametre standard Blum
      profondeur: 13,         // mm - Profondeur de fraisage
      distanceBord: 23,       // mm - Distance du centre au bord de la porte
    },
    // Trous INSERTA (vis de fixation pour charnieres standard)
    inserta: {
      diametre: 8,            // mm - Trous pour vis de fixation
      profondeur: 12,         // mm
      espacement: 45,         // mm - Espacement entre les 2 trous
      distanceCentreCup: 9.5, // mm - Distance du centre cup vers l'interieur porte
    },
  },

  // === PERCAGE COTE (EMBASE) ===
  cote: {
    distanceBordAvant: 37,    // mm - Ligne System32 standard
    // Trous selon type d'embase
    inserta: {
      diametre: 10,           // mm - Trou pilote unique
      profondeur: 12,         // mm
    },
    expando: {
      diametre: 10,           // mm - Trou pilote unique
      profondeur: 12,         // mm
    },
    wing: {
      diametre: 5,            // mm - 2 trous pour vis
      profondeur: 13,         // mm
      espacement: 32,         // mm - System32 standard
    },
  },

  // === POSITIONS VERTICALES ===
  positions: {
    distanceHautBas: 100,     // mm - Distance min depuis haut/bas de facade
    // Seuils pour nombre de charnieres
    seuils: [
      { hauteurMax: 600, nombreCharnieres: 2 },
      { hauteurMax: 1000, nombreCharnieres: 3 },
      { hauteurMax: 1400, nombreCharnieres: 4 },
      { hauteurMax: 1800, nombreCharnieres: 5 },
      { hauteurMax: Infinity, nombreCharnieres: 6 },
    ],
  },
} as const;

// === CATALOGUE CHARNIERES ===

export interface CharniereBlumSpec {
  reference: string;
  nom: string;
  angle: AngleCharniere;
  type: TypeCharniere;
  avecBlumotion: boolean;
  prixUnitaireHT: number;
  couleurs: string[];
  // Fichier 3D DAE
  fichierDae: string;
  // Specs techniques
  profondeurMinCaisson: number;  // mm
  epaisseurPorteMin: number;     // mm
  epaisseurPorteMax: number;     // mm
}

/**
 * Catalogue des charnieres Blum CLIP top BLUMOTION
 */
export const CHARNIERES_BLUM_CATALOGUE: Record<string, CharniereBlumSpec> = {
  // === 110° Standard ===
  '71B3550': {
    reference: '71B3550',
    nom: 'CLIP top BLUMOTION 110° standard',
    angle: 110,
    type: 'a_visser',
    avecBlumotion: true,
    prixUnitaireHT: 7.50,
    couleurs: ['nickel'],
    fichierDae: '71B3550.Neutral.dae',
    profondeurMinCaisson: 300,
    epaisseurPorteMin: 15,
    epaisseurPorteMax: 24,
  },
  // === 110° INSERTA ===
  '71B3590': {
    reference: '71B3590',
    nom: 'CLIP top BLUMOTION 110° INSERTA',
    angle: 110,
    type: 'inserta',
    avecBlumotion: true,
    prixUnitaireHT: 8.50,
    couleurs: ['nickel', 'noir onyx'],
    fichierDae: '71B3590.Neutral.dae',
    profondeurMinCaisson: 300,
    epaisseurPorteMin: 15,
    epaisseurPorteMax: 24,
  },
  // === 155° Grand angle ===
  '71B7550': {
    reference: '71B7550',
    nom: 'CLIP top BLUMOTION 155° grand angle',
    angle: 155,
    type: 'a_visser',
    avecBlumotion: true,
    prixUnitaireHT: 12.50,
    couleurs: ['nickel'],
    fichierDae: '71B7550.Neutral.dae',
    profondeurMinCaisson: 350,
    epaisseurPorteMin: 15,
    epaisseurPorteMax: 24,
  },
  // === 95° Angle reduit ===
  '71B3650': {
    reference: '71B3650',
    nom: 'CLIP top BLUMOTION 95° angle reduit',
    angle: 95,
    type: 'a_visser',
    avecBlumotion: true,
    prixUnitaireHT: 8.00,
    couleurs: ['nickel'],
    fichierDae: '71B3650.Neutral.dae',
    profondeurMinCaisson: 280,
    epaisseurPorteMin: 15,
    epaisseurPorteMax: 24,
  },
  // === 107° Standard ===
  '71B3750': {
    reference: '71B3750',
    nom: 'CLIP top BLUMOTION 107° standard',
    angle: 107,
    type: 'a_visser',
    avecBlumotion: true,
    prixUnitaireHT: 7.80,
    couleurs: ['nickel'],
    fichierDae: '71B3750.Neutral.dae',
    profondeurMinCaisson: 300,
    epaisseurPorteMin: 15,
    epaisseurPorteMax: 24,
  },
} as const;

// === CATALOGUE EMBASES ===

export interface EmbaseBlumSpec {
  reference: string;
  nom: string;
  typeEmbase: TypeEmbaseBlum;
  hauteurReglage: number;       // mm - Decalage vertical
  prixUnitaireHT: number;
  couleurs: string[];
  fichierDae: string;
  // Specs de percage specifiques
  percage: {
    type: 'pilote' | 'vis_system32';
    diametre: number;           // mm
    profondeur: number;         // mm
    espacement?: number;        // mm - Pour Wing (System32)
  };
}

/**
 * Catalogue des embases Blum CLIP
 */
export const EMBASES_BLUM_CATALOGUE: Record<string, EmbaseBlumSpec> = {
  // === INSERTA 0mm ===
  '173H7100': {
    reference: '173H7100',
    nom: 'CLIP Embase INSERTA 0mm',
    typeEmbase: 'INSERTA_0mm',
    hauteurReglage: 0,
    prixUnitaireHT: 3.20,
    couleurs: ['nickel'],
    fichierDae: '173H7100_CLIP-mounting-plate_Screw-on.dae',
    percage: {
      type: 'pilote',
      diametre: 10,
      profondeur: 12,
    },
  },
  // === WING 0mm (Cruciforme) ===
  '175H3100': {
    reference: '175H3100',
    nom: 'CLIP Embase Wing cruciforme 0mm',
    typeEmbase: 'WING_0mm',
    hauteurReglage: 0,
    prixUnitaireHT: 2.50,
    couleurs: ['nickel'],
    fichierDae: '175H3100_CLIP-mounting-plate_Screw-on.dae',
    percage: {
      type: 'vis_system32',
      diametre: 5,
      profondeur: 13,
      espacement: 32,  // System32 standard
    },
  },
  // === EXPANDO 0mm ===
  '177H3100E': {
    reference: '177H3100E',
    nom: 'CLIP Embase EXPANDO 0mm',
    typeEmbase: 'EXPANDO_0mm',
    hauteurReglage: 0,
    prixUnitaireHT: 2.80,
    couleurs: ['nickel'],
    fichierDae: '177H3100E_CLIP-mounting-plate_EXPANDO.dae',
    percage: {
      type: 'pilote',
      diametre: 10,
      profondeur: 12,
    },
  },
  // === EXPANDO 3mm ===
  '177H3130E': {
    reference: '177H3130E',
    nom: 'CLIP Embase EXPANDO 3mm',
    typeEmbase: 'EXPANDO_3mm',
    hauteurReglage: 3,
    prixUnitaireHT: 2.80,
    couleurs: ['nickel'],
    fichierDae: '177H3130E_CLIP-mounting-plate_EXPANDO.dae',
    percage: {
      type: 'pilote',
      diametre: 10,
      profondeur: 12,
    },
  },
} as const;

// === CACHES BRAS ===

export interface CacheBrasBlumSpec {
  reference: string;
  nom: string;
  prixUnitaireHT: number;
  couleur: string;
  fichierDae: string;
}

export const CACHES_BRAS_BLUM: Record<string, CacheBrasBlumSpec> = {
  '70.1503_NICKEL': {
    reference: '70.1503',
    nom: 'Cache bras charniere nickel',
    prixUnitaireHT: 0.95,
    couleur: 'nickel',
    fichierDae: '70.1503_Cover-cap.dae',
  },
  '70.1503_NOIR': {
    reference: '70.1503.OS',
    nom: 'Cache bras charniere noir onyx',
    prixUnitaireHT: 1.10,
    couleur: 'noir onyx',
    fichierDae: '70.1503.OS_Cover-cap_onyx-black.dae',
  },
} as const;

// === FONCTIONS UTILITAIRES ===

/**
 * Obtient la spec d'embase par type
 */
export function getEmbaseByType(type: TypeEmbaseBlum): EmbaseBlumSpec {
  const mapping: Record<TypeEmbaseBlum, string> = {
    'INSERTA_0mm': '173H7100',
    'WING_0mm': '175H3100',
    'EXPANDO_0mm': '177H3100E',
    'EXPANDO_3mm': '177H3130E',
  };
  return EMBASES_BLUM_CATALOGUE[mapping[type]];
}

/**
 * Obtient la liste des embases compatibles avec une charniere
 */
export function getEmbasesCompatibles(referenceCharniere: string): EmbaseBlumSpec[] {
  // Toutes les embases sont compatibles avec toutes les charnieres CLIP top
  return Object.values(EMBASES_BLUM_CATALOGUE);
}

/**
 * Calcule le nombre de charnieres selon la hauteur de facade
 */
export function calculerNombreCharnieres(hauteurFacade: number): number {
  const { seuils } = PERCAGE_CHARNIERE_BLUM.positions;
  for (const seuil of seuils) {
    if (hauteurFacade <= seuil.hauteurMax) {
      return seuil.nombreCharnieres;
    }
  }
  return 6; // Max par defaut
}

/**
 * Calcule les positions Y (verticales) des charnieres sur la facade
 * Origine: bas de la facade
 */
export function calculerPositionsYCharnieres(hauteurFacade: number): number[] {
  const n = calculerNombreCharnieres(hauteurFacade);
  const D = PERCAGE_CHARNIERE_BLUM.positions.distanceHautBas;

  if (n === 1) {
    return [hauteurFacade / 2];
  }

  const espacement = (hauteurFacade - 2 * D) / (n - 1);
  return Array.from({ length: n }, (_, i) => D + i * espacement);
}

/**
 * Verifie si la configuration de charniere est valide
 */
export function validerConfigCharniere(
  referenceCharniere: string,
  profondeurCaisson: number,
  epaisseurFacade: number,
): { valide: boolean; erreurs: string[] } {
  const charniere = CHARNIERES_BLUM_CATALOGUE[referenceCharniere];
  const erreurs: string[] = [];

  if (!charniere) {
    return { valide: false, erreurs: ['Reference charniere inconnue'] };
  }

  if (profondeurCaisson < charniere.profondeurMinCaisson) {
    erreurs.push(
      `Profondeur caisson insuffisante: ${profondeurCaisson}mm < ${charniere.profondeurMinCaisson}mm requis`
    );
  }

  if (epaisseurFacade < charniere.epaisseurPorteMin) {
    erreurs.push(
      `Epaisseur facade trop fine: ${epaisseurFacade}mm < ${charniere.epaisseurPorteMin}mm requis`
    );
  }

  if (epaisseurFacade > charniere.epaisseurPorteMax) {
    erreurs.push(
      `Epaisseur facade trop epaisse: ${epaisseurFacade}mm > ${charniere.epaisseurPorteMax}mm max`
    );
  }

  return { valide: erreurs.length === 0, erreurs };
}

/**
 * Calcule le prix total de la quincaillerie pour un caisson
 */
export function calculerPrixQuincaillerie(
  referenceCharniere: string,
  typeEmbase: TypeEmbaseBlum,
  nombreCharnieres: number,
  avecCaches: boolean = true,
): {
  prixCharnieres: number;
  prixEmbases: number;
  prixCaches: number;
  prixTotal: number;
  detail: Array<{ article: string; quantite: number; prixUnitaire: number; total: number }>;
} {
  const charniere = CHARNIERES_BLUM_CATALOGUE[referenceCharniere];
  const embase = getEmbaseByType(typeEmbase);
  const cache = CACHES_BRAS_BLUM['70.1503_NICKEL'];

  const prixCharnieres = nombreCharnieres * (charniere?.prixUnitaireHT || 0);
  const prixEmbases = nombreCharnieres * (embase?.prixUnitaireHT || 0);
  const prixCaches = avecCaches ? nombreCharnieres * (cache?.prixUnitaireHT || 0) : 0;

  const detail = [
    {
      article: charniere?.nom || 'Charniere',
      quantite: nombreCharnieres,
      prixUnitaire: charniere?.prixUnitaireHT || 0,
      total: prixCharnieres,
    },
    {
      article: embase?.nom || 'Embase',
      quantite: nombreCharnieres,
      prixUnitaire: embase?.prixUnitaireHT || 0,
      total: prixEmbases,
    },
  ];

  if (avecCaches) {
    detail.push({
      article: cache?.nom || 'Cache bras',
      quantite: nombreCharnieres,
      prixUnitaire: cache?.prixUnitaireHT || 0,
      total: prixCaches,
    });
  }

  return {
    prixCharnieres,
    prixEmbases,
    prixCaches,
    prixTotal: prixCharnieres + prixEmbases + prixCaches,
    detail,
  };
}

// === LABELS POUR UI ===

export const LABELS_TYPE_EMBASE: Record<TypeEmbaseBlum, { label: string; description: string }> = {
  'INSERTA_0mm': {
    label: 'INSERTA 0mm',
    description: 'Montage clip sans outil, trou pilote 10mm',
  },
  'WING_0mm': {
    label: 'Wing cruciforme 0mm',
    description: 'Montage vis System32, 2 trous 5mm',
  },
  'EXPANDO_0mm': {
    label: 'EXPANDO 0mm',
    description: 'Montage expansion, trou pilote 10mm',
  },
  'EXPANDO_3mm': {
    label: 'EXPANDO 3mm',
    description: 'Montage expansion +3mm hauteur, trou pilote 10mm',
  },
};
