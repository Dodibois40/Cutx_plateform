import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// =============================================================================
// SHARE OPTIMIZATION DTOs
// =============================================================================

export class SharePlacementDto {
  @ApiProperty({ description: 'ID de la piece' })
  @IsString()
  pieceId: string;

  @ApiProperty({ description: 'Nom de la piece' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Position X en mm' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Position Y en mm' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Longueur en mm' })
  @IsNumber()
  length: number;

  @ApiProperty({ description: 'Largeur en mm' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Piece rotee' })
  @IsOptional()
  rotated?: boolean;

  @ApiPropertyOptional({ description: 'Chants' })
  @IsOptional()
  @IsObject()
  edging?: {
    top?: string | null;
    bottom?: string | null;
    left?: string | null;
    right?: string | null;
  };
}

export class ShareFreeSpaceDto {
  @ApiProperty({ description: 'ID de la zone' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Position X' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Position Y' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Longueur' })
  @IsNumber()
  length: number;

  @ApiProperty({ description: 'Largeur' })
  @IsNumber()
  width: number;
}

export class ShareSheetDto {
  @ApiProperty({ description: 'Index du panneau (1, 2, 3...)' })
  @IsNumber()
  index: number;

  @ApiProperty({ description: 'Reference materiau' })
  @IsString()
  materialRef: string;

  @ApiProperty({ description: 'Nom materiau' })
  @IsString()
  materialName: string;

  @ApiProperty({ description: 'Longueur panneau' })
  @IsNumber()
  length: number;

  @ApiProperty({ description: 'Largeur panneau' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Epaisseur' })
  @IsNumber()
  thickness: number;

  @ApiProperty({ description: 'Placements des pieces', type: [SharePlacementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SharePlacementDto)
  placements: SharePlacementDto[];

  @ApiPropertyOptional({ description: 'Zones libres', type: [ShareFreeSpaceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShareFreeSpaceDto)
  freeSpaces?: ShareFreeSpaceDto[];

  @ApiProperty({ description: 'Taux de remplissage (0-100)' })
  @IsNumber()
  efficiency: number;

  @ApiPropertyOptional({ description: 'Surface utilisee en m2' })
  @IsOptional()
  @IsNumber()
  usedArea?: number;

  @ApiPropertyOptional({ description: 'Surface chute en m2' })
  @IsOptional()
  @IsNumber()
  wasteArea?: number;
}

export class ShareOptimizationRequestDto {
  @ApiProperty({ description: 'Panneaux optimises', type: [ShareSheetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShareSheetDto)
  sheets: ShareSheetDto[];

  @ApiPropertyOptional({ description: 'Nom du projet' })
  @IsOptional()
  @IsString()
  projectName?: string;

  @ApiPropertyOptional({ description: 'Statistiques globales' })
  @IsOptional()
  @IsObject()
  stats?: {
    totalPieces: number;
    totalSheets: number;
    globalEfficiency: number;
  };
}

export class ShareOptimizationResponseDto {
  @ApiProperty({ description: 'ID de partage unique' })
  shareId: string;

  @ApiProperty({ description: 'URL complete pour mobile' })
  shareUrl: string;

  @ApiProperty({ description: 'Date expiration' })
  expiresAt: Date;
}

export class GetSharedOptimizationResponseDto {
  @ApiProperty({ description: 'Donnees partagees' })
  data: ShareOptimizationRequestDto;

  @ApiProperty({ description: 'Date de creation' })
  createdAt: Date;

  @ApiProperty({ description: 'Date expiration' })
  expiresAt: Date;
}
