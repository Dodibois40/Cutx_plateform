// lib/configurateur/constants.ts
// Constantes et tarifs pour le Configurateur V3 - Découpe panneau + Finition optionnelle

import type {
  OptionMateriau,
  OptionFinition,
  OptionBrillance,
  OptionUsinage,
  LignePrestationV3,
  Chants,
  CategoriePanneau,
  TypeFinition,
} from './types';

// === MATÉRIAUX ===
export const MATERIAUX: readonly OptionMateriau[] = [
  { value: 'mdf', label: 'MDF' },
  { value: 'plaque_bois', label: 'Panneau plaqué bois' },
  { value: 'bois_massif', label: 'Bois massif' },
  { value: 'melamine', label: 'Mélaminé' },
] as const;

// === FINITIONS ===
export const FINITIONS: readonly OptionFinition[] = [
  { value: 'laque', label: 'Laque' },
  { value: 'vernis', label: 'Vernis' },
] as const;

// === TYPES DE FINITION (menu déroulant sur ligne panneau) ===
export const TYPES_FINITION: { value: TypeFinition; label: string }[] = [
  { value: 'vernis', label: 'Vernis' },
  { value: 'teinte_vernis', label: 'Teinte + Vernis' },
  { value: 'laque', label: 'Laque' },
];

// === BRILLANCES AVEC PRIX (Tarifs Excel) ===
export const BRILLANCES: readonly OptionBrillance[] = [
  { value: 'soft_touch', label: 'Soft Touch', prixVernis: 46, prixLaque: 75 },
  { value: 'gloss_naturel', label: '0 Gloss Naturel', prixVernis: 42, prixLaque: null },
  { value: 'gloss_mat', label: '10 Gloss Mat', prixVernis: 40, prixLaque: 60 },
  { value: 'gloss_satine', label: '30 Gloss Satiné', prixVernis: 45, prixLaque: 70 },
  { value: 'gloss_brillant', label: '75 Gloss Brillant', prixVernis: 120, prixLaque: 180 },
  { value: 'gloss_poli_miroir', label: '90 Gloss Poli Miroir', prixVernis: 200, prixLaque: 260 },
] as const;

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

// === PLACEHOLDERS ===
export const PLACEHOLDERS = {
  reference: 'Réf: Débit 1',
  teinte: 'Ex: Chêne naturel',
  codeCouleurLaque: 'Ex: RAL 9010',
  referenceChantier: 'Ex: Cuisine Dupont',
} as const;

// === USINAGES DISPONIBLES ===
export const USINAGES_OPTIONS: readonly OptionUsinage[] = [
  { type: 'usinage_passe_main', label: 'Usinage passe main', prix: 20, unite: 'mètre linéaire' },
  { type: 'rainure_visible', label: 'Rainure visible', prix: 10, unite: 'mètre linéaire' },
  { type: 'moulure', label: 'Moulure', prix: 20, unite: 'mètre linéaire' },
] as const;

// === INFOBULLES (TOOLTIPS) ===
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

// === INDICATEURS D'ÉTAT ===
export const ETAT_INDICATEURS = {
  vide: { icone: '○', couleur: 'var(--admin-text-muted)', label: 'Vide' },
  en_cours: { icone: '◐', couleur: 'var(--admin-ardoise)', label: 'En cours' },
  complete: { icone: '●', couleur: 'var(--admin-olive)', label: 'Complète' },
  erreur: { icone: '⚠', couleur: 'var(--admin-status-danger)', label: 'Erreur' },
} as const;

// === CATÉGORIES DE PANNEAUX ===
export const CATEGORIES_PANNEAUX: { value: CategoriePanneau; label: string }[] = [
  { value: 'mdf', label: 'MDF Standard' },
  { value: 'mdf_hydro', label: 'MDF Hydrofuge' },
  { value: 'agglo_brut', label: 'Aggloméré brut' },
  { value: 'agglo_plaque', label: 'Aggloméré plaqué' },
  { value: 'cp', label: 'Contreplaqué' },
  { value: 'bois_massif', label: 'Bois massif' },
];

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

