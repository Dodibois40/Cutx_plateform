import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsIn,
  IsEnum,
} from 'class-validator';
import {
  ProductCategory,
  ProductType,
  ProductSubType,
  DecorCategory,
  GrainDirection,
  CoreType,
  CoreColor,
  LamellaType,
} from '@prisma/client';

// Legacy product types (for backward compatibility with old productType field)
const LEGACY_PRODUCT_TYPES = [
  'MELAMINE',
  'STRATIFIE',
  'PLACAGE',
  'BANDE_DE_CHANT',
  'COMPACT',
  'MDF',
  'CONTREPLAQUE',
  'PANNEAU_MASSIF',
  'OSB',
  'PARTICULE',
  'PLAN_DE_TRAVAIL',
  'PANNEAU_DECORATIF',
  'PANNEAU_3_PLIS',
  'SOLID_SURFACE',
  'PANNEAU_SPECIAL',
  'PANNEAU_CONSTRUCTION',
  'PANNEAU_ISOLANT',
  'CIMENT_BOIS',
  'LATTE',
  'PANNEAU_ALVEOLAIRE',
  'ALVEOLAIRE',
  'PVC',
  'SANITAIRE',
  'PORTE',
  'COLLE',
];

const STOCK_STATUSES = ['EN_STOCK', 'SUR_COMMANDE', 'RUPTURE'];

export class UpdatePanelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Legacy field (backward compatibility)
  @IsOptional()
  @IsString()
  @IsIn(LEGACY_PRODUCT_TYPES)
  productType?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  thickness?: number[];

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(500)
  defaultThickness?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6000)
  defaultLength?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3000)
  defaultWidth?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerM2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerMl?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerPanel?: number;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  finish?: string;

  @IsOptional()
  @IsString()
  colorCode?: string;

  @IsOptional()
  @IsString()
  colorChoice?: string;

  @IsOptional()
  @IsString()
  decor?: string;

  @IsOptional()
  @IsString()
  manufacturerRef?: string;

  @IsOptional()
  @IsString()
  supplierCode?: string;

  @IsOptional()
  @IsString()
  @IsIn(STOCK_STATUSES)
  stockStatus?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVariableLength?: boolean;

  @IsOptional()
  @IsString()
  certification?: string;

  @IsOptional()
  @IsString()
  supportQuality?: string;

  // ===== NOUVELLE CLASSIFICATION CutX =====

  // Catégorie produit (PANNEAU vs ACCESSOIRE)
  @IsOptional()
  @IsEnum(ProductCategory)
  productCategory?: ProductCategory;

  // Type de produit (enum)
  @IsOptional()
  @IsEnum(ProductType)
  panelType?: ProductType;

  @IsOptional()
  @IsEnum(ProductSubType)
  panelSubType?: ProductSubType;

  // Décor
  @IsOptional()
  @IsString()
  decorCode?: string;

  @IsOptional()
  @IsString()
  decorName?: string;

  @IsOptional()
  @IsEnum(DecorCategory)
  decorCategory?: DecorCategory;

  @IsOptional()
  @IsString()
  decorSubCategory?: string;

  // Fabricant
  @IsOptional()
  @IsString()
  manufacturer?: string;

  // Sens du fil
  @IsOptional()
  @IsEnum(GrainDirection)
  grainDirection?: GrainDirection;

  // Support/Âme
  @IsOptional()
  @IsEnum(CoreType)
  coreType?: CoreType;

  @IsOptional()
  @IsEnum(CoreColor)
  coreColor?: CoreColor;

  // Finition surface
  @IsOptional()
  @IsString()
  finishCode?: string;

  @IsOptional()
  @IsString()
  finishName?: string;

  @IsOptional()
  @IsBoolean()
  isSynchronized?: boolean;

  // Attributs techniques
  @IsOptional()
  @IsBoolean()
  isHydrofuge?: boolean;

  @IsOptional()
  @IsBoolean()
  isIgnifuge?: boolean;

  @IsOptional()
  @IsBoolean()
  isPreglued?: boolean;

  @IsOptional()
  @IsBoolean()
  isFullRoll?: boolean;  // Vente en rouleau complet (pas au mètre)

  // Type de lamelles (pour panneaux massifs)
  @IsOptional()
  @IsEnum(LamellaType)
  lamellaType?: LamellaType;
}

export class MarkCorrectionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
