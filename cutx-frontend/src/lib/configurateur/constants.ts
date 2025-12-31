// lib/configurateur/constants.ts
// Constantes et tarifs pour le Configurateur V3 - Découpe panneau + Finition optionnelle
// i18n: Labels are now translation keys - use with t() function from next-intl

import type {
  LignePrestationV3,
  Chants,
  CategoriePanneau,
  TypeFinition,
  Brillance,
  Finition,
} from './types';

// === MATÉRIAUX (values only - labels come from translations) ===
export const MATERIAUX_VALUES = ['mdf', 'plaque_bois', 'bois_massif', 'melamine'] as const;
export type MateriauValue = typeof MATERIAUX_VALUES[number];

// Mapping from value to translation key path
export const MATERIAUX_TRANSLATION_KEYS: Record<MateriauValue, string> = {
  mdf: 'products.materials.mdf',
  plaque_bois: 'products.materials.plaqueBois',
  bois_massif: 'products.materials.boisMassif',
  melamine: 'products.materials.melamine',
};

// === FINITIONS (values only - labels come from translations) ===
export const FINITIONS_VALUES: readonly Finition[] = ['laque', 'vernis'] as const;

export const FINITIONS_TRANSLATION_KEYS: Record<Finition, string> = {
  laque: 'products.finishes.lacquer',
  vernis: 'products.finishes.varnish',
};

// === TYPES DE FINITION (menu déroulant sur ligne panneau) ===
export const TYPES_FINITION_VALUES: readonly TypeFinition[] = ['vernis', 'teinte_vernis', 'laque'] as const;

export const TYPES_FINITION_TRANSLATION_KEYS: Record<TypeFinition, string> = {
  vernis: 'configurateur.finish.varnish',
  teinte_vernis: 'configurateur.finish.tintVarnish',
  laque: 'configurateur.finish.lacquer',
};

// === BRILLANCES AVEC PRIX (Tarifs Excel) ===
export const BRILLANCES_VALUES: readonly Brillance[] = [
  'soft_touch',
  'gloss_naturel',
  'gloss_mat',
  'gloss_satine',
  'gloss_brillant',
  'gloss_poli_miroir',
] as const;

export interface BrillancePricing {
  value: Brillance;
  prixVernis: number | null;
  prixLaque: number | null;
}

export const BRILLANCES_PRICING: readonly BrillancePricing[] = [
  { value: 'soft_touch', prixVernis: 46, prixLaque: 75 },
  { value: 'gloss_naturel', prixVernis: 42, prixLaque: null },
  { value: 'gloss_mat', prixVernis: 40, prixLaque: 60 },
  { value: 'gloss_satine', prixVernis: 45, prixLaque: 70 },
  { value: 'gloss_brillant', prixVernis: 120, prixLaque: 180 },
  { value: 'gloss_poli_miroir', prixVernis: 200, prixLaque: 260 },
] as const;

export const BRILLANCES_TRANSLATION_KEYS: Record<Brillance, string> = {
  soft_touch: 'products.gloss.softTouch',
  gloss_naturel: 'products.gloss.glossNatural',
  gloss_mat: 'products.gloss.glossMat',
  gloss_satine: 'products.gloss.glossSatin',
  gloss_brillant: 'products.gloss.glossBrilliant',
  gloss_poli_miroir: 'products.gloss.glossMirror',
};

// Helper to get brillance pricing by value
export function getBrillancePricing(value: Brillance): BrillancePricing | undefined {
  return BRILLANCES_PRICING.find(b => b.value === value);
}

// === RÈGLES DE CALCUL (Depuis Excel) ===
export const REGLES = {
  SURFACE_MINIMUM: 0.25,           // m² minimum facturable par face (le client peut commander moins, on facture ce minimum)
  MINIMUM_COMMANDE_HT: 120,        // € HT minimum par commande (informatif, pas bloquant)
  PRIX_TEINTE_VERNIS: 10,          // €/m² supplément teinte vernis
  PRIX_PERCAGE_UNITE: 2,           // € par perçage (forfait)
  PRIX_CHANT_ML_LAQUE: 8,          // €/mL (chants laqués)
  PRIX_CHANT_ML_VERNIS_TEINTE: 6,  // €/mL (chants vernis avec teinte)
  PRIX_CHANT_ML_VERNIS: 4,         // €/mL (chants vernis seuls)
  TVA_TAUX: 0.20,                  // 20%
} as const;

// === VALEURS PAR DÉFAUT POUR NOUVELLE LIGNE ===
export const DEFAULTS = {
  chants: { A: true, B: true, C: true, D: true } as Chants,
  nombreFaces: 1 as const,
  epaisseur: 0, // Vide par défaut, sera rempli quand un panneau est sélectionné
  percage: false,
} as const;

// === PLACEHOLDERS (translation keys for use with t()) ===
export const PLACEHOLDER_KEYS = {
  reference: 'configurateur.placeholders.reference',
  teinte: 'configurateur.placeholders.tint',
  codeCouleurLaque: 'configurateur.placeholders.lacquerCode',
  referenceChantier: 'configurateur.placeholders.projectReference',
} as const;

// === USINAGES DISPONIBLES (values with pricing - labels from translations) ===
export type UsinageType = 'usinage_passe_main' | 'rainure_visible' | 'moulure';

export interface UsinagePricing {
  type: UsinageType;
  prix: number;
  uniteKey: string; // Translation key for unit
}

export const USINAGES_VALUES: readonly UsinageType[] = [
  'usinage_passe_main',
  'rainure_visible',
  'moulure',
] as const;

export const USINAGES_PRICING: readonly UsinagePricing[] = [
  { type: 'usinage_passe_main', prix: 20, uniteKey: 'products.machiningUnits.linearMeter' },
  { type: 'rainure_visible', prix: 10, uniteKey: 'products.machiningUnits.linearMeter' },
  { type: 'moulure', prix: 20, uniteKey: 'products.machiningUnits.linearMeter' },
] as const;

export const USINAGES_TRANSLATION_KEYS: Record<UsinageType, string> = {
  usinage_passe_main: 'products.machining.handleGroove',
  rainure_visible: 'products.machining.visibleGroove',
  moulure: 'products.machining.moulding',
};

// Helper to get usinage pricing by type
export function getUsinagePricing(type: UsinageType): UsinagePricing | undefined {
  return USINAGES_PRICING.find(u => u.type === type);
}

// === INFOBULLES (TOOLTIPS) - translation keys ===
export const TOOLTIP_KEYS = {
  reference: 'configurateur.tooltips.reference',
  materiaux: 'configurateur.tooltips.materials',
  finition: 'configurateur.tooltips.finish',
  teinte: 'configurateur.tooltips.tint',
  codeCouleurLaque: 'configurateur.tooltips.lacquerCode',
  brillance: 'configurateur.tooltips.gloss',
  dimensions: 'configurateur.tooltips.dimensions',
  faces: 'configurateur.tooltips.faces',
  chants: 'configurateur.tooltips.edges',
  usinages: 'configurateur.tooltips.machining',
  percage: 'configurateur.tooltips.drilling',
  copier: 'configurateur.tooltips.copy',
  surfaceMin: 'configurateur.tooltips.minSurface',
} as const;

// === INDICATEURS D'ÉTAT (translation keys + styling) ===
export type EtatIndicateurKey = 'vide' | 'en_cours' | 'complete' | 'erreur';

export interface EtatIndicateur {
  icone: string;
  couleur: string;
  /** @deprecated Use labelKey with t() for i18n */
  label: string; // French fallback for backward compatibility
  labelKey: string; // Translation key
}

export const ETAT_INDICATEURS: Record<EtatIndicateurKey, EtatIndicateur> = {
  vide: { icone: '○', couleur: 'var(--admin-text-muted)', label: 'Vide', labelKey: 'configurateur.status.empty' },
  en_cours: { icone: '◐', couleur: 'var(--admin-ardoise)', label: 'En cours', labelKey: 'configurateur.status.inProgress' },
  complete: { icone: '●', couleur: 'var(--admin-olive)', label: 'Complète', labelKey: 'configurateur.status.complete' },
  erreur: { icone: '⚠', couleur: 'var(--admin-status-danger)', label: 'Erreur', labelKey: 'configurateur.status.error' },
} as const;

// === CATÉGORIES DE PANNEAUX ===
export const CATEGORIES_PANNEAUX_VALUES: readonly CategoriePanneau[] = [
  'mdf',
  'mdf_hydro',
  'agglo_brut',
  'agglo_plaque',
  'cp',
  'bois_massif',
] as const;

export const CATEGORIES_PANNEAUX_TRANSLATION_KEYS: Record<CategoriePanneau, string> = {
  mdf: 'products.panelCategories.mdf',
  mdf_hydro: 'products.panelCategories.mdfHydro',
  agglo_brut: 'products.panelCategories.chipboardRaw',
  agglo_plaque: 'products.panelCategories.chipboardVeneer',
  cp: 'products.panelCategories.plywood',
  bois_massif: 'products.panelCategories.solidWood',
};

// === BACKWARD COMPATIBILITY: Legacy exports with label field ===
// These are deprecated - use the *_VALUES and *_TRANSLATION_KEYS instead
// Components should migrate to using t(TRANSLATION_KEYS[value]) pattern

/** @deprecated Use MATERIAUX_VALUES and MATERIAUX_TRANSLATION_KEYS with t() */
export const MATERIAUX = MATERIAUX_VALUES.map(value => ({
  value,
  label: value, // Placeholder - component should use t(MATERIAUX_TRANSLATION_KEYS[value])
}));

/** @deprecated Use FINITIONS_VALUES and FINITIONS_TRANSLATION_KEYS with t() */
export const FINITIONS = FINITIONS_VALUES.map(value => ({
  value,
  label: value, // Placeholder - component should use t(FINITIONS_TRANSLATION_KEYS[value])
}));

/** @deprecated Use TYPES_FINITION_VALUES and TYPES_FINITION_TRANSLATION_KEYS with t() */
export const TYPES_FINITION = TYPES_FINITION_VALUES.map(value => ({
  value,
  label: value, // Placeholder - component should use t(TYPES_FINITION_TRANSLATION_KEYS[value])
}));

/** @deprecated Use BRILLANCES_PRICING and BRILLANCES_TRANSLATION_KEYS with t() */
export const BRILLANCES = BRILLANCES_PRICING.map(b => ({
  value: b.value,
  label: b.value, // Placeholder - component should use t(BRILLANCES_TRANSLATION_KEYS[value])
  prixVernis: b.prixVernis,
  prixLaque: b.prixLaque,
}));

/** @deprecated Use USINAGES_PRICING and USINAGES_TRANSLATION_KEYS with t() */
export const USINAGES_OPTIONS = USINAGES_PRICING.map(u => ({
  type: u.type,
  label: u.type, // Placeholder - component should use t(USINAGES_TRANSLATION_KEYS[type])
  prix: u.prix,
  unite: 'mètre linéaire', // Legacy - component should use t(u.uniteKey)
}));

/** @deprecated Use CATEGORIES_PANNEAUX_VALUES and CATEGORIES_PANNEAUX_TRANSLATION_KEYS with t() */
export const CATEGORIES_PANNEAUX = CATEGORIES_PANNEAUX_VALUES.map(value => ({
  value,
  label: value, // Placeholder - component should use t(CATEGORIES_PANNEAUX_TRANSLATION_KEYS[value])
}));

// === Legacy PLACEHOLDERS and TOOLTIPS for backward compat ===
/** @deprecated Use PLACEHOLDER_KEYS with t() */
export const PLACEHOLDERS = {
  reference: 'Réf: Débit 1',
  teinte: 'Ex: Chêne naturel',
  codeCouleurLaque: 'Ex: RAL 9010',
  referenceChantier: 'Ex: Cuisine Dupont',
} as const;

/** @deprecated Use TOOLTIP_KEYS with t() */
export const TOOLTIPS = {
  reference: 'Identifiant unique de la pièce (ex: FT1 - Façade tiroir)',
  materiaux: 'Type de support à traiter',
  finition: 'Laque = couleur opaque / Vernis = transparent ou teinté',
  teinte: 'Apparaît si Vernis. Supplément +10€/m² si teinte personnalisée',
  codeCouleurLaque: 'Code RAL',
  brillance: 'Niveau de brillance. Prix variable selon finition',
  dimensions: 'Longueur × Largeur × Épaisseur en millimètres',
  faces: 'Nombre de faces à traiter (1 ou 2). Prix multiplié par 2 si 2 faces',
  chants: 'Côtés à laquer/vernir. A et C = longueurs, B et D = largeurs',
  usinages: 'Options de façonnage supplémentaires (rainures, moulures...)',
  percage: 'Option de perçage pour vos panneaux. Forfait : 2€ par pièce',
  copier: 'Duplique la ligne. Vous devrez saisir une nouvelle référence',
  surfaceMin: 'Minimum facturable : 0.25 m² par face',
} as const;

// === FONCTION POUR CRÉER UNE NOUVELLE LIGNE PANNEAU ===
export function creerNouvelleLigne(): LignePrestationV3 {
  return {
    id: crypto.randomUUID(),
    reference: '',

    // Type de ligne
    typeLigne: 'panneau',
    ligneParentId: null,

    // Sélections panneau
    materiau: null,

    // Dimensions
    dimensions: {
      longueur: 0,
      largeur: 0,
      epaisseur: DEFAULTS.epaisseur,
    },
    chants: { ...DEFAULTS.chants },
    sensDuFil: 'longueur',

    // Options panneau
    usinages: [],
    percage: DEFAULTS.percage,

    // Fourniture panneau
    avecFourniture: false,
    panneauId: null,
    panneauNom: null,
    panneauImageUrl: null,
    prixPanneauM2: 0,

    // Finition optionnelle
    avecFinition: false,
    typeFinition: null,

    // Détails finition (pour lignes finition)
    finition: null,
    teinte: null,
    codeCouleurLaque: null,
    brillance: null,
    nombreFaces: DEFAULTS.nombreFaces,

    // Calculs (initialisés à 0)
    surfaceM2: 0,
    surfaceFacturee: 0,
    metresLineairesChants: 0,

    // Prix (initialisés à 0)
    prixPanneau: 0,
    prixFaces: 0,
    prixChants: 0,
    prixUsinages: 0,
    prixPercage: 0,
    prixFournitureHT: 0,
    prixPrestationHT: 0,
    prixHT: 0,
    prixTTC: 0,
  };
}

// === FONCTION POUR CRÉER UNE LIGNE FINITION (sous-ligne) ===
export function creerLigneFinition(lignePanneau: LignePrestationV3): LignePrestationV3 {
  // Déterminer le type de finition pour les calculs
  const finition = lignePanneau.typeFinition === 'laque' ? 'laque' : 'vernis';

  return {
    id: crypto.randomUUID(),
    reference: `${lignePanneau.reference} - Finition`,

    // Type de ligne = finition, liée au panneau parent
    typeLigne: 'finition',
    ligneParentId: lignePanneau.id,

    // Copie des infos du panneau parent
    materiau: lignePanneau.materiau,

    // Copie des dimensions du panneau parent
    dimensions: { ...lignePanneau.dimensions },
    chants: { A: false, B: false, C: false, D: false }, // Pas de chants par défaut sur finition
    sensDuFil: lignePanneau.sensDuFil || 'longueur',

    // Pas d'usinages ni perçage sur ligne finition
    usinages: [],
    percage: false,

    // Pas de fourniture sur ligne finition
    avecFourniture: false,
    panneauId: null,
    panneauNom: null,
    panneauImageUrl: null,
    prixPanneauM2: 0,

    // Finition configurée
    avecFinition: true,
    typeFinition: lignePanneau.typeFinition,
    finition: finition,
    teinte: null,
    codeCouleurLaque: null,
    brillance: null,
    nombreFaces: 1, // Par défaut 1 face

    // Calculs (initialisés à 0)
    surfaceM2: 0,
    surfaceFacturee: 0,
    metresLineairesChants: 0,

    // Prix (initialisés à 0)
    prixPanneau: 0,
    prixFaces: 0,
    prixChants: 0,
    prixUsinages: 0,
    prixPercage: 0,
    prixFournitureHT: 0,
    prixPrestationHT: 0,
    prixHT: 0,
    prixTTC: 0,
  };
}
