import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ChuteCondition, ProductType, BoostLevel } from '@prisma/client';

export class CreateChuteDto {
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ProductType)
  productType: ProductType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  material?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  thickness: number; // mm

  @IsNumber()
  @Min(50)
  @Max(5000)
  length: number; // mm

  @IsNumber()
  @Min(50)
  @Max(3000)
  width: number; // mm

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsEnum(ChuteCondition)
  condition: ChuteCondition;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificationChecks?: string[];

  @IsNumber()
  @Min(1)
  @Max(10000)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPanelPrice?: number;

  @IsOptional()
  @IsBoolean()
  acceptsOffers?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumOffer?: number;

  @IsOptional()
  @IsEnum(BoostLevel)
  boostLevel?: BoostLevel;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5)
  postalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  departement?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  useCatalogImage?: boolean;

  @IsOptional()
  @IsString()
  catalogPanelId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
