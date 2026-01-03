// caissons/caissons.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Header,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CaissonsService } from './caissons.service';
import { System32Service } from './system32.service';
import { ExportDxfService } from './export-dxf.service';
import { CalculateCaissonDto } from './dto/calculate-caisson.dto';
import { getAllPatterns, findPatternsByBrand, findPatternsByCategory } from './drilling-patterns';

@Controller('caissons')
export class CaissonsController {
  constructor(
    private readonly caissonsService: CaissonsService,
    private readonly system32Service: System32Service,
    private readonly exportDxfService: ExportDxfService,
  ) {}

  /**
   * GET /api/caissons/templates
   * Retourne tous les templates de caissons disponibles
   */
  @Get('templates')
  getTemplates() {
    return this.caissonsService.getTemplates();
  }

  /**
   * GET /api/caissons/templates/:id
   * Retourne un template par son ID
   */
  @Get('templates/:id')
  getTemplateById(@Param('id') id: string) {
    const template = this.caissonsService.getTemplateById(id);
    if (!template) {
      throw new NotFoundException(`Template "${id}" non trouve`);
    }
    return template;
  }

  /**
   * POST /api/caissons/calculate
   * Calcule les dimensions des panneaux d'un caisson
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  calculatePanneaux(@Body() dto: CalculateCaissonDto) {
    return this.caissonsService.calculatePanneaux(dto);
  }

  /**
   * GET /api/caissons/charnieres
   * Retourne la liste des charnieres disponibles
   */
  @Get('charnieres')
  getCharnieres() {
    return {
      blum: [
        {
          reference: '71B3590',
          nom: 'CLIP top BLUMOTION 110',
          angle: 110,
          type: 'standard',
          prixUnitaire: 8.5,
          embase: {
            reference: '177H3100E',
            nom: 'CLIP Embase droit 0mm',
            prixUnitaire: 2.8,
          },
          cache: {
            reference: '70.1503',
            nom: 'Cache bras de charniere',
            prixUnitaire: 0.95,
          },
          couleurs: ['noir onyx', 'nickel'],
        },
        {
          reference: '71B7550',
          nom: 'CLIP top BLUMOTION 155',
          angle: 155,
          type: 'grand_angle',
          prixUnitaire: 12.5,
          embase: {
            reference: '177H3100E',
            nom: 'CLIP Embase droit 0mm',
            prixUnitaire: 2.8,
          },
          cache: {
            reference: '70.1503',
            nom: 'Cache bras de charniere',
            prixUnitaire: 0.95,
          },
          couleurs: ['noir onyx', 'nickel'],
        },
      ],
    };
  }

  /**
   * POST /api/caissons/validate
   * Valide une configuration de caisson
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateCaisson(@Body() dto: CalculateCaissonDto) {
    const erreurs: string[] = [];

    // Validation dimensions
    if (dto.hauteur < 200 || dto.hauteur > 2800) {
      erreurs.push('Hauteur doit etre entre 200mm et 2800mm');
    }
    if (dto.largeur < 100 || dto.largeur > 2800) {
      erreurs.push('Largeur doit etre entre 100mm et 2800mm');
    }
    if (dto.profondeur < 100 || dto.profondeur > 2800) {
      erreurs.push('Profondeur doit etre entre 100mm et 2800mm');
    }

    // Validation coherence
    if (dto.largeur <= 2 * dto.epaisseurStructure) {
      erreurs.push("Largeur trop petite par rapport a l'epaisseur");
    }

    // Validation epaisseurs
    if (![16, 18, 19, 22].includes(dto.epaisseurStructure)) {
      erreurs.push('Epaisseur structure invalide (16, 18, 19, 22mm)');
    }
    if (![3, 5, 8, 10].includes(dto.epaisseurFond)) {
      erreurs.push('Epaisseur fond invalide (3, 5, 8, 10mm)');
    }

    return {
      isValid: erreurs.length === 0,
      erreurs,
    };
  }

  // ============================================
  // DRILLING PATTERNS (System 32)
  // ============================================

  /**
   * GET /api/caissons/drilling-patterns
   * Retourne tous les patterns de percage disponibles
   */
  @Get('drilling-patterns')
  getDrillingPatterns(
    @Query('brand') brand?: string,
    @Query('category') category?: string,
  ) {
    if (brand) {
      return findPatternsByBrand(brand);
    }
    if (category) {
      return findPatternsByCategory(category);
    }
    return getAllPatterns();
  }

  /**
   * POST /api/caissons/calculate-drillings
   * Calcule les percages System 32 pour un caisson
   */
  @Post('calculate-drillings')
  @HttpCode(HttpStatus.OK)
  calculateDrillings(
    @Body()
    body: {
      largeur: number;
      hauteur: number;
      profondeur: number;
      epaisseurStructure: number;
      options?: {
        withSystem32?: boolean;
        withConnectors?: boolean;
        withHinges?: boolean;
        hingeType?: string;
        hingePosition?: 'left' | 'right';
        doorHeight?: number;
      };
    },
  ) {
    const panelDrillings = this.system32Service.calculateCabinetDrillings(
      body.largeur,
      body.hauteur,
      body.profondeur,
      body.epaisseurStructure,
      {
        withSystem32: body.options?.withSystem32 ?? true,
        withConnectors: body.options?.withConnectors ?? true,
        withHinges: body.options?.withHinges ?? true,
        hingeType: body.options?.hingeType,
        hingePosition: body.options?.hingePosition,
        doorHeight: body.options?.doorHeight,
      },
    );

    // Statistiques
    const stats = this.system32Service.getDrillingStats(panelDrillings);

    return {
      panels: panelDrillings,
      statistics: {
        totalPanels: panelDrillings.length,
        ...stats,
      },
    };
  }

  // ============================================
  // EXPORT DXF / SVG
  // ============================================

  /**
   * POST /api/caissons/export/dxf
   * Exporte les panneaux d'un caisson en DXF
   */
  @Post('export/dxf')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/dxf')
  @Header('Content-Disposition', 'attachment; filename="caisson.dxf"')
  exportDxf(
    @Body()
    body: {
      largeur: number;
      hauteur: number;
      profondeur: number;
      epaisseurStructure: number;
      epaisseurFond?: number;
      options?: {
        withSystem32?: boolean;
        withConnectors?: boolean;
        withHinges?: boolean;
        hingeType?: string;
        hingePosition?: 'left' | 'right';
        doorHeight?: number;
      };
    },
    @Res() res: Response,
  ) {
    // Calculer les percages
    const panelDrillings = this.system32Service.calculateCabinetDrillings(
      body.largeur,
      body.hauteur,
      body.profondeur,
      body.epaisseurStructure,
      {
        withSystem32: body.options?.withSystem32 ?? true,
        withConnectors: body.options?.withConnectors ?? true,
        withHinges: body.options?.withHinges ?? true,
        hingeType: body.options?.hingeType,
        hingePosition: body.options?.hingePosition,
        doorHeight: body.options?.doorHeight,
      },
    );

    // Generer le DXF
    const dxfContent = this.exportDxfService.exportPanelDrillingsToDxf(panelDrillings);

    res.setHeader('Content-Type', 'application/dxf');
    res.setHeader('Content-Disposition', 'attachment; filename="caisson.dxf"');
    res.send(dxfContent);
  }

  /**
   * POST /api/caissons/export/dxf-json
   * Retourne le DXF en JSON (pour debug/preview)
   */
  @Post('export/dxf-json')
  @HttpCode(HttpStatus.OK)
  exportDxfJson(
    @Body()
    body: {
      largeur: number;
      hauteur: number;
      profondeur: number;
      epaisseurStructure: number;
      options?: {
        withSystem32?: boolean;
        withConnectors?: boolean;
        withHinges?: boolean;
        hingeType?: string;
        hingePosition?: 'left' | 'right';
        doorHeight?: number;
      };
    },
  ) {
    const panelDrillings = this.system32Service.calculateCabinetDrillings(
      body.largeur,
      body.hauteur,
      body.profondeur,
      body.epaisseurStructure,
      body.options,
    );

    const dxfContent = this.exportDxfService.exportPanelDrillingsToDxf(panelDrillings);
    const stats = this.exportDxfService.getExportStats(
      panelDrillings.map((pd) => ({
        panelType: pd.panelType,
        panelName: pd.panelName,
        length: pd.length,
        width: pd.width,
        thickness: body.epaisseurStructure,
        drillings: pd.drillings,
        edges: { A: true, B: false, C: false, D: false },
      })),
    );

    return {
      dxf: dxfContent,
      statistics: stats,
      panels: panelDrillings,
    };
  }

  /**
   * POST /api/caissons/export/svg
   * Genere un SVG pour preview web
   */
  @Post('export/svg')
  @HttpCode(HttpStatus.OK)
  exportSvg(
    @Body()
    body: {
      panelType: string;
      length: number;
      width: number;
      thickness: number;
      drillings: Array<{
        x: number;
        y: number;
        diameter: number;
        depth: number;
        type?: 'blind' | 'through';
        source?: 'system32' | 'hinge' | 'connector' | 'drawer_runner' | 'custom';
      }>;
      edges?: { A?: boolean; B?: boolean; C?: boolean; D?: boolean };
      options?: { width?: number; height?: number };
    },
  ) {
    // Normaliser les drillings pour inclure type et source
    const normalizedDrillings = body.drillings.map((d) => ({
      x: d.x,
      y: d.y,
      diameter: d.diameter,
      depth: d.depth,
      type: d.type || ('blind' as const),
      source: d.source || ('custom' as const),
    }));

    const svg = this.exportDxfService.exportPanelToSvg(
      {
        panelType: body.panelType,
        panelName: body.panelType,
        length: body.length,
        width: body.width,
        thickness: body.thickness,
        drillings: normalizedDrillings,
        edges: {
          A: body.edges?.A ?? false,
          B: body.edges?.B ?? false,
          C: body.edges?.C ?? false,
          D: body.edges?.D ?? false,
        },
      },
      body.options,
    );

    return { svg };
  }

  /**
   * GET /api/caissons/system32-config
   * Retourne la configuration System 32 par defaut
   */
  @Get('system32-config')
  getSystem32Config() {
    return {
      defaults: {
        backEdgeDistance: 37,
        frontEdgeDistance: 37,
        holeSpacing: 32,
        holeDiameter: 5,
        holeDepth: 13,
        firstHoleOffset: 9.5,
      },
      hingePatterns: {
        CLIP_TOP_110: {
          cupDiameter: 35,
          cupDepth: 13,
          screwDistance: 45,
          edgeDistance: 21.5,
        },
        CLIP_TOP_155: {
          cupDiameter: 35,
          cupDepth: 13,
          screwDistance: 45,
          edgeDistance: 21.5,
        },
        SENSYS_110: {
          cupDiameter: 35,
          cupDepth: 13.5,
          screwDistance: 45,
          edgeDistance: 22,
        },
      },
      description:
        'System 32 est le standard international pour le percage des meubles. Les trous sont espaces de 32mm, a 37mm des bords.',
    };
  }
}
