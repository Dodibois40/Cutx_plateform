import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ChuteCondition, ProductType, ChuteOfferingStatus } from '@prisma/client';

export class SearchChutesDto {
  // Recherche texte
  @IsOptional()
  @IsString()
  q?: string;

  // Filtres produit
  @IsOptional()
  @IsArray()
  @IsEnum(ProductType, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  productTypes?: ProductType[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  thicknessMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(100)
  thicknessMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lengthMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(5000)
  lengthMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  widthMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(3000)
  widthMax?: number;

  // Filtres état
  @IsOptional()
  @IsArray()
  @IsEnum(ChuteCondition, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  conditions?: ChuteCondition[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  certifiedOnly?: boolean;

  // Filtres prix
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(10000)
  priceMax?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  acceptsOffersOnly?: boolean;

  // Filtres localisation
  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  departement?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radius?: number; // km

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userLng?: number;

  // Filtres vendeur
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifiedSellersOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minSellerRating?: number;

  // Filtres catégorie
  @IsOptional()
  @IsString()
  categoryId?: string;

  // Statut (pour le vendeur)
  @IsOptional()
  @IsArray()
  @IsEnum(ChuteOfferingStatus, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  statuses?: ChuteOfferingStatus[];

  // Tri
  @IsOptional()
  @IsEnum(['price_asc', 'price_desc', 'date_desc', 'date_asc', 'distance', 'popularity', 'boost'])
  sortBy?: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'distance' | 'popularity' | 'boost';

  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  // Inclure les facettes
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeFacets?: boolean;
}
