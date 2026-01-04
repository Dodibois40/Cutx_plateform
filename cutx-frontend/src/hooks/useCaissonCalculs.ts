// hooks/useCaissonCalculs.ts
// Hook React pour la gestion des calculs de caissons

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { PanneauCatalogue } from '@/lib/services/panneaux-catalogue';
import {
  type ConfigCaisson,
  type ResultatCalculCaisson,
  type TemplateCaisson,
  type TypeFond,
  type TypeFacade,
  type PositionCharniere,
  type MarqueCharniere,
  type TypeCharniere,
  type AngleCharniere,
  type TypeCaisson,
  type TypeEmbaseBlum,
} from '@/lib/caissons/types';
import { calculerCaisson, validerConfigCaisson } from '@/lib/caissons/calculs';
import { CONFIG_DEFAUT, TEMPLATES_CAISSONS, getTemplateById } from '@/lib/caissons';

// Generer un ID unique
function genererIdCaisson(): string {
  return `caisson_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Configuration initiale vide
function creerConfigInitiale(templateId?: string): ConfigCaisson {
  const template = templateId ? getTemplateById(templateId) : null;

  return {
    id: genererIdCaisson(),
    templateId: templateId || null,
    nom: template?.nom || 'Nouveau caisson',
    typeCaisson: template?.typeCaisson || 'bas_cuisine',

    // Dimensions
    hauteur: template?.hauteurDefaut || CONFIG_DEFAUT.hauteur,
    largeur: template?.largeurDefaut || CONFIG_DEFAUT.largeur,
    profondeur: template?.profondeurDefaut || CONFIG_DEFAUT.profondeur,

    // Epaisseurs
    epaisseurStructure: template?.epaisseurStructureDefaut || CONFIG_DEFAUT.epaisseurStructure,
    epaisseurFond: template?.epaisseurFondDefaut || CONFIG_DEFAUT.epaisseurFond,
    epaisseurFacade: template?.epaisseurFacadeDefaut || CONFIG_DEFAUT.epaisseurFacade,

    // Panneaux (non selectionnes par defaut)
    panneauStructureId: null,
    panneauStructure: null,
    panneauFondId: null,
    panneauFond: null,
    panneauFacadeId: null,
    panneauFacade: null,

    // Configuration fond
    typeFond: template?.typeFondDefaut || CONFIG_DEFAUT.typeFond,
    profondeurRainure: CONFIG_DEFAUT.profondeurRainure,

    // Configuration facade
    typeFacade: template?.typeFacadeDefaut || CONFIG_DEFAUT.typeFacade,
    jeuFacade: CONFIG_DEFAUT.jeuFacade,

    // Charnieres
    avecFacade: template?.avecFacadeDefaut ?? true,
    positionCharniere: 'gauche',
    marqueCharniere: CONFIG_DEFAUT.marqueCharniere,
    typeCharniere: CONFIG_DEFAUT.typeCharniere,
    angleCharniere: CONFIG_DEFAUT.angleCharniere,
    nombreCharnieres: 0, // Auto-calcule
    referenceCharniere: '71B3590', // CLIP top BLUMOTION 110° INSERTA par defaut
    typeEmbase: 'EXPANDO_0mm', // Embase EXPANDO 0mm par defaut

    // Etat formulaire
    etapeActive: 1,
    isValid: false,
    erreurs: [],
  };
}

export interface UseCaissonCalculsReturn {
  // Configuration
  config: ConfigCaisson;
  resultat: ResultatCalculCaisson | null;

  // Templates
  templates: TemplateCaisson[];
  templateActif: TemplateCaisson | null;

  // Actions dimensions
  setHauteur: (value: number) => void;
  setLargeur: (value: number) => void;
  setProfondeur: (value: number) => void;

  // Actions epaisseurs
  setEpaisseurStructure: (value: number) => void;
  setEpaisseurFond: (value: number) => void;
  setEpaisseurFacade: (value: number) => void;

  // Actions panneaux
  setPanneauStructure: (panneau: PanneauCatalogue | null) => void;
  setPanneauFond: (panneau: PanneauCatalogue | null) => void;
  setPanneauFacade: (panneau: PanneauCatalogue | null) => void;

  // Actions fond
  setTypeFond: (type: TypeFond) => void;
  setProfondeurRainure: (value: number) => void;

  // Actions facade
  setAvecFacade: (value: boolean) => void;
  setTypeFacade: (type: TypeFacade) => void;
  setJeuFacade: (value: number) => void;

  // Actions charnieres
  setPositionCharniere: (position: PositionCharniere) => void;
  setMarqueCharniere: (marque: MarqueCharniere) => void;
  setTypeCharniere: (type: TypeCharniere) => void;
  setAngleCharniere: (angle: AngleCharniere) => void;
  setReferenceCharniere: (reference: string) => void;
  setTypeEmbase: (type: TypeEmbaseBlum) => void;

  // Actions template
  chargerTemplate: (templateId: string) => void;
  reinitialiser: () => void;

  // Navigation etapes
  etapeActive: 1 | 2 | 3 | 4;
  setEtapeActive: (etape: 1 | 2 | 3 | 4) => void;
  etapeSuivante: () => void;
  etapePrecedente: () => void;
  peutAllerSuivante: boolean;
  peutAllerPrecedente: boolean;

  // Validation
  isValid: boolean;
  erreurs: string[];
  validerEtape: (etape: number) => { isValid: boolean; erreurs: string[] };
}

export function useCaissonCalculs(templateIdInitial?: string): UseCaissonCalculsReturn {
  // State principal
  const [config, setConfig] = useState<ConfigCaisson>(() =>
    creerConfigInitiale(templateIdInitial)
  );

  // Recalculer le resultat a chaque changement de config
  const resultat = useMemo(() => {
    return calculerCaisson(config);
  }, [config]);

  // Validation
  const validation = useMemo(() => {
    return validerConfigCaisson(config);
  }, [config]);

  // Template actif
  const templateActif = useMemo(() => {
    return config.templateId ? getTemplateById(config.templateId) || null : null;
  }, [config.templateId]);

  // === SETTERS DIMENSIONS ===

  const setHauteur = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, hauteur: value }));
  }, []);

  const setLargeur = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, largeur: value }));
  }, []);

  const setProfondeur = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, profondeur: value }));
  }, []);

  // === SETTERS EPAISSEURS ===

  const setEpaisseurStructure = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, epaisseurStructure: value }));
  }, []);

  const setEpaisseurFond = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, epaisseurFond: value }));
  }, []);

  const setEpaisseurFacade = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, epaisseurFacade: value }));
  }, []);

  // === SETTERS PANNEAUX ===

  const setPanneauStructure = useCallback((panneau: PanneauCatalogue | null) => {
    setConfig(prev => ({
      ...prev,
      panneauStructureId: panneau?.id || null,
      panneauStructure: panneau,
      // Mettre a jour l'epaisseur si le panneau en a une (premiere epaisseur dispo)
      ...(panneau?.epaisseurs?.length ? { epaisseurStructure: panneau.epaisseurs[0] } : {}),
    }));
  }, []);

  const setPanneauFond = useCallback((panneau: PanneauCatalogue | null) => {
    setConfig(prev => ({
      ...prev,
      panneauFondId: panneau?.id || null,
      panneauFond: panneau,
      ...(panneau?.epaisseurs?.length ? { epaisseurFond: panneau.epaisseurs[0] } : {}),
    }));
  }, []);

  const setPanneauFacade = useCallback((panneau: PanneauCatalogue | null) => {
    setConfig(prev => ({
      ...prev,
      panneauFacadeId: panneau?.id || null,
      panneauFacade: panneau,
      ...(panneau?.epaisseurs?.length ? { epaisseurFacade: panneau.epaisseurs[0] } : {}),
    }));
  }, []);

  // === SETTERS FOND ===

  const setTypeFond = useCallback((type: TypeFond) => {
    setConfig(prev => ({ ...prev, typeFond: type }));
  }, []);

  const setProfondeurRainure = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, profondeurRainure: value }));
  }, []);

  // === SETTERS FACADE ===

  const setAvecFacade = useCallback((value: boolean) => {
    setConfig(prev => ({ ...prev, avecFacade: value }));
  }, []);

  const setTypeFacade = useCallback((type: TypeFacade) => {
    setConfig(prev => ({ ...prev, typeFacade: type }));
  }, []);

  const setJeuFacade = useCallback((value: number) => {
    setConfig(prev => ({ ...prev, jeuFacade: value }));
  }, []);

  // === SETTERS CHARNIERES ===

  const setPositionCharniere = useCallback((position: PositionCharniere) => {
    setConfig(prev => ({ ...prev, positionCharniere: position }));
  }, []);

  const setMarqueCharniere = useCallback((marque: MarqueCharniere) => {
    setConfig(prev => ({ ...prev, marqueCharniere: marque }));
  }, []);

  const setTypeCharniere = useCallback((type: TypeCharniere) => {
    setConfig(prev => ({ ...prev, typeCharniere: type }));
  }, []);

  const setAngleCharniere = useCallback((angle: AngleCharniere) => {
    setConfig(prev => ({ ...prev, angleCharniere: angle }));
  }, []);

  const setReferenceCharniere = useCallback((reference: string) => {
    setConfig(prev => ({ ...prev, referenceCharniere: reference }));
  }, []);

  const setTypeEmbase = useCallback((type: TypeEmbaseBlum) => {
    setConfig(prev => ({ ...prev, typeEmbase: type }));
  }, []);

  // === ACTIONS TEMPLATE ===

  const chargerTemplate = useCallback((templateId: string) => {
    setConfig(creerConfigInitiale(templateId));
  }, []);

  const reinitialiser = useCallback(() => {
    setConfig(creerConfigInitiale(config.templateId || undefined));
  }, [config.templateId]);

  // === NAVIGATION ETAPES ===

  const setEtapeActive = useCallback((etape: 1 | 2 | 3 | 4) => {
    setConfig(prev => ({ ...prev, etapeActive: etape }));
  }, []);

  const etapeSuivante = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      etapeActive: Math.min(prev.etapeActive + 1, 4) as 1 | 2 | 3 | 4,
    }));
  }, []);

  const etapePrecedente = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      etapeActive: Math.max(prev.etapeActive - 1, 1) as 1 | 2 | 3 | 4,
    }));
  }, []);

  // === VALIDATION PAR ETAPE ===

  const validerEtape = useCallback((etape: number): { isValid: boolean; erreurs: string[] } => {
    const erreurs: string[] = [];

    switch (etape) {
      case 1: // Structure
        if (config.hauteur < 200 || config.hauteur > 2800) {
          erreurs.push('Hauteur doit etre entre 200mm et 2800mm');
        }
        if (config.largeur < 100 || config.largeur > 2800) {
          erreurs.push('Largeur doit etre entre 100mm et 2800mm');
        }
        if (config.profondeur < 100 || config.profondeur > 2800) {
          erreurs.push('Profondeur doit etre entre 100mm et 2800mm');
        }
        if (config.largeur <= 2 * config.epaisseurStructure) {
          erreurs.push('Largeur trop petite par rapport a l\'epaisseur');
        }
        break;

      case 2: // Fond
        if (config.typeFond === 'rainure' || config.typeFond === 'encastre') {
          if (config.profondeurRainure < 8 || config.profondeurRainure > 15) {
            erreurs.push('Profondeur rainure doit etre entre 8mm et 15mm');
          }
        }
        break;

      case 3: // Facade
        if (config.avecFacade) {
          if (config.jeuFacade < 1 || config.jeuFacade > 5) {
            erreurs.push('Jeu facade doit etre entre 1mm et 5mm');
          }
        }
        break;

      case 4: // Charnieres
        // Pas de validation specifique pour l'instant
        break;
    }

    return { isValid: erreurs.length === 0, erreurs };
  }, [config]);

  const peutAllerSuivante = config.etapeActive < 4 && validerEtape(config.etapeActive).isValid;
  const peutAllerPrecedente = config.etapeActive > 1;

  return {
    // Configuration
    config,
    resultat,

    // Templates
    templates: TEMPLATES_CAISSONS,
    templateActif,

    // Actions dimensions
    setHauteur,
    setLargeur,
    setProfondeur,

    // Actions epaisseurs
    setEpaisseurStructure,
    setEpaisseurFond,
    setEpaisseurFacade,

    // Actions panneaux
    setPanneauStructure,
    setPanneauFond,
    setPanneauFacade,

    // Actions fond
    setTypeFond,
    setProfondeurRainure,

    // Actions facade
    setAvecFacade,
    setTypeFacade,
    setJeuFacade,

    // Actions charnieres
    setPositionCharniere,
    setMarqueCharniere,
    setTypeCharniere,
    setAngleCharniere,
    setReferenceCharniere,
    setTypeEmbase,

    // Actions template
    chargerTemplate,
    reinitialiser,

    // Navigation etapes
    etapeActive: config.etapeActive,
    setEtapeActive,
    etapeSuivante,
    etapePrecedente,
    peutAllerSuivante,
    peutAllerPrecedente,

    // Validation
    isValid: validation.isValid,
    erreurs: validation.erreurs,
    validerEtape,
  };
}

export default useCaissonCalculs;
