// caissons/caissons.service.ts
import { Injectable } from '@nestjs/common';
import {
  CalculateCaissonDto,
  CalculateCaissonResponse,
  PanneauCalculeResponse,
} from './dto/calculate-caisson.dto';
import { TypeFond, TypeFacade } from './dto/create-caisson.dto';

// Surface minimum facturee (m2)
const SURFACE_MINIMUM = 0.25;

@Injectable()
export class CaissonsService {
  /**
   * Calcule les dimensions de tous les panneaux d'un caisson
   */
  calculatePanneaux(dto: CalculateCaissonDto): CalculateCaissonResponse {
    const panneaux: PanneauCalculeResponse[] = [];

    // 1. Panneaux structure (cotes)
    const coteGauche = this.createPanneau(
      'Cote gauche',
      'cote_gauche',
      dto.hauteur,
      dto.profondeur,
      dto.epaisseurStructure,
      1,
      { A: true, B: false, C: false, D: false }, // Chant avant
    );
    panneaux.push(coteGauche);

    const coteDroit = this.createPanneau(
      'Cote droit',
      'cote_droit',
      dto.hauteur,
      dto.profondeur,
      dto.epaisseurStructure,
      1,
      { A: true, B: false, C: false, D: false },
    );
    panneaux.push(coteDroit);

    // 2. Panneaux haut et bas (entre les cotes)
    const largeurInterieure = dto.largeur - 2 * dto.epaisseurStructure;

    const panneauHaut = this.createPanneau(
      'Panneau superieur',
      'haut',
      largeurInterieure,
      dto.profondeur,
      dto.epaisseurStructure,
      1,
      { A: true, B: false, C: false, D: false },
    );
    panneaux.push(panneauHaut);

    const panneauBas = this.createPanneau(
      'Panneau inferieur',
      'bas',
      largeurInterieure,
      dto.profondeur,
      dto.epaisseurStructure,
      1,
      { A: true, B: false, C: false, D: false },
    );
    panneaux.push(panneauBas);

    // 3. Fond
    const fond = this.calculateFond(dto);
    panneaux.push(fond);

    // 4. Facade (si active)
    if (dto.avecFacade) {
      const facade = this.calculateFacade(dto);
      panneaux.push(facade);
    }

    // Calculer les totaux
    const surfaceTotaleM2 = panneaux.reduce((sum, p) => sum + p.surfaceM2, 0);
    const metresLineairesTotaux = panneaux.reduce(
      (sum, p) => sum + p.metresLineairesChants,
      0,
    );

    // Calculer nombre de charnieres
    const hauteurFacade = dto.avecFacade
      ? dto.hauteur - (dto.jeuFacade || 1.5)
      : 0;
    const nombreCharnieres = dto.avecFacade
      ? this.calculateNombreCharnieres(hauteurFacade)
      : 0;

    return {
      panneaux,
      surfaceTotaleM2: Math.round(surfaceTotaleM2 * 1000) / 1000,
      metresLineairesTotaux: Math.round(metresLineairesTotaux * 100) / 100,
      nombrePanneaux: panneaux.length,
      nombreCharnieres,
    };
  }

  /**
   * Calcule le panneau de fond selon le type
   */
  private calculateFond(dto: CalculateCaissonDto): PanneauCalculeResponse {
    let longueur: number;
    let largeur: number;
    const rainure = dto.profondeurRainure || 10;

    switch (dto.typeFond) {
      case TypeFond.APPLIQUE:
        longueur = dto.hauteur;
        largeur = dto.largeur - 2 * dto.epaisseurStructure;
        break;

      case TypeFond.ENCASTRE:
      case TypeFond.RAINURE:
        longueur = dto.hauteur - 2 * rainure;
        largeur = dto.largeur - 2 * dto.epaisseurStructure + 2 * rainure;
        break;

      case TypeFond.FEUILLURE:
        longueur = dto.hauteur - 2 * dto.epaisseurStructure;
        largeur = dto.largeur - 2 * dto.epaisseurStructure;
        break;

      default:
        longueur = dto.hauteur;
        largeur = dto.largeur - 2 * dto.epaisseurStructure;
    }

    return this.createPanneau(
      'Dos du corps de meuble',
      'fond',
      longueur,
      largeur,
      dto.epaisseurFond,
      1,
      { A: false, B: false, C: false, D: false }, // Pas de chant
    );
  }

  /**
   * Calcule le panneau de facade selon le type
   */
  private calculateFacade(dto: CalculateCaissonDto): PanneauCalculeResponse {
    const jeu = dto.jeuFacade || 1.5;
    let longueur: number;
    let largeur: number;

    switch (dto.typeFacade) {
      case TypeFacade.ENCASTRE:
        longueur = dto.hauteur - 2 * jeu;
        largeur = dto.largeur - 2 * dto.epaisseurStructure - 2 * jeu;
        break;

      case TypeFacade.APPLIQUE:
      default:
        longueur = dto.hauteur - jeu;
        largeur = dto.largeur - jeu;
        break;
    }

    return this.createPanneau(
      'Porte',
      'facade',
      longueur,
      largeur,
      dto.epaisseurFacade,
      1,
      { A: true, B: true, C: true, D: true }, // Chants sur 4 cotes
    );
  }

  /**
   * Cree un objet panneau avec les calculs
   */
  private createPanneau(
    nom: string,
    type: string,
    longueur: number,
    largeur: number,
    epaisseur: number,
    quantite: number,
    chants: { A: boolean; B: boolean; C: boolean; D: boolean },
  ): PanneauCalculeResponse {
    // Arrondir a 0.1mm
    longueur = Math.round(longueur * 10) / 10;
    largeur = Math.round(largeur * 10) / 10;

    // Calculer surface
    const surfaceM2 = (longueur * largeur * quantite) / 1_000_000;
    const surfaceFacturee = Math.max(surfaceM2, SURFACE_MINIMUM);

    // Calculer metres lineaires de chants
    let metresLineaires = 0;
    if (chants.A) metresLineaires += longueur;
    if (chants.B) metresLineaires += largeur;
    if (chants.C) metresLineaires += longueur;
    if (chants.D) metresLineaires += largeur;
    metresLineaires = (metresLineaires * quantite) / 1000;

    return {
      nom,
      type,
      longueur,
      largeur,
      epaisseur,
      quantite,
      surfaceM2: Math.round(surfaceFacturee * 1000) / 1000,
      chants,
      metresLineairesChants: Math.round(metresLineaires * 100) / 100,
    };
  }

  /**
   * Calcule le nombre de charnieres selon la hauteur de facade (regle Blum)
   */
  private calculateNombreCharnieres(hauteurFacade: number): number {
    if (hauteurFacade <= 600) return 2;
    if (hauteurFacade <= 1000) return 3;
    if (hauteurFacade <= 1400) return 4;
    if (hauteurFacade <= 1800) return 5;
    return 6;
  }

  /**
   * Retourne la liste des templates disponibles
   */
  getTemplates() {
    return [
      {
        id: 'bas-cuisine-500',
        nom: 'Caisson bas cuisine 500mm',
        description: 'Caisson bas standard type Blum - Largeur 500mm',
        typeCaisson: 'bas_cuisine',
        hauteurDefaut: 800,
        largeurDefaut: 500,
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
      },
      {
        id: 'haut-cuisine-600',
        nom: 'Caisson haut cuisine',
        description: 'Meuble mural suspendu',
        typeCaisson: 'haut_cuisine',
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
      },
      {
        id: 'colonne-2200',
        nom: 'Colonne cuisine',
        description: 'Meuble colonne toute hauteur',
        typeCaisson: 'colonne',
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
      },
      {
        id: 'custom',
        nom: 'Configuration libre',
        description: 'Personnalisez toutes les dimensions',
        typeCaisson: 'custom',
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
      },
    ];
  }

  /**
   * Retourne un template par son ID
   */
  getTemplateById(id: string) {
    const templates = this.getTemplates();
    return templates.find((t) => t.id === id);
  }
}
