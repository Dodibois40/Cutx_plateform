import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigParameterDto } from './create-usinage-template.dto';

/**
 * DTO pour mettre a jour un template d'usinage
 * Tous les champs sont optionnels
 */
export class UpdateUsinageTemplateDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  iconSvg?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigParameterDto)
  configSchema?: ConfigParameterDto[];

  @IsOptional()
  @IsString()
  technicalSvg?: string;

  @IsOptional()
  @IsEnum(['PER_UNIT', 'PER_METER', 'PER_M2', 'FIXED'])
  pricingType?: 'PER_UNIT' | 'PER_METER' | 'PER_M2' | 'FIXED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceHT?: number;

  @IsOptional()
  @IsEnum(['RAINURE', 'PERCAGE', 'USINAGE_CN', 'DEFONCEUSE', 'PASSE_MAIN', 'AUTRE'])
  category?: 'RAINURE' | 'PERCAGE' | 'USINAGE_CN' | 'DEFONCEUSE' | 'PASSE_MAIN' | 'AUTRE';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
