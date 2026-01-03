// caissons/system32.service.ts
// Service de calcul des percages selon le systeme 32mm
// Standard international pour la construction de meubles

import { Injectable } from '@nestjs/common';

// ============================================
// TYPES
// ============================================

export interface DrillingPoint {
  x: number;          // Position X depuis le bord gauche (mm)
  y: number;          // Position Y depuis le bord bas (mm)
  diameter: number;   // Diametre du trou (mm)
  depth: number;      // Profondeur du trou (mm)
  type: 'blind' | 'through';  // Borgne ou traversant
  source: 'system32' | 'hinge' | 'connector' | 'drawer_runner' | 'custom';
  fittingRef?: string;  // Reference ferrure associee
}

export interface System32Config {
  // Distances depuis les bords (mm)
  backEdgeDistance: number;     // Distance rangee arriere depuis bord arriere
  frontEdgeDistance: number;    // Distance rangee avant depuis bord avant

  // Espacement et dimensions
  holeSpacing: number;          // Espacement entre trous (32mm standard)
  holeDiameter: number;         // Diametre des trous (5mm standard)
  holeDepth: number;            // Profondeur des trous (13mm standard)

  // Premier trou
  firstHoleOffset: number;      // Offset du premier trou depuis le bas

  // Options
  includeBackRow: boolean;      // Inclure rangee arriere
  includeFrontRow: boolean;     // Inclure rangee avant
}

export interface HingeDrillingConfig {
  hingeType: 'CLIP_TOP_110' | 'CLIP_TOP_155' | 'SENSYS_110' | 'SENSYS_165';
  doorHeight: number;           // Hauteur de la porte (mm)
  hingeCount?: number;          // Nombre de charnieres (auto si non specifie)
  topDistance: number;          // Distance depuis le haut (mm)
  bottomDistance: number;       // Distance depuis le bas (mm)
}

export interface HingeDrillingPattern {
  cupDiameter: number;          // Diametre cuvette (35mm standard)
  cupDepth: number;             // Profondeur cuvette (mm)
  screwHolesDiameter: number;   // Diametre trous de vis (mm)
  screwHolesDepth: number;      // Profondeur trous de vis (mm)
  screwDistance: number;        // Distance entre vis (mm)
  edgeDistance: number;         // Distance du bord de la porte (mm)
}

export interface PanelDrillings {
  panelType: string;
  panelName: string;
  length: number;
  width: number;
  drillings: DrillingPoint[];
  totalHoles: number;
}

// ============================================
// CONSTANTES SYSTEM 32
// ============================================

export const SYSTEM32_DEFAULTS: System32Config = {
  backEdgeDistance: 37,         // 37mm du bord arriere
  frontEdgeDistance: 37,        // 37mm du bord avant
  holeSpacing: 32,              // Espacement 32mm
  holeDiameter: 5,              // Diametre 5mm
  holeDepth: 13,                // Profondeur 13mm
  firstHoleOffset: 9.5,         // Premier trou a 9.5mm (ou 37mm selon config)
  includeBackRow: true,
  includeFrontRow: true,
};

// Patterns de percage pour charnieres
export const HINGE_PATTERNS: Record<string, HingeDrillingPattern> = {
  // Blum CLIP top 110 degres
  CLIP_TOP_110: {
    cupDiameter: 35,
    cupDepth: 13,
    screwHolesDiameter: 8,
    screwHolesDepth: 11,
    screwDistance: 45,          // Entraxe vis
    edgeDistance: 21.5,         // Distance du bord porte
  },
  // Blum CLIP top 155 degres (grand angle)
  CLIP_TOP_155: {
    cupDiameter: 35,
    cupDepth: 13,
    screwHolesDiameter: 8,
    screwHolesDepth: 11,
    screwDistance: 45,
    edgeDistance: 21.5,
  },
  // Hettich Sensys 110 degres
  SENSYS_110: {
    cupDiameter: 35,
    cupDepth: 13.5,
    screwHolesDiameter: 8,
    screwHolesDepth: 11,
    screwDistance: 45,
    edgeDistance: 21.5,
  },
  // Hettich Sensys 165 degres
  SENSYS_165: {
    cupDiameter: 35,
    cupDepth: 13.5,
    screwHolesDiameter: 8,
    screwHolesDepth: 11,
    screwDistance: 52,
    edgeDistance: 21.5,
  },
};

// ============================================
// SERVICE
// ============================================

@Injectable()
export class System32Service {
  /**
   * Calcule les percages System 32 pour un panneau lateral (cote)
   * Genere deux rangees de trous (avant et arriere) pour les supports d'etageres
   */
  calculateSystem32Drillings(
    panelHeight: number,
    panelDepth: number,
    config: Partial<System32Config> = {},
  ): DrillingPoint[] {
    const cfg: System32Config = { ...SYSTEM32_DEFAULTS, ...config };
    const drillings: DrillingPoint[] = [];

    // Calculer le nombre de trous possibles
    const usableHeight = panelHeight - 2 * cfg.firstHoleOffset;
    const holeCount = Math.floor(usableHeight / cfg.holeSpacing) + 1;

    for (let i = 0; i < holeCount; i++) {
      const y = cfg.firstHoleOffset + i * cfg.holeSpacing;

      // Verifier que le trou ne depasse pas
      if (y > panelHeight - cfg.firstHoleOffset) continue;

      // Rangee arriere
      if (cfg.includeBackRow) {
        drillings.push({
          x: cfg.backEdgeDistance,
          y,
          diameter: cfg.holeDiameter,
          depth: cfg.holeDepth,
          type: 'blind',
          source: 'system32',
        });
      }

      // Rangee avant
      if (cfg.includeFrontRow) {
        drillings.push({
          x: panelDepth - cfg.frontEdgeDistance,
          y,
          diameter: cfg.holeDiameter,
          depth: cfg.holeDepth,
          type: 'blind',
          source: 'system32',
        });
      }
    }

    return drillings;
  }

  /**
   * Calcule le nombre de charnieres necessaires selon la hauteur de porte
   * Regle Blum standard
   */
  calculateHingeCount(doorHeight: number): number {
    if (doorHeight <= 600) return 2;
    if (doorHeight <= 1000) return 3;
    if (doorHeight <= 1400) return 4;
    if (doorHeight <= 1800) return 5;
    return 6;
  }

  /**
   * Calcule les positions Y des charnieres sur une porte
   */
  calculateHingePositions(
    doorHeight: number,
    hingeCount: number,
    topDistance: number = 80,
    bottomDistance: number = 80,
  ): number[] {
    const positions: number[] = [];

    if (hingeCount === 1) {
      // Une seule charniere au centre
      positions.push(doorHeight / 2);
    } else if (hingeCount === 2) {
      // Deux charnieres: haut et bas
      positions.push(bottomDistance);
      positions.push(doorHeight - topDistance);
    } else {
      // Plusieurs charnieres: repartition reguliere
      positions.push(bottomDistance);
      positions.push(doorHeight - topDistance);

      // Charnieres intermediaires
      const spacing = (doorHeight - topDistance - bottomDistance) / (hingeCount - 1);
      for (let i = 1; i < hingeCount - 1; i++) {
        positions.push(bottomDistance + i * spacing);
      }
    }

    return positions.sort((a, b) => a - b);
  }

  /**
   * Calcule les percages pour les charnieres sur une porte
   * Retourne les points de percage pour la cuvette et les vis
   */
  calculateHingeDrillings(config: HingeDrillingConfig): DrillingPoint[] {
    const hingeType = config.hingeType || 'CLIP_TOP_110';
    const pattern = HINGE_PATTERNS[hingeType] || HINGE_PATTERNS.CLIP_TOP_110;
    const drillings: DrillingPoint[] = [];

    // Nombre de charnieres
    const hingeCount =
      config.hingeCount || this.calculateHingeCount(config.doorHeight);

    // Positions Y des charnieres
    const positions = this.calculateHingePositions(
      config.doorHeight,
      hingeCount,
      config.topDistance,
      config.bottomDistance,
    );

    // Generer les percages pour chaque charniere
    positions.forEach((y) => {
      // Trou principal (cuvette 35mm)
      drillings.push({
        x: pattern.edgeDistance,
        y,
        diameter: pattern.cupDiameter,
        depth: pattern.cupDepth,
        type: 'blind',
        source: 'hinge',
        fittingRef: hingeType,
      });

      // Trous de vis (2 trous de chaque cote de la cuvette)
      const screwY1 = y - pattern.screwDistance / 2;
      const screwY2 = y + pattern.screwDistance / 2;

      drillings.push({
        x: pattern.edgeDistance + 32, // Position des vis selon System 32
        y: screwY1,
        diameter: pattern.screwHolesDiameter,
        depth: pattern.screwHolesDepth,
        type: 'blind',
        source: 'hinge',
        fittingRef: hingeType,
      });

      drillings.push({
        x: pattern.edgeDistance + 32,
        y: screwY2,
        diameter: pattern.screwHolesDiameter,
        depth: pattern.screwHolesDepth,
        type: 'blind',
        source: 'hinge',
        fittingRef: hingeType,
      });
    });

    return drillings;
  }

  /**
   * Calcule les percages pour les embases de charnieres sur le cote du caisson
   * (face interieure du cote, en face de la porte)
   */
  calculateHingeBaseDrillings(
    cabinetHeight: number,
    doorHeight: number,
    hingeCount: number,
    topDistance: number = 80,
    bottomDistance: number = 80,
    edgeDistance: number = 37, // Distance du bord avant du cote
  ): DrillingPoint[] {
    const drillings: DrillingPoint[] = [];

    // Positions Y des charnieres (memes que sur la porte)
    const positions = this.calculateHingePositions(
      doorHeight,
      hingeCount,
      topDistance,
      bottomDistance,
    );

    // Percages pour chaque embase
    positions.forEach((y) => {
      // Trous de fixation embase (2 trous)
      drillings.push({
        x: edgeDistance,
        y: y - 16, // 16mm au-dessus du centre
        diameter: 5,
        depth: 13,
        type: 'blind',
        source: 'hinge',
        fittingRef: 'HINGE_BASE',
      });

      drillings.push({
        x: edgeDistance,
        y: y + 16, // 16mm en-dessous du centre
        diameter: 5,
        depth: 13,
        type: 'blind',
        source: 'hinge',
        fittingRef: 'HINGE_BASE',
      });
    });

    return drillings;
  }

  /**
   * Calcule les percages pour connecteurs excentriques (assemblage panneaux)
   * Utilises pour relier les panneaux haut/bas aux cotes
   */
  calculateConnectorDrillings(
    panelLength: number,
    connectorCount: number = 2,
    edgeDistance: number = 50,
  ): DrillingPoint[] {
    const drillings: DrillingPoint[] = [];

    if (connectorCount === 1) {
      // Un seul connecteur au centre
      drillings.push({
        x: panelLength / 2,
        y: 8, // Position standard excentrique
        diameter: 15, // Diametre boitier excentrique
        depth: 12.5,
        type: 'blind',
        source: 'connector',
        fittingRef: 'EXCENTRIC_15',
      });
    } else {
      // Repartition reguliere
      const spacing = (panelLength - 2 * edgeDistance) / (connectorCount - 1);

      for (let i = 0; i < connectorCount; i++) {
        const x = edgeDistance + i * spacing;

        drillings.push({
          x,
          y: 8,
          diameter: 15,
          depth: 12.5,
          type: 'blind',
          source: 'connector',
          fittingRef: 'EXCENTRIC_15',
        });
      }
    }

    return drillings;
  }

  /**
   * Calcule les percages pour tourillons (assemblage bois)
   */
  calculateDowelDrillings(
    panelLength: number,
    dowelCount: number = 3,
    edgeDistance: number = 40,
    dowelDiameter: number = 8,
  ): DrillingPoint[] {
    const drillings: DrillingPoint[] = [];

    if (dowelCount === 1) {
      drillings.push({
        x: panelLength / 2,
        y: 0, // Sur le chant
        diameter: dowelDiameter,
        depth: 25, // Profondeur standard tourillon
        type: 'blind',
        source: 'connector',
        fittingRef: `DOWEL_${dowelDiameter}`,
      });
    } else {
      const spacing = (panelLength - 2 * edgeDistance) / (dowelCount - 1);

      for (let i = 0; i < dowelCount; i++) {
        const x = edgeDistance + i * spacing;

        drillings.push({
          x,
          y: 0,
          diameter: dowelDiameter,
          depth: 25,
          type: 'blind',
          source: 'connector',
          fittingRef: `DOWEL_${dowelDiameter}`,
        });
      }
    }

    return drillings;
  }

  /**
   * Calcule tous les percages pour un caisson complet
   */
  calculateCabinetDrillings(
    cabinetWidth: number,
    cabinetHeight: number,
    cabinetDepth: number,
    structureThickness: number,
    options: {
      withSystem32?: boolean;
      withHinges?: boolean;
      hingeType?: string;
      hingePosition?: 'left' | 'right';
      withConnectors?: boolean;
      doorHeight?: number;
    } = {},
  ): PanelDrillings[] {
    const panelDrillings: PanelDrillings[] = [];

    const {
      withSystem32 = true,
      withHinges = true,
      hingeType = 'CLIP_TOP_110',
      hingePosition = 'left',
      withConnectors = true,
      doorHeight = cabinetHeight,
    } = options;

    // Cote gauche
    const leftSideDrillings: DrillingPoint[] = [];

    if (withSystem32) {
      leftSideDrillings.push(
        ...this.calculateSystem32Drillings(cabinetHeight, cabinetDepth),
      );
    }

    if (withHinges && hingePosition === 'left') {
      const hingeCount = this.calculateHingeCount(doorHeight);
      leftSideDrillings.push(
        ...this.calculateHingeBaseDrillings(
          cabinetHeight,
          doorHeight,
          hingeCount,
        ),
      );
    }

    panelDrillings.push({
      panelType: 'LEFT_SIDE',
      panelName: 'Cote gauche',
      length: cabinetHeight,
      width: cabinetDepth,
      drillings: leftSideDrillings,
      totalHoles: leftSideDrillings.length,
    });

    // Cote droit
    const rightSideDrillings: DrillingPoint[] = [];

    if (withSystem32) {
      rightSideDrillings.push(
        ...this.calculateSystem32Drillings(cabinetHeight, cabinetDepth),
      );
    }

    if (withHinges && hingePosition === 'right') {
      const hingeCount = this.calculateHingeCount(doorHeight);
      rightSideDrillings.push(
        ...this.calculateHingeBaseDrillings(
          cabinetHeight,
          doorHeight,
          hingeCount,
        ),
      );
    }

    panelDrillings.push({
      panelType: 'RIGHT_SIDE',
      panelName: 'Cote droit',
      length: cabinetHeight,
      width: cabinetDepth,
      drillings: rightSideDrillings,
      totalHoles: rightSideDrillings.length,
    });

    // Panneau haut
    const topPanelLength = cabinetWidth - 2 * structureThickness;
    const topDrillings: DrillingPoint[] = [];

    if (withConnectors) {
      topDrillings.push(
        ...this.calculateConnectorDrillings(topPanelLength, 2),
      );
    }

    panelDrillings.push({
      panelType: 'TOP',
      panelName: 'Panneau superieur',
      length: topPanelLength,
      width: cabinetDepth,
      drillings: topDrillings,
      totalHoles: topDrillings.length,
    });

    // Panneau bas
    const bottomDrillings: DrillingPoint[] = [];

    if (withConnectors) {
      bottomDrillings.push(
        ...this.calculateConnectorDrillings(topPanelLength, 2),
      );
    }

    panelDrillings.push({
      panelType: 'BOTTOM',
      panelName: 'Panneau inferieur',
      length: topPanelLength,
      width: cabinetDepth,
      drillings: bottomDrillings,
      totalHoles: bottomDrillings.length,
    });

    // Porte (si charnieres)
    if (withHinges) {
      const hingeCount = this.calculateHingeCount(doorHeight);
      const doorDrillings = this.calculateHingeDrillings({
        hingeType: hingeType as any,
        doorHeight,
        hingeCount,
        topDistance: 80,
        bottomDistance: 80,
      });

      panelDrillings.push({
        panelType: 'DOOR',
        panelName: 'Porte',
        length: doorHeight,
        width: cabinetWidth,
        drillings: doorDrillings,
        totalHoles: doorDrillings.length,
      });
    }

    return panelDrillings;
  }

  /**
   * Calcule le nombre total de percages et statistiques
   */
  getDrillingStats(panelDrillings: PanelDrillings[]): {
    totalHoles: number;
    holesBySource: Record<string, number>;
    holesByDiameter: Record<number, number>;
  } {
    let totalHoles = 0;
    const holesBySource: Record<string, number> = {};
    const holesByDiameter: Record<number, number> = {};

    panelDrillings.forEach((panel) => {
      panel.drillings.forEach((d) => {
        totalHoles++;

        // Par source
        holesBySource[d.source] = (holesBySource[d.source] || 0) + 1;

        // Par diametre
        holesByDiameter[d.diameter] = (holesByDiameter[d.diameter] || 0) + 1;
      });
    });

    return { totalHoles, holesBySource, holesByDiameter };
  }
}
