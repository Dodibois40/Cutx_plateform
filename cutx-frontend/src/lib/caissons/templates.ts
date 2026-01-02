// lib/caissons/templates.ts
// Templates de caissons preconfigures (bases sur les donnees Blum)

import type { TemplateCaisson, TypeCaisson } from './types';

// === TEMPLATE CAISSON BAS CUISINE 500mm (Blum) ===

export const TEMPLATE_BAS_CUISINE_500: TemplateCaisson = {
  id: 'bas-cuisine-500',
  nom: 'Caisson bas cuisine 500mm',
  description: 'Caisson bas standard type Blum - Largeur 500mm',
  typeCaisson: 'bas_cuisine',
  imageUrl: null,

  // Dimensions par defaut (basees sur fichier Excel Blum)
  hauteurDefaut: 800,
  largeurDefaut: 500,
  profondeurDefaut: 522,

  // Contraintes
  hauteurMin: 600,
  hauteurMax: 900,
  largeurMin: 300,
  largeurMax: 1200,
  profondeurMin: 400,
  profondeurMax: 650,

  // Epaisseurs par defaut
  epaisseurStructureDefaut: 19,
  epaisseurFondDefaut: 8,
  epaisseurFacadeDefaut: 19,

  // Configuration par defaut
  typeFondDefaut: 'applique',
  typeFacadeDefaut: 'applique',
  avecFacadeDefaut: true,

  source: 'blum',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// === TEMPLATE CAISSON HAUT CUISINE ===

export const TEMPLATE_HAUT_CUISINE: TemplateCaisson = {
  id: 'haut-cuisine-600',
  nom: 'Caisson haut cuisine',
  description: 'Meuble mural suspendu - Standard cuisine',
  typeCaisson: 'haut_cuisine',
  imageUrl: null,

  hauteurDefaut: 720,
  largeurDefaut: 600,
  profondeurDefaut: 340,

  hauteurMin: 400,
  hauteurMax: 1000,
  largeurMin: 300,
  largeurMax: 1200,
  profondeurMin: 280,
  profondeurMax: 400,

  epaisseurStructureDefaut: 19,
  epaisseurFondDefaut: 8,
  epaisseurFacadeDefaut: 19,

  typeFondDefaut: 'applique',
  typeFacadeDefaut: 'applique',
  avecFacadeDefaut: true,

  source: 'blum',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// === TEMPLATE COLONNE ===

export const TEMPLATE_COLONNE: TemplateCaisson = {
  id: 'colonne-2200',
  nom: 'Colonne cuisine',
  description: 'Meuble colonne toute hauteur',
  typeCaisson: 'colonne',
  imageUrl: null,

  hauteurDefaut: 2200,
  largeurDefaut: 600,
  profondeurDefaut: 580,

  hauteurMin: 1800,
  hauteurMax: 2500,
  largeurMin: 400,
  largeurMax: 800,
  profondeurMin: 500,
  profondeurMax: 650,

  epaisseurStructureDefaut: 19,
  epaisseurFondDefaut: 8,
  epaisseurFacadeDefaut: 19,

  typeFondDefaut: 'applique',
  typeFacadeDefaut: 'applique',
  avecFacadeDefaut: true,

  source: 'blum',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// === TEMPLATE CAISSON A TIROIRS ===

export const TEMPLATE_TIROIR: TemplateCaisson = {
  id: 'tiroir-600',
  nom: 'Caisson a tiroirs',
  description: 'Meuble bas avec tiroirs',
  typeCaisson: 'tiroir',
  imageUrl: null,

  hauteurDefaut: 800,
  largeurDefaut: 600,
  profondeurDefaut: 522,

  hauteurMin: 600,
  hauteurMax: 900,
  largeurMin: 300,
  largeurMax: 1200,
  profondeurMin: 400,
  profondeurMax: 650,

  epaisseurStructureDefaut: 19,
  epaisseurFondDefaut: 8,
  epaisseurFacadeDefaut: 19,

  typeFondDefaut: 'applique',
  typeFacadeDefaut: 'applique',
  avecFacadeDefaut: false, // Pas de facade, les tiroirs sont la facade

  source: 'blum',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// === TEMPLATE CONFIGURATION LIBRE ===

export const TEMPLATE_CUSTOM: TemplateCaisson = {
  id: 'custom',
  nom: 'Configuration libre',
  description: 'Personnalisez toutes les dimensions',
  typeCaisson: 'custom',
  imageUrl: null,

  hauteurDefaut: 800,
  largeurDefaut: 500,
  profondeurDefaut: 500,

  hauteurMin: 200,
  hauteurMax: 2800,
  largeurMin: 100,
  largeurMax: 2800,
  profondeurMin: 100,
  profondeurMax: 2800,

  epaisseurStructureDefaut: 19,
  epaisseurFondDefaut: 8,
  epaisseurFacadeDefaut: 19,

  typeFondDefaut: 'applique',
  typeFacadeDefaut: 'applique',
  avecFacadeDefaut: true,

  source: 'custom',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// === LISTE DE TOUS LES TEMPLATES ===

export const TEMPLATES_CAISSONS: TemplateCaisson[] = [
  TEMPLATE_BAS_CUISINE_500,
  TEMPLATE_HAUT_CUISINE,
  TEMPLATE_COLONNE,
  TEMPLATE_TIROIR,
  TEMPLATE_CUSTOM,
];

// === FONCTION UTILITAIRE ===

export function getTemplateById(id: string): TemplateCaisson | undefined {
  return TEMPLATES_CAISSONS.find(t => t.id === id);
}

export function getTemplatesByType(type: TypeCaisson): TemplateCaisson[] {
  return TEMPLATES_CAISSONS.filter(t => t.typeCaisson === type);
}
