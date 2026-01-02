// lib/caissons/calculs.ts
// Formules de calcul pour les panneaux de caissons

import type {
  ConfigCaisson,
  PanneauCalcule,
  ResultatCalculCaisson,
  ChantsConfiguration,
  CharniereConfig,
  TypePanneauCaisson
} from './types';
import {
  SURFACE_MINIMUM_PANNEAU,
  calculerNombreCharnieres,
  CHARNIERES_BLUM
} from './constants';

// === GENERATION ID ===

function genererIdPanneau(): string {
  return `pan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// === CALCUL SURFACE ===

function calculerSurfaceM2(longueur: number, largeur: number): number {
  return (longueur * largeur) / 1_000_000;
}

function calculerSurfaceFacturee(surfaceM2: number): number {
  return Math.max(surfaceM2, SURFACE_MINIMUM_PANNEAU);
}

// === CALCUL METRES LINEAIRES CHANTS ===

function calculerMetresLineairesChants(
  longueur: number,
  largeur: number,
  chants: ChantsConfiguration
): number {
  let total = 0;
  if (chants.A) total += longueur;
  if (chants.B) total += largeur;
  if (chants.C) total += longueur;
  if (chants.D) total += largeur;
  return total / 1000; // Conversion mm -> m
}

// === CHANTS PAR DEFAUT SELON TYPE ===

function getChantsDefautPourType(type: TypePanneauCaisson): ChantsConfiguration {
  switch (type) {
    case 'cote_gauche':
    case 'cote_droit':
      // Chant sur face avant uniquement
      return { A: true, B: false, C: false, D: false };

    case 'haut':
    case 'bas':
      // Chant sur face avant uniquement
      return { A: true, B: false, C: false, D: false };

    case 'fond':
      // Pas de chant
      return { A: false, B: false, C: false, D: false };

    case 'facade':
      // Chants sur les 4 cotes
      return { A: true, B: true, C: true, D: true };

    default:
      return { A: false, B: false, C: false, D: false };
  }
}

// === CREATION PANNEAU CALCULE ===

function creerPanneauCalcule(
  type: TypePanneauCaisson,
  nom: string,
  nomCourt: string,
  longueur: number,
  largeur: number,
  epaisseur: number,
  quantite: number,
  config: ConfigCaisson
): PanneauCalcule {
  const chants = getChantsDefautPourType(type);
  const surfaceM2 = calculerSurfaceM2(longueur, largeur) * quantite;

  // Selectionner le bon panneau source selon le type
  let panneauSource = null;
  if (type === 'fond') {
    panneauSource = config.panneauFond;
  } else if (type === 'facade') {
    panneauSource = config.panneauFacade;
  } else {
    panneauSource = config.panneauStructure;
  }

  return {
    id: genererIdPanneau(),
    nom,
    nomCourt,
    type,
    longueur: Math.round(longueur * 10) / 10,  // Arrondi 0.1mm
    largeur: Math.round(largeur * 10) / 10,
    epaisseur,
    quantite,
    surfaceM2,
    surfaceFacturee: calculerSurfaceFacturee(surfaceM2),
    chants,
    metresLineairesChants: calculerMetresLineairesChants(longueur, largeur, chants) * quantite,
    panneauSource,
  };
}

// === CALCUL PANNEAUX STRUCTURE ===

function calculerPanneauxStructure(config: ConfigCaisson): PanneauCalcule[] {
  const { hauteur, largeur, profondeur, epaisseurStructure } = config;
  const panneaux: PanneauCalcule[] = [];

  // Cote gauche
  panneaux.push(creerPanneauCalcule(
    'cote_gauche',
    'Cote gauche',
    'CG',
    hauteur,
    profondeur,
    epaisseurStructure,
    1,
    config
  ));

  // Cote droit
  panneaux.push(creerPanneauCalcule(
    'cote_droit',
    'Cote droit',
    'CD',
    hauteur,
    profondeur,
    epaisseurStructure,
    1,
    config
  ));

  // Panneau superieur (entre les 2 cotes)
  const largeurInterieure = largeur - 2 * epaisseurStructure;
  panneaux.push(creerPanneauCalcule(
    'haut',
    'Panneau superieur',
    'PS',
    largeurInterieure,
    profondeur,
    epaisseurStructure,
    1,
    config
  ));

  // Panneau inferieur (entre les 2 cotes)
  panneaux.push(creerPanneauCalcule(
    'bas',
    'Panneau inferieur',
    'PI',
    largeurInterieure,
    profondeur,
    epaisseurStructure,
    1,
    config
  ));

  return panneaux;
}

// === CALCUL PANNEAU FOND ===

function calculerPanneauFond(config: ConfigCaisson): PanneauCalcule | null {
  const {
    hauteur,
    largeur,
    epaisseurStructure,
    epaisseurFond,
    typeFond,
    profondeurRainure
  } = config;

  let longueurFond: number;
  let largeurFond: number;

  switch (typeFond) {
    case 'applique':
      // Fond visse derriere, dimensions interieures
      longueurFond = hauteur;
      largeurFond = largeur - 2 * epaisseurStructure;
      break;

    case 'encastre':
      // Fond encastre dans rainure sur les 4 cotes
      longueurFond = hauteur - 2 * profondeurRainure;
      largeurFond = largeur - 2 * epaisseurStructure + 2 * profondeurRainure;
      break;

    case 'feuillure':
      // Fond dans feuillure
      longueurFond = hauteur - 2 * epaisseurStructure;
      largeurFond = largeur - 2 * epaisseurStructure;
      break;

    case 'rainure':
      // Fond glisse dans rainure
      longueurFond = hauteur - 2 * profondeurRainure;
      largeurFond = largeur - 2 * epaisseurStructure + 2 * profondeurRainure;
      break;

    default:
      longueurFond = hauteur;
      largeurFond = largeur - 2 * epaisseurStructure;
  }

  return creerPanneauCalcule(
    'fond',
    'Dos du corps de meuble',
    'FD',
    longueurFond,
    largeurFond,
    epaisseurFond,
    1,
    config
  );
}

// === CALCUL PANNEAU FACADE ===

function calculerPanneauFacade(config: ConfigCaisson): PanneauCalcule | null {
  if (!config.avecFacade) {
    return null;
  }

  const {
    hauteur,
    largeur,
    epaisseurStructure,
    epaisseurFacade,
    typeFacade,
    jeuFacade
  } = config;

  let longueurFacade: number;
  let largeurFacade: number;

  switch (typeFacade) {
    case 'applique':
      // Facade recouvre les cotes avec jeu
      longueurFacade = hauteur - jeuFacade;
      largeurFacade = largeur - jeuFacade;
      break;

    case 'encastre':
      // Facade entre les cotes
      longueurFacade = hauteur - 2 * jeuFacade;
      largeurFacade = largeur - 2 * epaisseurStructure - 2 * jeuFacade;
      break;

    default:
      longueurFacade = hauteur - jeuFacade;
      largeurFacade = largeur - jeuFacade;
  }

  return creerPanneauCalcule(
    'facade',
    'Porte',
    'FA',
    longueurFacade,
    largeurFacade,
    epaisseurFacade,
    1,
    config
  );
}

// === CALCUL CHARNIERES ===

function calculerCharnieres(config: ConfigCaisson): CharniereConfig[] {
  if (!config.avecFacade) {
    return [];
  }

  const { hauteur, marqueCharniere, typeCharniere, angleCharniere, jeuFacade } = config;
  const hauteurFacade = hauteur - jeuFacade;
  const nombreCharnieres = config.nombreCharnieres || calculerNombreCharnieres(hauteurFacade);

  // Pour l'instant, on ne supporte que Blum
  if (marqueCharniere !== 'blum') {
    return [];
  }

  // Selectionner la charniere selon l'angle
  const refCharniere = angleCharniere === 155
    ? CHARNIERES_BLUM.CLIP_TOP_BLUMOTION_155
    : CHARNIERES_BLUM.CLIP_TOP_BLUMOTION_110;

  return [{
    reference: refCharniere.reference,
    nom: refCharniere.nom,
    marque: 'blum',
    type: typeCharniere,
    angle: refCharniere.angle,
    couleur: 'noir onyx',
    quantite: nombreCharnieres,
    prixUnitaire: refCharniere.prixUnitaire,
    embase: {
      reference: refCharniere.embase.reference,
      nom: refCharniere.embase.nom,
      prixUnitaire: refCharniere.embase.prixUnitaire,
    },
    cache: {
      reference: refCharniere.cache.reference,
      nom: refCharniere.cache.nom,
      prixUnitaire: refCharniere.cache.prixUnitaire,
    },
  }];
}

// === CALCUL PRIX ===

function calculerPrixPanneaux(panneaux: PanneauCalcule[]): number {
  return panneaux.reduce((total, panneau) => {
    if (panneau.panneauSource?.prixM2) {
      // prixM2 est un Record<string, number>, on prend la premiere valeur
      const prixM2Values = Object.values(panneau.panneauSource.prixM2);
      const prixM2 = prixM2Values.length > 0 ? prixM2Values[0] : 0;
      return total + panneau.surfaceFacturee * prixM2;
    }
    return total;
  }, 0);
}

function calculerPrixChants(panneaux: PanneauCalcule[], prixAuMetreLineaire: number = 2.50): number {
  const totalMetres = panneaux.reduce((total, p) => total + p.metresLineairesChants, 0);
  return totalMetres * prixAuMetreLineaire;
}

function calculerPrixCharnieres(charnieres: CharniereConfig[]): number {
  return charnieres.reduce((total, c) => {
    const prixCharniere = c.prixUnitaire * c.quantite;
    const prixEmbases = c.embase.prixUnitaire * c.quantite;
    const prixCaches = c.cache.prixUnitaire * c.quantite;
    return total + prixCharniere + prixEmbases + prixCaches;
  }, 0);
}

// === FONCTION PRINCIPALE DE CALCUL ===

export function calculerCaisson(config: ConfigCaisson): ResultatCalculCaisson {
  // Calculer tous les panneaux
  const panneauxStructure = calculerPanneauxStructure(config);
  const panneauFond = calculerPanneauFond(config);
  const panneauFacade = calculerPanneauFacade(config);

  const panneaux: PanneauCalcule[] = [
    ...panneauxStructure,
    ...(panneauFond ? [panneauFond] : []),
    ...(panneauFacade ? [panneauFacade] : []),
  ];

  // Calculer les charnieres
  const charnieres = calculerCharnieres(config);

  // Calculer les totaux
  const surfaceTotaleM2 = panneaux.reduce((sum, p) => sum + p.surfaceM2, 0);
  const metresLineairesTotaux = panneaux.reduce((sum, p) => sum + p.metresLineairesChants, 0);

  // Calculer les prix
  const prixPanneauxHT = calculerPrixPanneaux(panneaux);
  const prixChantsHT = calculerPrixChants(panneaux);
  const prixCharnieresHT = calculerPrixCharnieres(charnieres);

  return {
    config,
    panneaux,
    charnieres,
    surfaceTotaleM2: Math.round(surfaceTotaleM2 * 1000) / 1000,
    metresLineairesTotaux: Math.round(metresLineairesTotaux * 100) / 100,
    nombrePanneaux: panneaux.length,
    prixPanneauxHT: Math.round(prixPanneauxHT * 100) / 100,
    prixChantsHT: Math.round(prixChantsHT * 100) / 100,
    prixCharnieresHT: Math.round(prixCharnieresHT * 100) / 100,
    prixTotalHT: Math.round((prixPanneauxHT + prixChantsHT + prixCharnieresHT) * 100) / 100,
  };
}

// === VALIDATION ===

export function validerConfigCaisson(config: ConfigCaisson): { isValid: boolean; erreurs: string[] } {
  const erreurs: string[] = [];

  // Validation dimensions
  if (config.hauteur < 200 || config.hauteur > 2800) {
    erreurs.push('Hauteur doit etre entre 200mm et 2800mm');
  }
  if (config.largeur < 100 || config.largeur > 2800) {
    erreurs.push('Largeur doit etre entre 100mm et 2800mm');
  }
  if (config.profondeur < 100 || config.profondeur > 2800) {
    erreurs.push('Profondeur doit etre entre 100mm et 2800mm');
  }

  // Validation epaisseurs
  if (![16, 18, 19, 22].includes(config.epaisseurStructure)) {
    erreurs.push('Epaisseur structure invalide');
  }
  if (![3, 5, 8, 10].includes(config.epaisseurFond)) {
    erreurs.push('Epaisseur fond invalide');
  }

  // Validation coherence
  if (config.largeur <= 2 * config.epaisseurStructure) {
    erreurs.push('Largeur trop petite par rapport a l\'epaisseur');
  }

  return {
    isValid: erreurs.length === 0,
    erreurs,
  };
}
