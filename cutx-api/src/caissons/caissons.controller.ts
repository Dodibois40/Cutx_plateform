// caissons/caissons.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { CaissonsService } from './caissons.service';
import { CalculateCaissonDto } from './dto/calculate-caisson.dto';

@Controller('caissons')
export class CaissonsController {
  constructor(private readonly caissonsService: CaissonsService) {}

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
}
