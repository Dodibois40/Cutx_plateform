/**
 * Types pour la génération de PDF
 * CutX Platform
 */

import type { PanneauOptimise, DebitPlace, ZoneChute } from '../types';

// Re-export pour faciliter les imports
export type { PanneauOptimise, DebitPlace, ZoneChute };

/**
 * Options d'export PDF
 */
export interface PdfExportOptions {
  type: 'cutting-plan' | 'offcuts-catalog';
  mode: 'current' | 'all';
  projectName?: string;
}

/**
 * Données pour le PDF Plan de Découpe
 */
export interface CuttingPlanData {
  panneaux: PanneauOptimise[];
  projectName: string;
  generatedAt: Date;
}

/**
 * Item de chute pour le catalogue
 */
export interface OffcutItem {
  id: string;
  materiau: string;
  decor: string;
  epaisseur: number;
  longueur: number;
  largeur: number;
  surface: number; // en m²
  prixEstime: number;
  panneauIndex: number;
}

/**
 * Données pour le PDF Catalogue Chutes
 */
export interface OffcutsCatalogData {
  offcuts: OffcutItem[];
  projectName: string;
  generatedAt: Date;
  totalSurface: number;
  totalValue: number;
}

/**
 * Props communes pour les composants PDF
 */
export interface PdfHeaderProps {
  title: string;
  projectName?: string;
  date: string;
}

export interface PdfFooterProps {
  // Footer est auto-généré avec numéros de page
}

/**
 * Constantes de configuration
 */
export const PDF_CONFIG = {
  // Seuil minimum pour qu'une chute soit valorisable (en mm)
  OFFCUT_MIN_SIZE: 200,
  // Ratio de prix pour les chutes (70% du prix neuf)
  OFFCUT_PRICE_RATIO: 0.7,
  // Prix estimé au m² pour les chutes (si pas de prix source)
  OFFCUT_DEFAULT_PRICE_PER_M2: 50,
} as const;
