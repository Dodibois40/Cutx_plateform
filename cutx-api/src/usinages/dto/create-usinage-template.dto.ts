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

/**
 * Parametre de configuration d'un usinage
 */
export class ConfigParameterDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsString()
  unit: string;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsNumber()
  defaultValue?: number;
}

/**
 * DTO pour creer un template d'usinage
 */
export class CreateUsinageTemplateDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  iconSvg: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigParameterDto)
  configSchema: ConfigParameterDto[];

  @IsOptional()
  @IsString()
  technicalSvg?: string;

  @IsEnum(['PER_UNIT', 'PER_METER', 'PER_M2', 'FIXED'])
  pricingType: 'PER_UNIT' | 'PER_METER' | 'PER_M2' | 'FIXED';

  @IsNumber()
  @Min(0)
  priceHT: number;

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
