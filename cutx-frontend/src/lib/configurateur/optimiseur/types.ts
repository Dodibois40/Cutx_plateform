// lib/configurateur/optimiseur/types.ts
// Types pour l'optimiseur de débit

import type { Chants } from '../types';

/**
 * Un débit à placer sur un panneau
 */
export interface DebitAOptimiser {
  id: string;
  reference: string;
  longueur: number;      // mm
  largeur: number;       // mm
  chants: Chants;        // Quels côtés ont un chant
  sensDuFil: 'longueur' | 'largeur';  // Orientation souhaitée du fil
}

/**
 * Un débit placé sur le panneau avec sa position
 */
export interface DebitPlace {
  id: string;
  reference: string;
  x: number;             // Position X sur le panneau (mm)
  y: number;             // Position Y sur le panneau (mm)
  longueur: number;      // mm (après rotation éventuelle)
  largeur: number;       // mm (après rotation éventuelle)
  rotation: boolean;     // true si le débit a été tourné de 90°
  chants: Chants;
}

/**
 * Une zone de chute (espace libre) sur le panneau
 */
export interface ZoneChute {
  id: string;
  x: number;             // Position X sur le panneau (mm)
  y: number;             // Position Y sur le panneau (mm)
  longueur: number;      // mm
  largeur: number;       // mm
  surface: number;       // m²
}

/**
 * Résultat pour un panneau brut
 */
export interface PanneauOptimise {
  index: number;                     // Numéro du panneau (1, 2, 3...)
  panneauId: string;                 // ID du panneau catalogue
  panneauNom: string;                // Nom du panneau
  dimensions: {
    longueur: number;                // mm
    largeur: number;                 // mm
    epaisseur: number;               // mm
  };
  prixM2?: number;                   // Prix au m² du panneau (pour calcul chutes)
  debitsPlaces: DebitPlace[];        // Débits placés sur ce panneau
  zonesChute: ZoneChute[];           // Zones de chute (espaces libres)
  surfaceUtilisee: number;           // m²
  surfaceTotale: number;             // m²
  tauxRemplissage: number;           // % (0-100)
  chute: number;                     // m² de chute
}

/**
 * Résultat global de l'optimisation
 */
export interface ResultatOptimisation {
  panneaux: PanneauOptimise[];       // Liste des panneaux nécessaires
  debitsNonPlaces: DebitAOptimiser[]; // Débits qui n'ont pas pu être placés
  nombrePanneaux: number;            // Total de panneaux bruts nécessaires
  surfaceTotaleDebits: number;       // Surface totale des débits
  surfaceTotalePanneaux: number;     // Surface totale des panneaux utilisés
  tauxRemplissageMoyen: number;      // Moyenne des taux de remplissage
  warnings?: string[];               // Avertissements (ex: pièces trop grandes)
}

/**
 * Stratégie de découpe (direction des coupes)
 */
export type SplitStrategy =
  | 'horizontal_first'    // Coupes horizontales d'abord → chutes en bandes horizontales
  | 'vertical_first'      // Coupes verticales d'abord → chutes en bandes verticales
  | 'shorter_leftover'    // Minimiser le plus petit reste (défaut, efficacité max)
  | 'longer_leftover'     // Maximiser les grandes chutes (chutes réutilisables)
  | 'min_area';           // Minimiser l'aire totale des restes

/**
 * Type d'optimisation principal
 */
export type OptimizationType =
  | 'minimize_waste'      // Minimiser les chutes (efficacité max)
  | 'minimize_sheets'     // Minimiser le nombre de panneaux
  | 'minimize_cuts';      // Minimiser le nombre de coupes

/**
 * Options pour l'optimisation
 */
export interface OptionsOptimisation {
  margeCoupe?: number;               // Marge entre les pièces (mm), défaut: 4mm
  respecterSensFil?: boolean;        // Forcer le respect du sens du fil, défaut: true
  splitStrategy?: SplitStrategy;     // Stratégie de découpe, défaut: 'shorter_leftover'
  optimizationType?: OptimizationType; // Type d'optimisation, défaut: 'minimize_waste'
  minOffcutLength?: number;          // Longueur min chute réutilisable (mm), défaut: 300
  minOffcutWidth?: number;           // Largeur min chute réutilisable (mm), défaut: 100
}
