/**
 * CutX PDF Templates
 *
 * Module d'export PDF pour l'optimiseur de découpe.
 *
 * 2 exports disponibles:
 * - Plan de Découpe (pour l'atelier)
 * - Catalogue Chutes (pour la marketplace)
 *
 * Architecture maintenable:
 * - styles/pdf-styles.ts : Tous les styles en 1 endroit
 * - components/ : Composants réutilisables
 * - documents/ : Documents PDF complets
 * - generators/ : Fonctions de génération et téléchargement
 */

// === Types ===
export type {
  PdfExportOptions,
  CuttingPlanData,
  OffcutItem,
  OffcutsCatalogData,
  PanneauOptimise,
  DebitPlace,
  ZoneChute,
} from './types';

export { PDF_CONFIG } from './types';

// === Générateurs (API principale) ===
export {
  generateCuttingPlanPdf,
  downloadCuttingPlanPdf,
  generateOffcutsCatalogPdf,
  downloadOffcutsCatalogPdf,
  collectOffcuts,
} from './generators';

// === Styles (pour personnalisation) ===
export {
  colors,
  fonts,
  spacing,
  formatDate,
  formatDateFile,
} from './styles/pdf-styles';

// === Documents (pour usage avancé) ===
export { CuttingPlanDocument } from './documents/CuttingPlanDocument';
export { OffcutsCatalogDocument } from './documents/OffcutsCatalogDocument';

// === Composants (pour usage avancé) ===
export {
  PdfHeader,
  PdfFooter,
  PdfPiecesTable,
  PdfStatsBar,
  PdfPanelVisualization,
  OffcutCard,
} from './components';
