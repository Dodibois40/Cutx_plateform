import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// =============================================================================
// DIMENSIONS DTO
// =============================================================================

export class DimensionsDto {
  @ApiProperty({ description: 'Longueur en mm', example: 800 })
  @IsNumber()
  @Min(1)
  length: number;

  @ApiProperty({ description: 'Largeur en mm', example: 600 })
  @IsNumber()
  @Min(1)
  width: number;
}

// =============================================================================
// EXPANSION DTO
// =============================================================================

export class ExpansionDto {
  @ApiPropertyOptional({ description: 'Surcote longueur en mm', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number = 0;

  @ApiPropertyOptional({ description: 'Surcote largeur en mm', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number = 0;
}

// =============================================================================
// EDGING DTO
// =============================================================================

export class EdgingDto {
  @ApiPropertyOptional({ description: 'Reference chant haut' })
  @IsOptional()
  @IsString()
  top?: string | null;

  @ApiPropertyOptional({ description: 'Reference chant bas' })
  @IsOptional()
  @IsString()
  bottom?: string | null;

  @ApiPropertyOptional({ description: 'Reference chant gauche' })
  @IsOptional()
  @IsString()
  left?: string | null;

  @ApiPropertyOptional({ description: 'Reference chant droite' })
  @IsOptional()
  @IsString()
  right?: string | null;
}

// =============================================================================
// CUTTING PIECE DTO
// =============================================================================

export class CuttingPieceDto {
  @ApiProperty({ description: 'ID unique de la piece', example: 'piece-1' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nom de la piece', example: 'Fond caisson' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Dimensions finies', type: DimensionsDto })
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions: DimensionsDto;

  @ApiProperty({ description: 'Quantite', example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({ description: 'La piece a un sens de fil', default: false })
  @IsOptional()
  @IsBoolean()
  hasGrain?: boolean = false;

  @ApiPropertyOptional({ description: 'Direction du fil', enum: ['length', 'width'] })
  @IsOptional()
  @IsString()
  grainDirection?: 'length' | 'width';

  @ApiPropertyOptional({ description: 'Rotation autorisee', default: true })
  @IsOptional()
  @IsBoolean()
  canRotate?: boolean = true;

  @ApiPropertyOptional({ description: 'Surcotes', type: ExpansionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExpansionDto)
  expansion?: ExpansionDto;

  @ApiPropertyOptional({ description: 'Chants', type: EdgingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EdgingDto)
  edging?: EdgingDto;

  @ApiPropertyOptional({ description: 'ID du groupe' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Priorite de placement' })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

// =============================================================================
// TRIM DTO
// =============================================================================

export class TrimDto {
  @ApiPropertyOptional({ description: 'Marge haut en mm', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  top?: number = 0;

  @ApiPropertyOptional({ description: 'Marge gauche en mm', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  left?: number = 0;

  @ApiPropertyOptional({ description: 'Marge bas en mm', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bottom?: number = 0;

  @ApiPropertyOptional({ description: 'Marge droite en mm', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  right?: number = 0;
}

// =============================================================================
// SOURCE SHEET DTO
// =============================================================================

export class SourceSheetDto {
  @ApiProperty({ description: 'ID unique du panneau', example: 'sheet-1' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Reference materiau', example: 'H1180' })
  @IsString()
  materialRef: string;

  @ApiProperty({ description: 'Nom materiau', example: 'Melamine Blanc' })
  @IsString()
  materialName: string;

  @ApiProperty({ description: 'Dimensions brutes', type: DimensionsDto })
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions: DimensionsDto;

  @ApiProperty({ description: 'Epaisseur en mm', example: 18 })
  @IsNumber()
  @Min(1)
  thickness: number;

  @ApiPropertyOptional({ description: 'Marges a retirer', type: TrimDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrimDto)
  trim?: TrimDto;

  @ApiPropertyOptional({ description: 'Le panneau a un sens de fil', default: false })
  @IsOptional()
  @IsBoolean()
  hasGrain?: boolean = false;

  @ApiPropertyOptional({ description: 'Direction du fil', enum: ['length', 'width'] })
  @IsOptional()
  @IsString()
  grainDirection?: 'length' | 'width';

  @ApiPropertyOptional({ description: 'Prix par panneau' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerSheet?: number;

  @ApiPropertyOptional({ description: 'Prix au m2' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerM2?: number;

  @ApiPropertyOptional({ description: 'Quantite disponible' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional({ description: 'Est une chute', default: false })
  @IsOptional()
  @IsBoolean()
  isOffcut?: boolean = false;
}

// =============================================================================
// OPTIMIZATION PARAMS DTO
// =============================================================================

export class OptimizationParamsDto {
  @ApiPropertyOptional({ description: 'Epaisseur trait de scie (mm)', default: 4 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bladeWidth?: number = 4;

  @ApiPropertyOptional({
    description: 'Type optimisation',
    enum: ['minimize_waste', 'minimize_sheets', 'minimize_cuts'],
    default: 'minimize_waste',
  })
  @IsOptional()
  @IsString()
  optimizationType?: 'minimize_waste' | 'minimize_sheets' | 'minimize_cuts' =
    'minimize_waste';

  @ApiPropertyOptional({
    description: 'Strategie de tri',
    enum: ['area_desc', 'perimeter_desc', 'max_side_desc', 'width_desc', 'height_desc'],
    default: 'area_desc',
  })
  @IsOptional()
  @IsString()
  sortingStrategy?:
    | 'area_desc'
    | 'perimeter_desc'
    | 'max_side_desc'
    | 'width_desc'
    | 'height_desc' = 'area_desc';

  @ApiPropertyOptional({
    description: 'Heuristique de placement',
    enum: ['best_area_fit', 'best_short_side_fit', 'best_long_side_fit', 'bottom_left'],
    default: 'best_area_fit',
  })
  @IsOptional()
  @IsString()
  placementHeuristic?:
    | 'best_area_fit'
    | 'best_short_side_fit'
    | 'best_long_side_fit'
    | 'bottom_left' = 'best_area_fit';

  @ApiPropertyOptional({
    description: 'Strategie de split',
    enum: ['horizontal_first', 'vertical_first', 'shorter_leftover', 'longer_leftover', 'min_area'],
    default: 'shorter_leftover',
  })
  @IsOptional()
  @IsString()
  splitStrategy?:
    | 'horizontal_first'
    | 'vertical_first'
    | 'shorter_leftover'
    | 'longer_leftover'
    | 'min_area' = 'shorter_leftover';

  @ApiPropertyOptional({ description: 'Nombre iterations max', default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxIterations?: number = 3;

  @ApiPropertyOptional({ description: 'Timeout en ms', default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeoutMs?: number = 30000;

  @ApiPropertyOptional({ description: 'Reutiliser les chutes', default: false })
  @IsOptional()
  @IsBoolean()
  reuseOffcuts?: boolean = false;

  @ApiPropertyOptional({ description: 'Longueur min chute a garder (mm)', default: 300 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOffcutLength?: number = 300;

  @ApiPropertyOptional({ description: 'Largeur min chute a garder (mm)', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOffcutWidth?: number = 100;

  @ApiPropertyOptional({ description: 'Forcer respect du fil', default: true })
  @IsOptional()
  @IsBoolean()
  forceGrainMatch?: boolean = true;

  @ApiPropertyOptional({ description: 'Autoriser rotation', default: true })
  @IsOptional()
  @IsBoolean()
  allowRotation?: boolean = true;

  @ApiPropertyOptional({ description: 'Grouper par materiau', default: true })
  @IsOptional()
  @IsBoolean()
  groupByMaterial?: boolean = true;

  @ApiPropertyOptional({ description: 'Grouper par epaisseur', default: true })
  @IsOptional()
  @IsBoolean()
  groupByThickness?: boolean = true;

  @ApiPropertyOptional({ description: 'Grouper par chants', default: false })
  @IsOptional()
  @IsBoolean()
  groupByEdging?: boolean = false;
}

// =============================================================================
// OPTIMIZATION REQUEST DTO
// =============================================================================

export class OptimizationRequestDto {
  @ApiProperty({
    description: 'Liste des pieces a placer',
    type: [CuttingPieceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CuttingPieceDto)
  pieces: CuttingPieceDto[];

  @ApiProperty({
    description: 'Liste des panneaux source disponibles',
    type: [SourceSheetDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceSheetDto)
  sheets: SourceSheetDto[];

  @ApiPropertyOptional({
    description: 'Parametres d\'optimisation',
    type: OptimizationParamsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OptimizationParamsDto)
  params?: OptimizationParamsDto;

  @ApiPropertyOptional({
    description: 'Utiliser plusieurs iterations avec differentes strategies',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  useIterations?: boolean = true;

  @ApiPropertyOptional({
    description: 'Utiliser smartOptimize (compare tous les algorithmes)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  useSmartOptimize?: boolean = false;
}
