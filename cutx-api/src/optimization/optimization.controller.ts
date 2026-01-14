import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OptimizationService } from './optimization.service';
import { OptimizationShareService } from './optimization-share.service';
import { OptimizationRequestDto } from './dto/optimization.dto';
import {
  ShareOptimizationRequestDto,
  ShareOptimizationResponseDto,
  GetSharedOptimizationResponseDto,
} from './dto/share.dto';
import { OptimizationError, CuttingPiece, SourceSheet } from './types/cutting.types';

@ApiTags('optimization')
@Controller('optimization')
export class OptimizationController {
  constructor(
    private readonly optimizationService: OptimizationService,
    private readonly shareService: OptimizationShareService,
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculer un plan de decoupe optimise',
    description:
      'Prend une liste de pieces et de panneaux et retourne un plan de decoupe optimise',
  })
  @ApiResponse({
    status: 200,
    description: 'Plan de decoupe calcule avec succes',
  })
  @ApiResponse({
    status: 400,
    description: 'Erreur de validation ou d\'optimisation',
  })
  async calculate(@Body() request: OptimizationRequestDto) {
    try {
      // Convertir les DTOs en types internes
      const pieces: CuttingPiece[] = request.pieces.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        dimensions: p.dimensions,
        quantity: p.quantity || 1,
        hasGrain: p.hasGrain || false,
        grainDirection: p.grainDirection,
        canRotate: p.canRotate ?? true,
        expansion: {
          length: p.expansion?.length || 0,
          width: p.expansion?.width || 0,
        },
        edging: p.edging,
        groupId: p.groupId,
        priority: p.priority,
      }));

      const sheets: SourceSheet[] = request.sheets.map((s) => ({
        id: s.id,
        materialRef: s.materialRef,
        materialName: s.materialName,
        dimensions: s.dimensions,
        thickness: s.thickness,
        trim: {
          top: s.trim?.top || 0,
          left: s.trim?.left || 0,
          bottom: s.trim?.bottom || 0,
          right: s.trim?.right || 0,
        },
        hasGrain: s.hasGrain || false,
        grainDirection: s.grainDirection,
        pricePerSheet: s.pricePerSheet,
        pricePerM2: s.pricePerM2,
        availableQuantity: s.availableQuantity,
        isOffcut: s.isOffcut || false,
      }));

      const result = await this.optimizationService.optimize({
        pieces,
        sheets,
        params: request.params,
        useIterations: request.useIterations ?? true,
        useSmartOptimize: request.useSmartOptimize ?? false,
      });

      return {
        success: result.success,
        message: result.message,
        warnings: result.warnings,
        plan: result.plan,
        reusableOffcuts: result.reusableOffcuts,
      };
    } catch (error) {
      if (error instanceof OptimizationError) {
        // Pass the message directly to ensure it's properly returned
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('params/default')
  @ApiOperation({
    summary: 'Obtenir les parametres par defaut',
    description: 'Retourne les parametres d\'optimisation par defaut',
  })
  getDefaultParams() {
    return this.optimizationService.getDefaultParams();
  }

  @Post('report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generer un rapport texte',
    description: 'Genere un rapport texte a partir d\'un plan de decoupe',
  })
  generateReport(@Body() plan: any) {
    return {
      report: this.optimizationService.generateTextReport(plan),
    };
  }

  @Post('demo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demo avec des donnees de test',
    description: 'Execute une optimisation avec des donnees de demonstration',
  })
  async demo() {
    // Pieces de demo (un caisson simple)
    const pieces: CuttingPiece[] = [
      {
        id: 'fond',
        name: 'Fond',
        dimensions: { length: 800, width: 600 },
        quantity: 1,
        hasGrain: false,
        canRotate: true,
        expansion: { length: 0, width: 0 },
      },
      {
        id: 'cote-gauche',
        name: 'Cote gauche',
        dimensions: { length: 600, width: 350 },
        quantity: 1,
        hasGrain: false,
        canRotate: true,
        expansion: { length: 0, width: 0 },
      },
      {
        id: 'cote-droit',
        name: 'Cote droit',
        dimensions: { length: 600, width: 350 },
        quantity: 1,
        hasGrain: false,
        canRotate: true,
        expansion: { length: 0, width: 0 },
      },
      {
        id: 'dessus',
        name: 'Dessus',
        dimensions: { length: 800, width: 350 },
        quantity: 1,
        hasGrain: false,
        canRotate: true,
        expansion: { length: 0, width: 0 },
      },
      {
        id: 'dessous',
        name: 'Dessous',
        dimensions: { length: 800, width: 350 },
        quantity: 1,
        hasGrain: false,
        canRotate: true,
        expansion: { length: 0, width: 0 },
      },
      {
        id: 'etagere-1',
        name: 'Etagere 1',
        dimensions: { length: 764, width: 330 },
        quantity: 2,
        hasGrain: false,
        canRotate: true,
        expansion: { length: 0, width: 0 },
      },
      {
        id: 'porte',
        name: 'Porte',
        dimensions: { length: 596, width: 396 },
        quantity: 2,
        hasGrain: true,
        grainDirection: 'length',
        canRotate: false,
        expansion: { length: 0, width: 0 },
      },
    ];

    // Panneau standard
    const sheets: SourceSheet[] = [
      {
        id: 'melamine-blanc',
        materialRef: 'MEL-BLANC-18',
        materialName: 'Melamine Blanc 18mm',
        dimensions: { length: 2800, width: 2070 },
        thickness: 18,
        trim: { top: 0, left: 0, bottom: 0, right: 0 },
        hasGrain: false,
        pricePerM2: 25,
      },
    ];

    const result = await this.optimizationService.optimize({
      pieces,
      sheets,
      useIterations: true,
    });

    return {
      success: result.success,
      message: result.message,
      plan: result.plan,
      textReport: this.optimizationService.generateTextReport(result.plan),
    };
  }

  // =============================================================================
  // PARTAGE MOBILE
  // =============================================================================

  @Post('share')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Partager une optimisation pour mobile',
    description: 'Stocke temporairement une optimisation et retourne un ID de partage (valide 24h)',
  })
  @ApiResponse({
    status: 201,
    description: 'Partage cree',
    type: ShareOptimizationResponseDto,
  })
  createShare(@Body() data: ShareOptimizationRequestDto): ShareOptimizationResponseDto {
    const { shareId, expiresAt } = this.shareService.create(data);

    // Construire l'URL frontend (sera configurable)
    const baseUrl = process.env.FRONTEND_URL || 'https://cutx.app';
    const shareUrl = `${baseUrl}/atelier/${shareId}`;

    return {
      shareId,
      shareUrl,
      expiresAt,
    };
  }

  @Get('share/:shareId')
  @ApiOperation({
    summary: 'Recuperer une optimisation partagee',
    description: 'Retourne les donnees d\'une optimisation partagee par son ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Donnees du partage',
    type: GetSharedOptimizationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Partage non trouve ou expire',
  })
  getShare(@Param('shareId') shareId: string): GetSharedOptimizationResponseDto {
    const stored = this.shareService.get(shareId);

    return {
      data: stored.data,
      createdAt: stored.createdAt,
      expiresAt: stored.expiresAt,
    };
  }
}
