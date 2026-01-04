// lib/caissons/types.ts
// Types pour le module de configuration de caissons

import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import type { TypeEmbaseBlum } from './blum-hardware';

// Re-export pour faciliter les imports
export type { TypeEmbaseBlum } from './blum-hardware';

// === ENUMS & TYPES DE BASE ===

/** Types de caissons disponibles */
export type TypeCaisson =
  | 'bas_cuisine'      // Caisson bas cuisine (ex: 500mm DROIT)
  | 'haut_cuisine'     // Caisson haut mural
  | 'colonne'          // Colonne cuisine
  | 'tiroir'           // Caisson a tiroirs
  | 'custom';          // Configuration libre

/** Type de montage du fond */
export type TypeFond =
  | 'applique'         // Fond en applique (visse derriere)
  | 'encastre'         // Fond encastre dans rainure
  | 'feuillure'        // Fond en feuillure
  | 'rainure';         // Fond rainure

/** Type de montage de la facade */
export type TypeFacade =
  | 'applique'         // Facade en applique (recouvre les cotes)
  | 'encastre';        // Facade encastree (entre les cotes)

/** Position de l'ouverture des charnieres */
export type PositionCharniere = 'gauche' | 'droite';

/** Type de charniere Blum */
export type TypeCharniere =
  | 'a_visser'         // CLIP top standard (a visser)
  | 'inserta';         // CLIP top INSERTA (sans outil)

/** Marque de charniere */
export type MarqueCharniere = 'blum' | 'hettich' | 'grass' | 'hafele';

/** Angle d'ouverture charniere */
export type AngleCharniere = 95 | 107 | 110 | 155 | 170;

/** Type de panneau dans le caisson */
export type TypePanneauCaisson =
  | 'cote_gauche'
  | 'cote_droit'
  | 'haut'
  | 'bas'
  | 'fond'
  | 'facade';

// === INTERFACES PRINCIPALES ===

/** Configuration complete d'un caisson */
export interface ConfigCaisson {
  // Identifiants
  id: string;
  templateId: string | null;
  nom: string;
  typeCaisson: TypeCaisson;

  // Dimensions globales (inputs utilisateur)
  hauteur: number;                // 200 - 2800 mm
  largeur: number;                // 100 - 2800 mm
  profondeur: number;             // 100 - 2800 mm

  // Epaisseurs
  epaisseurStructure: number;     // 16, 18, 19, 22 mm
  epaisseurFond: number;          // 3, 5, 8 mm
  epaisseurFacade: number;        // 16, 18, 19, 22 mm

  // Panneaux selectionnes (depuis catalogue)
  panneauStructureId: string | null;
  panneauStructure: PanneauCatalogue | null;
  panneauFondId: string | null;
  panneauFond: PanneauCatalogue | null;
  panneauFacadeId: string | null;
  panneauFacade: PanneauCatalogue | null;

  // Configuration fond
  typeFond: TypeFond;
  profondeurRainure: number;      // Si rainure: 8-15mm

  // Configuration facade
  typeFacade: TypeFacade;
  jeuFacade: number;              // Jeu facade (1-3mm)

  // Charnieres
  avecFacade: boolean;            // false = caisson ouvert
  positionCharniere: PositionCharniere;
  marqueCharniere: MarqueCharniere;
  typeCharniere: TypeCharniere;
  angleCharniere: AngleCharniere;
  nombreCharnieres: number;       // Auto-calcule
  referenceCharniere: string;     // Reference Blum (ex: 71B3590)
  typeEmbase: TypeEmbaseBlum;     // Type d'embase (EXPANDO, Wing, INSERTA) ou manuel

  // Etat du formulaire
  etapeActive: 1 | 2 | 3 | 4;
  isValid: boolean;
  erreurs: string[];
}

/** Panneau calcule automatiquement */
export interface PanneauCalcule {
  id: string;
  nom: string;                    // "Cote gauche", "Panneau superieur"...
  nomCourt: string;               // "CG", "PS"...
  type: TypePanneauCaisson;
  longueur: number;               // mm
  largeur: number;                // mm
  epaisseur: number;              // mm
  quantite: number;
  surfaceM2: number;
  surfaceFacturee: number;        // Avec minimum 0.25m2
  chants: ChantsConfiguration;
  metresLineairesChants: number;
  panneauSource: PanneauCatalogue | null;
}

/** Configuration des chants pour un panneau */
export interface ChantsConfiguration {
  A: boolean;  // Longueur cote 1
  B: boolean;  // Largeur cote 1
  C: boolean;  // Longueur cote 2
  D: boolean;  // Largeur cote 2
}

/** Resultat du calcul complet d'un caisson */
export interface ResultatCalculCaisson {
  config: ConfigCaisson;
  panneaux: PanneauCalcule[];
  charnieres: CharniereConfig[];

  // Totaux
  surfaceTotaleM2: number;
  metresLineairesTotaux: number;
  nombrePanneaux: number;

  // Prix (si panneaux selectionnes)
  prixPanneauxHT: number;
  prixChantsHT: number;
  prixCharnieresHT: number;
  prixTotalHT: number;
}

/** Configuration d'une charniere */
export interface CharniereConfig {
  reference: string;              // ex: "71B3590"
  nom: string;                    // ex: "CLIP top BLUMOTION 110"
  marque: MarqueCharniere;
  type: TypeCharniere;
  angle: AngleCharniere;
  couleur: string;                // ex: "noir onyx"
  quantite: number;
  prixUnitaire: number;

  // Accessoires associes
  embase: {
    reference: string;
    nom: string;
    prixUnitaire: number;
  };
  cache: {
    reference: string;
    nom: string;
    prixUnitaire: number;
  };
}

// === TEMPLATES ===

/** Template de caisson predefini */
export interface TemplateCaisson {
  id: string;
  nom: string;
  description: string;
  typeCaisson: TypeCaisson;
  imageUrl: string | null;

  // Dimensions par defaut
  hauteurDefaut: number;
  largeurDefaut: number;
  profondeurDefaut: number;

  // Contraintes dimensions
  hauteurMin: number;
  hauteurMax: number;
  largeurMin: number;
  largeurMax: number;
  profondeurMin: number;
  profondeurMax: number;

  // Epaisseurs par defaut
  epaisseurStructureDefaut: number;
  epaisseurFondDefaut: number;
  epaisseurFacadeDefaut: number;

  // Configuration par defaut
  typeFondDefaut: TypeFond;
  typeFacadeDefaut: TypeFacade;
  avecFacadeDefaut: boolean;

  // Metadata
  source: 'blum' | 'hettich' | 'custom';
  createdAt: Date;
  updatedAt: Date;
}

// === ETATS FORMULAIRE ===

/** Etat de l'etape 1: Structure */
export interface EtapeStructureState {
  hauteur: number;
  largeur: number;
  profondeur: number;
  epaisseurStructure: number;
  panneauStructure: PanneauCatalogue | null;
  isValid: boolean;
  erreurs: string[];
}

/** Etat de l'etape 2: Fond */
export interface EtapeFondState {
  typeFond: TypeFond;
  epaisseurFond: number;
  profondeurRainure: number;
  panneauFond: PanneauCatalogue | null;
  isValid: boolean;
  erreurs: string[];
}

/** Etat de l'etape 3: Facade */
export interface EtapeFacadeState {
  avecFacade: boolean;
  typeFacade: TypeFacade;
  epaisseurFacade: number;
  jeuFacade: number;
  panneauFacade: PanneauCatalogue | null;
  isValid: boolean;
  erreurs: string[];
}

/** Etat de l'etape 4: Charnieres */
export interface EtapeCharnièresState {
  positionCharniere: PositionCharniere;
  marqueCharniere: MarqueCharniere;
  typeCharniere: TypeCharniere;
  angleCharniere: AngleCharniere;
  nombreCharnieres: number;
  isValid: boolean;
  erreurs: string[];
}

// === PREVIEW 3D ===

/** Configuration pour la preview 3D */
export interface Preview3DConfig {
  showDimensions: boolean;
  showChants: boolean;
  showCharnieres: boolean;
  cameraPosition: [number, number, number];
  zoom: number;
  rotation: [number, number, number];
}

/** Couleurs des panneaux pour la 3D */
export interface CouleursPanneaux3D {
  structure: string;      // hex color
  fond: string;
  facade: string;
  chants: string;
}
