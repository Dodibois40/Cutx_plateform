// lib/caissons/constants.ts
// Constantes pour le module de configuration de caissons

import type {
  TypeCaisson,
  TypeFond,
  TypeFacade,
  MarqueCharniere,
  TypeCharniere,
  AngleCharniere
} from './types';

// === DIMENSIONS ===

/** Limites de dimensions en mm */
export const DIMENSIONS = {
  HAUTEUR_MIN: 200,
  HAUTEUR_MAX: 2800,
  LARGEUR_MIN: 100,
  LARGEUR_MAX: 2800,
  PROFONDEUR_MIN: 100,
  PROFONDEUR_MAX: 2800,
} as const;

/** Epaisseurs disponibles pour les panneaux structure (mm) */
export const EPAISSEURS_STRUCTURE = [16, 18, 19, 22] as const;

/** Epaisseurs disponibles pour les fonds (mm) */
export const EPAISSEURS_FOND = [3, 5, 8, 10] as const;

/** Epaisseurs disponibles pour les facades (mm) */
export const EPAISSEURS_FACADE = [16, 18, 19, 22] as const;

/** Profondeurs de rainure disponibles (mm) */
export const PROFONDEURS_RAINURE = [8, 10, 12, 15] as const;

/** Jeux facade disponibles (mm) */
export const JEUX_FACADE = [1, 1.5, 2, 2.5, 3] as const;

// === OPTIONS FOND ===

export const OPTIONS_TYPE_FOND: { value: TypeFond; label: string; description: string }[] = [
  {
    value: 'applique',
    label: 'Applique',
    description: 'Fond visse derriere le caisson'
  },
  {
    value: 'encastre',
    label: 'Encastre',
    description: 'Fond encastre dans une rainure'
  },
  {
    value: 'feuillure',
    label: 'Feuillure',
    description: 'Fond dans une feuillure'
  },
  {
    value: 'rainure',
    label: 'Rainure',
    description: 'Fond glisse dans rainure'
  },
];

// === OPTIONS FACADE ===

export const OPTIONS_TYPE_FACADE: { value: TypeFacade; label: string; description: string }[] = [
  {
    value: 'applique',
    label: 'En applique',
    description: 'Facade recouvre les cotes'
  },
  {
    value: 'encastre',
    label: 'Encastree',
    description: 'Facade entre les cotes'
  },
];

// === OPTIONS CHARNIERES ===

export const OPTIONS_MARQUE_CHARNIERE: { value: MarqueCharniere; label: string }[] = [
  { value: 'blum', label: 'Blum' },
  { value: 'hettich', label: 'Hettich' },
  { value: 'grass', label: 'Grass' },
  { value: 'hafele', label: 'Hafele' },
];

export const OPTIONS_TYPE_CHARNIERE: { value: TypeCharniere; label: string; description: string }[] = [
  {
    value: 'a_visser',
    label: 'A visser',
    description: 'Montage standard avec vis'
  },
  {
    value: 'inserta',
    label: 'INSERTA',
    description: 'Montage sans outil (clip)'
  },
];

export const OPTIONS_ANGLE_CHARNIERE: { value: AngleCharniere; label: string }[] = [
  { value: 95, label: '95°' },
  { value: 107, label: '107°' },
  { value: 110, label: '110° (standard)' },
  { value: 155, label: '155° (grand angle)' },
  { value: 170, label: '170° (bi-fold)' },
];

// === CALCUL NOMBRE CHARNIERES ===

/** Calcule le nombre de charnieres selon la hauteur de facade */
export function calculerNombreCharnieres(hauteurFacade: number): number {
  if (hauteurFacade <= 600) return 2;
  if (hauteurFacade <= 1000) return 3;
  if (hauteurFacade <= 1400) return 4;
  if (hauteurFacade <= 1800) return 5;
  return 6;
}

// === CATALOGUE CHARNIERES BLUM ===

export const CHARNIERES_BLUM = {
  'CLIP_TOP_BLUMOTION_110': {
    reference: '71B3590',
    nom: 'CLIP top BLUMOTION 110°',
    angle: 110 as AngleCharniere,
    prixUnitaire: 8.50,
    embase: {
      reference: '177H3100E',
      nom: 'CLIP Embase droit 0mm',
      prixUnitaire: 2.80,
    },
    cache: {
      reference: '70.1503',
      nom: 'Cache bras de charniere',
      prixUnitaire: 0.95,
    },
    couleurs: ['noir onyx', 'nickel'],
  },
  'CLIP_TOP_BLUMOTION_155': {
    reference: '71B7550',
    nom: 'CLIP top BLUMOTION 155°',
    angle: 155 as AngleCharniere,
    prixUnitaire: 12.50,
    embase: {
      reference: '177H3100E',
      nom: 'CLIP Embase droit 0mm',
      prixUnitaire: 2.80,
    },
    cache: {
      reference: '70.1503',
      nom: 'Cache bras de charniere',
      prixUnitaire: 0.95,
    },
    couleurs: ['noir onyx', 'nickel'],
  },
} as const;

// === TYPES DE CAISSONS ===

export const OPTIONS_TYPE_CAISSON: {
  value: TypeCaisson;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'bas_cuisine',
    label: 'Caisson bas cuisine',
    description: 'Meuble bas standard',
    icon: '🗄️'
  },
  {
    value: 'haut_cuisine',
    label: 'Caisson haut cuisine',
    description: 'Meuble mural suspendu',
    icon: '📦'
  },
  {
    value: 'colonne',
    label: 'Colonne',
    description: 'Meuble colonne toute hauteur',
    icon: '🗃️'
  },
  {
    value: 'tiroir',
    label: 'Caisson a tiroirs',
    description: 'Meuble avec tiroirs',
    icon: '🗂️'
  },
  {
    value: 'custom',
    label: 'Configuration libre',
    description: 'Personnaliser tous les parametres',
    icon: '⚙️'
  },
];

// === SURFACE MINIMUM ===

export const SURFACE_MINIMUM_PANNEAU = 0.25; // m2

// === ETAPES CONFIGURATION ===

export const ETAPES_CONFIG = [
  { numero: 1, nom: 'Structure', description: 'Panneaux haut, bas, gauche, droite' },
  { numero: 2, nom: 'Fond', description: 'Type de fond et panneau' },
  { numero: 3, nom: 'Facade', description: 'Type de facade et panneau' },
  { numero: 4, nom: 'Charnieres', description: 'Position et type de charnieres' },
] as const;

// === VALEURS PAR DEFAUT ===

export const CONFIG_DEFAUT = {
  hauteur: 800,
  largeur: 500,
  profondeur: 522,
  epaisseurStructure: 19,
  epaisseurFond: 8,
  epaisseurFacade: 19,
  typeFond: 'applique' as TypeFond,
  typeFacade: 'applique' as TypeFacade,
  profondeurRainure: 10,
  jeuFacade: 1.5,
  marqueCharniere: 'blum' as MarqueCharniere,
  typeCharniere: 'inserta' as TypeCharniere,
  angleCharniere: 110 as AngleCharniere,
} as const;
