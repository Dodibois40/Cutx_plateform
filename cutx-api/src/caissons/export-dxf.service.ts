// caissons/export-dxf.service.ts
// Service d'export DXF pour les panneaux de caissons avec percages
// Utilise Maker.js pour la generation 2D et @tarikjabiri/dxf pour l'export

import { Injectable } from '@nestjs/common';
import * as makerjs from 'makerjs';
import { DxfWriter, Colors, point3d, Units } from '@tarikjabiri/dxf';
import type { DrillingPoint, PanelDrillings } from './system32.service';

// ============================================
// TYPES
// ============================================

export interface PanelExportConfig {
  panelType: string;
  panelName: string;
  length: number;         // mm
  width: number;          // mm
  thickness: number;      // mm
  drillings: DrillingPoint[];
  edges: {
    A: boolean;           // Longueur cote 1
    B: boolean;           // Largeur cote 1
    C: boolean;           // Longueur cote 2
    D: boolean;           // Largeur cote 2
  };
}

export interface DxfExportOptions {
  // Layers
  includeContourLayer: boolean;
  includeDrillingLayer: boolean;
  includeEdgingLayer: boolean;
  includeDimensionsLayer: boolean;
  includeLabelsLayer: boolean;

  // Options
  addDimensions: boolean;
  addLabels: boolean;
  addCenterMarks: boolean;

  // Couleurs (indices AutoCAD)
  contourColor: number;
  drillingColor: number;
  edgingColor: number;
  dimensionColor: number;
  labelColor: number;

  // Echelle
  scale: number;
}

const DEFAULT_OPTIONS: DxfExportOptions = {
  includeContourLayer: true,
  includeDrillingLayer: true,
  includeEdgingLayer: true,
  includeDimensionsLayer: true,
  includeLabelsLayer: true,
  addDimensions: true,
  addLabels: true,
  addCenterMarks: true,
  contourColor: Colors.White,
  drillingColor: Colors.Red,
  edgingColor: Colors.Green,
  dimensionColor: Colors.Cyan,
  labelColor: Colors.Yellow,
  scale: 1,
};

// ============================================
// SERVICE
// ============================================

@Injectable()
export class ExportDxfService {
  /**
   * Exporte un panneau unique en DXF avec Maker.js
   */
  exportPanelToMakerJs(panel: PanelExportConfig): makerjs.IModel {
    const model: makerjs.IModel = {
      models: {},
      paths: {},
    };

    // Layer contour
    const contour = new makerjs.models.Rectangle(panel.length, panel.width);
    (contour as any).layer = 'CONTOUR';
    model.models!['contour'] = contour;

    // Layer percages (cercles)
    const drillings: makerjs.IModel = { paths: {} };
    (drillings as any).layer = 'DRILLING';

    panel.drillings.forEach((drill, index) => {
      const circle = new makerjs.paths.Circle([drill.x, drill.y], drill.diameter / 2);
      (circle as any).layer = 'DRILLING';
      drillings.paths![`hole_${index}`] = circle;

      // Marque centrale pour les gros trous (>10mm)
      if (drill.diameter > 10) {
        const crossSize = 3; // mm
        const crossH: makerjs.IPathLine = {
          type: 'line',
          origin: [drill.x - crossSize, drill.y],
          end: [drill.x + crossSize, drill.y],
        };
        (crossH as any).layer = 'DRILLING';
        const crossV: makerjs.IPathLine = {
          type: 'line',
          origin: [drill.x, drill.y - crossSize],
          end: [drill.x, drill.y + crossSize],
        };
        (crossV as any).layer = 'DRILLING';
        drillings.paths![`cross_h_${index}`] = crossH;
        drillings.paths![`cross_v_${index}`] = crossV;
      }
    });

    model.models!['drillings'] = drillings;

    // Layer chants (lignes epaisses sur les bords)
    const edging: makerjs.IModel = { paths: {} };
    (edging as any).layer = 'EDGING';

    if (panel.edges.A) {
      // Bord bas (longueur)
      edging.paths!['edge_A'] = {
        type: 'line',
        origin: [0, 0],
        end: [panel.length, 0],
        layer: 'EDGING',
      } as makerjs.IPathLine;
    }
    if (panel.edges.B) {
      // Bord droit (largeur)
      edging.paths!['edge_B'] = {
        type: 'line',
        origin: [panel.length, 0],
        end: [panel.length, panel.width],
        layer: 'EDGING',
      } as makerjs.IPathLine;
    }
    if (panel.edges.C) {
      // Bord haut (longueur)
      edging.paths!['edge_C'] = {
        type: 'line',
        origin: [panel.length, panel.width],
        end: [0, panel.width],
        layer: 'EDGING',
      } as makerjs.IPathLine;
    }
    if (panel.edges.D) {
      // Bord gauche (largeur)
      edging.paths!['edge_D'] = {
        type: 'line',
        origin: [0, panel.width],
        end: [0, 0],
        layer: 'EDGING',
      } as makerjs.IPathLine;
    }

    model.models!['edging'] = edging;

    return model;
  }

  /**
   * Exporte un panneau en chaine DXF (format Maker.js)
   */
  exportPanelToDxfString(
    panel: PanelExportConfig,
    options: Partial<DxfExportOptions> = {},
  ): string {
    const model = this.exportPanelToMakerJs(panel);

    // Options d'export Maker.js
    const exportOptions: makerjs.exporter.IDXFRenderOptions = {
      units: 'mm' as any,
      usePOLYLINE: true,
    };

    return makerjs.exporter.toDXF(model, exportOptions);
  }

  /**
   * Exporte un panneau en DXF avec la librairie @tarikjabiri/dxf
   * Plus de controle sur les layers et couleurs
   */
  exportPanelToAdvancedDxf(
    panel: PanelExportConfig,
    options: Partial<DxfExportOptions> = {},
  ): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const dxf = new DxfWriter();

    // Configuration unites
    dxf.setUnits(Units.Millimeters);

    // Creation des layers
    if (opts.includeContourLayer) {
      dxf.addLayer('CONTOUR', opts.contourColor, 'CONTINUOUS');
    }
    if (opts.includeDrillingLayer) {
      dxf.addLayer('DRILLING', opts.drillingColor, 'CONTINUOUS');
    }
    if (opts.includeEdgingLayer) {
      dxf.addLayer('EDGING', opts.edgingColor, 'CONTINUOUS');
    }
    if (opts.includeDimensionsLayer) {
      dxf.addLayer('DIMENSIONS', opts.dimensionColor, 'CONTINUOUS');
    }
    if (opts.includeLabelsLayer) {
      dxf.addLayer('LABELS', opts.labelColor, 'CONTINUOUS');
    }

    // Contour du panneau
    if (opts.includeContourLayer) {
      dxf.setCurrentLayerName('CONTOUR');

      // Rectangle (4 lignes)
      dxf.addLine(point3d(0, 0, 0), point3d(panel.length, 0, 0));
      dxf.addLine(point3d(panel.length, 0, 0), point3d(panel.length, panel.width, 0));
      dxf.addLine(point3d(panel.length, panel.width, 0), point3d(0, panel.width, 0));
      dxf.addLine(point3d(0, panel.width, 0), point3d(0, 0, 0));
    }

    // Percages
    if (opts.includeDrillingLayer) {
      dxf.setCurrentLayerName('DRILLING');

      panel.drillings.forEach((drill) => {
        // Cercle pour le percage
        dxf.addCircle(point3d(drill.x, drill.y, 0), drill.diameter / 2);

        // Croix centrale pour les gros trous
        if (opts.addCenterMarks && drill.diameter > 10) {
          const crossSize = Math.min(3, drill.diameter / 4);
          dxf.addLine(
            point3d(drill.x - crossSize, drill.y, 0),
            point3d(drill.x + crossSize, drill.y, 0),
          );
          dxf.addLine(
            point3d(drill.x, drill.y - crossSize, 0),
            point3d(drill.x, drill.y + crossSize, 0),
          );
        }
      });
    }

    // Chants (surlignage des bords avec chant)
    if (opts.includeEdgingLayer) {
      dxf.setCurrentLayerName('EDGING');

      // Offset leger pour visualiser le chant (0.5mm a l'interieur)
      const offset = 0.5;

      if (panel.edges.A) {
        dxf.addLine(
          point3d(0, offset, 0),
          point3d(panel.length, offset, 0),
        );
      }
      if (panel.edges.B) {
        dxf.addLine(
          point3d(panel.length - offset, 0, 0),
          point3d(panel.length - offset, panel.width, 0),
        );
      }
      if (panel.edges.C) {
        dxf.addLine(
          point3d(panel.length, panel.width - offset, 0),
          point3d(0, panel.width - offset, 0),
        );
      }
      if (panel.edges.D) {
        dxf.addLine(
          point3d(offset, panel.width, 0),
          point3d(offset, 0, 0),
        );
      }
    }

    // Labels
    if (opts.includeLabelsLayer && opts.addLabels) {
      dxf.setCurrentLayerName('LABELS');

      // Nom du panneau au centre
      const textHeight = Math.min(20, panel.width / 10);
      dxf.addText(
        point3d(panel.length / 2, panel.width / 2, 0),
        textHeight,
        panel.panelName,
      );

      // Dimensions en bas a gauche
      const dimText = `${panel.length} x ${panel.width} x ${panel.thickness}`;
      dxf.addText(
        point3d(10, 10, 0),
        textHeight * 0.6,
        dimText,
      );
    }

    return dxf.stringify();
  }

  /**
   * Exporte tous les panneaux d'un caisson en un seul fichier DXF
   * Les panneaux sont disposes cote a cote
   */
  exportCabinetPanelsToDxf(
    panels: PanelExportConfig[],
    options: Partial<DxfExportOptions> = {},
  ): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const dxf = new DxfWriter();

    dxf.setUnits(Units.Millimeters);

    // Creation des layers
    dxf.addLayer('CONTOUR', opts.contourColor, 'CONTINUOUS');
    dxf.addLayer('DRILLING', opts.drillingColor, 'CONTINUOUS');
    dxf.addLayer('EDGING', opts.edgingColor, 'CONTINUOUS');
    dxf.addLayer('LABELS', opts.labelColor, 'CONTINUOUS');

    // Disposition des panneaux cote a cote
    let offsetX = 0;
    const gap = 50; // Espace entre panneaux (mm)

    panels.forEach((panel) => {
      // Contour
      dxf.setCurrentLayerName('CONTOUR');
      dxf.addLine(
        point3d(offsetX, 0, 0),
        point3d(offsetX + panel.length, 0, 0),
      );
      dxf.addLine(
        point3d(offsetX + panel.length, 0, 0),
        point3d(offsetX + panel.length, panel.width, 0),
      );
      dxf.addLine(
        point3d(offsetX + panel.length, panel.width, 0),
        point3d(offsetX, panel.width, 0),
      );
      dxf.addLine(
        point3d(offsetX, panel.width, 0),
        point3d(offsetX, 0, 0),
      );

      // Percages
      dxf.setCurrentLayerName('DRILLING');
      panel.drillings.forEach((drill) => {
        dxf.addCircle(
          point3d(offsetX + drill.x, drill.y, 0),
          drill.diameter / 2,
        );
      });

      // Label
      dxf.setCurrentLayerName('LABELS');
      const textHeight = Math.min(15, panel.width / 15);
      dxf.addText(
        point3d(offsetX + panel.length / 2, panel.width / 2, 0),
        textHeight,
        panel.panelName,
      );

      // Deplacement pour le panneau suivant
      offsetX += panel.length + gap;
    });

    return dxf.stringify();
  }

  /**
   * Exporte en SVG (pour previsualisation web)
   */
  exportPanelToSvg(
    panel: PanelExportConfig,
    options: {
      width?: number;
      height?: number;
      showLabels?: boolean;
    } = {},
  ): string {
    const model = this.exportPanelToMakerJs(panel);

    const svgOptions: makerjs.exporter.ISVGRenderOptions = {
      stroke: '#000000',
      strokeWidth: '0.5',
      units: 'mm' as any,
      viewBox: true,
    };

    if (options.width) {
      svgOptions.viewBox = false;
      // @ts-ignore
      svgOptions.width = options.width;
    }

    return makerjs.exporter.toSVG(model, svgOptions);
  }

  /**
   * Genere un fichier DXF a partir des donnees de percage du System32Service
   */
  exportPanelDrillingsToDxf(panelDrillings: PanelDrillings[]): string {
    const panels: PanelExportConfig[] = panelDrillings.map((pd) => ({
      panelType: pd.panelType,
      panelName: pd.panelName,
      length: pd.length,
      width: pd.width,
      thickness: 19, // Epaisseur par defaut
      drillings: pd.drillings,
      edges: {
        A: true,  // Par defaut, chant sur l'avant
        B: false,
        C: false,
        D: false,
      },
    }));

    return this.exportCabinetPanelsToDxf(panels);
  }

  /**
   * Retourne les statistiques d'un export
   */
  getExportStats(panels: PanelExportConfig[]): {
    totalPanels: number;
    totalHoles: number;
    totalEdgeMeters: number;
    holesByDiameter: Record<number, number>;
  } {
    let totalHoles = 0;
    let totalEdgeMeters = 0;
    const holesByDiameter: Record<number, number> = {};

    panels.forEach((panel) => {
      // Comptage trous
      panel.drillings.forEach((d) => {
        totalHoles++;
        holesByDiameter[d.diameter] = (holesByDiameter[d.diameter] || 0) + 1;
      });

      // Calcul metres lineaires chants
      if (panel.edges.A) totalEdgeMeters += panel.length / 1000;
      if (panel.edges.B) totalEdgeMeters += panel.width / 1000;
      if (panel.edges.C) totalEdgeMeters += panel.length / 1000;
      if (panel.edges.D) totalEdgeMeters += panel.width / 1000;
    });

    return {
      totalPanels: panels.length,
      totalHoles,
      totalEdgeMeters: Math.round(totalEdgeMeters * 100) / 100,
      holesByDiameter,
    };
  }
}
