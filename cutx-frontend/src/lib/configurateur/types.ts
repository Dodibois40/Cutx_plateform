// lib/configurateur/types.ts
// Types pour le Configurateur V3 - Découpe panneau + Finition optionnelle

// Matériaux prédéfinis + possibilité de saisir un matériau personnalisé
export type Materiau = string;

// Type de finition (choix initial)
export type TypeFinition = 'vernis' | 'teinte_vernis' | 'laque';

// Finition détaillée (pour rétro-compatibilité et calculs)
export type Finition = 'laque' | 'vernis';

// Type de ligne
export type TypeLigne = 'panneau' | 'finition';

export type Brillance =
  | 'soft_touch'
  | 'gloss_naturel'
  | 'gloss_mat'
  | 'gloss_satine'
  | 'gloss_brillant'
  | 'gloss_poli_miroir';

export interface Dimensions {
  longueur: number; // mm
  largeur: number;  // mm
  epaisseur: number; // mm - Épaisseur des panneaux
}

export interface Chants {
  A: boolean; // Longueur côté 1
  B: boolean; // Largeur côté 1
  C: boolean; // Longueur côté 2
  D: boolean; // Largeur côté 2
}

// === FORMES DE PANNEAU ===
export type FormePanneau =
  | 'rectangle'      // 4 côtés - défaut
  | 'pentagon'       // 5 côtés (L-shape)
  | 'circle'         // Rond
  | 'ellipse'        // Ovale
  | 'triangle'       // Triangle
  | 'custom';        // Import DXF

// Chants pour triangle (3 côtés)
export interface ChantsTriangle {
  A: boolean; // Côté 1 (base)
  B: boolean; // Côté 2 (hauteur)
  C: boolean; // Côté 3 (hypoténuse)
}

// Chants pour pentagon/L-shape (5 côtés)
export interface ChantsPentagon {
  A: boolean; // Côté 1
  B: boolean; // Côté 2
  C: boolean; // Côté 3
  D: boolean; // Côté 4
  E: boolean; // Côté 5
}

// Chants pour formes courbes (cercle, ellipse, custom)
export interface ChantsCurved {
  contour: boolean; // Contour complet
}

// Configuration chants dynamique selon la forme
export type ChantsConfig =
  | { type: 'rectangle'; edges: Chants }
  | { type: 'triangle'; edges: ChantsTriangle }
  | { type: 'pentagon'; edges: ChantsPentagon }
  | { type: 'curved'; edges: ChantsCurved };

// Coin où se trouve la coupe sur un L-shape (E1=haut-gauche, E2=haut-droite, E3=bas-droite, E4=bas-gauche)
export type CoinCoupe = 'E1' | 'E2' | 'E3' | 'E4';

// Dimensions spécifiques pour L-shape (6 valeurs + coin)
export interface DimensionsLShape {
  longueurTotale: number;   // L1: Longueur totale (mm)
  largeurTotale: number;    // W1: Largeur totale (mm)
  longueurEncoche: number;  // L2: Longueur de l'encoche (mm)
  largeurEncoche: number;   // W2: Largeur de l'encoche (mm)
  epaisseur: number;        // Épaisseur (mm)
  coinCoupe?: CoinCoupe;    // Coin où se trouve la coupe (E1=haut-gauche, E2=haut-droite, E3=bas-droite, E4=bas-gauche)
}

// Forme personnalisée depuis DXF
export interface FormeCustom {
  dxfData: string;           // Contenu DXF encodé base64
  surfaceM2: number;         // Surface calculée depuis DXF
  perimetreM: number;        // Périmètre calculé depuis DXF
  boundingBox: {
    width: number;
    height: number;
  };
}

export interface Usinage {
  type: string;
  description: string;
  prixUnitaire: number;
  quantite: number;
}

export type EtatLigne = 'vide' | 'en_cours' | 'complete' | 'erreur';

// Sens du fil du bois
export type SensDuFil = 'longueur' | 'largeur';

export interface LignePrestationV3 {
  id: string;
  reference: string;

  // === TYPE DE LIGNE ===
  typeLigne: TypeLigne;             // 'panneau' ou 'finition'
  ligneParentId: string | null;     // Si typeLigne='finition', référence à la ligne panneau

  // === SÉLECTIONS PANNEAU ===
  materiau: Materiau | null;

  // Dimensions
  dimensions: Dimensions;
  chants: Chants;
  sensDuFil: SensDuFil;             // Sens du fil pour l'optimisation

  // === FORME DU PANNEAU ===
  forme: FormePanneau;              // Forme géométrique (défaut: 'rectangle')
  chantsConfig: ChantsConfig;       // Configuration chants dynamique selon forme
  dimensionsLShape: DimensionsLShape | null;  // Dimensions L-shape (si forme='pentagon')
  formeCustom: FormeCustom | null;  // Données forme custom DXF (si forme='custom')

  // Options panneau
  usinages: Usinage[];
  percage: boolean;                 // Perçage oui/non

  // === FOURNITURE PANNEAU ===
  avecFourniture: boolean;          // Toggle fourniture oui/non
  panneauId: string | null;         // Référence panneau choisi
  panneauNom: string | null;        // Nom du panneau pour affichage
  panneauImageUrl: string | null;   // URL de l'image du panneau
  prixPanneauM2: number;            // Prix au m² du panneau

  // === FINITION (optionnelle sur ligne panneau) ===
  avecFinition: boolean;            // Checkbox "Appliquer une finition ?"
  typeFinition: TypeFinition | null; // 'vernis' | 'teinte_vernis' | 'laque'

  // === DÉTAILS FINITION (pour lignes de type 'finition') ===
  finition: Finition | null;        // Pour calculs: 'laque' ou 'vernis'
  teinte: string | null;            // Si vernis ou teinte_vernis
  codeCouleurLaque: string | null;  // Si laque (RAL)
  brillance: Brillance | null;
  nombreFaces: 1 | 2;

  // Calculs (générés)
  surfaceM2: number;
  surfaceFacturee: number;          // Avec minimum 0.25m²
  metresLineairesChants: number;

  // Prix (générés)
  prixPanneau: number;              // Prix fourniture panneau
  prixFaces: number;
  prixChants: number;
  prixUsinages: number;
  prixPercage: number;              // Prix perçage
  prixFournitureHT: number;         // Sous-total fourniture
  prixPrestationHT: number;         // Sous-total prestation (finition)
  prixHT: number;                   // Total ligne
  prixTTC: number;
}


export interface ConfigurateurV3State {
  referenceChantier: string;
  lignes: LignePrestationV3[];

  // Totaux
  totalFournitureHT: number;  // Total fourniture
  totalPrestationHT: number;  // Total prestation
  totalHT: number;
  totalTVA: number;
  totalTTC: number;

  // Validation
  isValid: boolean;
  erreurs: string[];
}


export interface PrixCalcule {
  surfaceM2: number;
  surfaceFacturee: number;
  metresLineairesChants: number;
  prixFaces: number;
  prixChants: number;
  prixPercage: number;
  prixUsinages: number;
  prixHT: number;
  prixTVA: number;
  prixTTC: number;
}

export interface ValidationResult {
  isValid: boolean;
  erreurs: string[];
}

export interface ModalCopieState {
  open: boolean;
  ligneSource: LignePrestationV3 | null;
  nouvelleReference: string;
}

// Options pour les dropdowns
export interface OptionMateriau {
  value: Materiau;
  label: string;
}

export interface OptionFinition {
  value: Finition;
  label: string;
}

export interface OptionBrillance {
  value: Brillance;
  label: string;
  prixVernis: number | null;
  prixLaque: number | null;
}

export interface OptionUsinage {
  type: string;
  label: string;
  prix: number;
  unite: string;
}

// === NOUVEAUTÉS V3 : Types pour la fourniture de panneaux ===

export type CategoriePanneau =
  | 'mdf'           // MDF standard
  | 'mdf_hydro'     // MDF hydrofuge
  | 'agglo_brut'    // Aggloméré brut
  | 'agglo_plaque'  // Aggloméré plaqué
  | 'cp'            // Contreplaqué
  | 'bois_massif';  // Bois massif

