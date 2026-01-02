// lib/caissons/index.ts
// Point d'entree du module caissons

// Types
export * from './types';

// Constantes
export * from './constants';

// Calculs
export { calculerCaisson, validerConfigCaisson } from './calculs';

// Templates
export {
  TEMPLATES_CAISSONS,
  TEMPLATE_BAS_CUISINE_500,
  TEMPLATE_HAUT_CUISINE,
  TEMPLATE_COLONNE,
  TEMPLATE_TIROIR,
  TEMPLATE_CUSTOM,
  getTemplateById,
  getTemplatesByType,
} from './templates';

// Export vers configurateur
export {
  exporterCaissonVersConfigurateur,
  exporterCaissonRegroupeVersConfigurateur,
  genererResumeExport,
  type ResumeExport,
} from './export-configurateur';
