// caissons/dto/create-caisson.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export enum TypeCaisson {
  BAS_CUISINE = 'bas_cuisine',
  HAUT_CUISINE = 'haut_cuisine',
  COLONNE = 'colonne',
  TIROIR = 'tiroir',
  CUSTOM = 'custom',
}

export enum TypeFond {
  APPLIQUE = 'applique',
  ENCASTRE = 'encastre',
  FEUILLURE = 'feuillure',
  RAINURE = 'rainure',
}

export enum TypeFacade {
  APPLIQUE = 'applique',
  ENCASTRE = 'encastre',
}

export enum PositionCharniere {
  GAUCHE = 'gauche',
  DROITE = 'droite',
}

export enum MarqueCharniere {
  BLUM = 'blum',
  HETTICH = 'hettich',
  GRASS = 'grass',
  HAFELE = 'hafele',
}

export enum TypeCharniere {
  A_VISSER = 'a_visser',
  INSERTA = 'inserta',
}

export class CreateCaissonDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsString()
  nom: string;

  @IsEnum(TypeCaisson)
  typeCaisson: TypeCaisson;

  // Dimensions
  @IsNumber()
  @Min(200)
  @Max(2800)
  hauteur: number;

  @IsNumber()
  @Min(100)
  @Max(2800)
  largeur: number;

  @IsNumber()
  @Min(100)
  @Max(2800)
  profondeur: number;

  // Epaisseurs
  @IsNumber()
  epaisseurStructure: number;

  @IsNumber()
  epaisseurFond: number;

  @IsNumber()
  epaisseurFacade: number;

  // Panneaux (IDs du catalogue)
  @IsOptional()
  @IsString()
  panneauStructureId?: string;

  @IsOptional()
  @IsString()
  panneauFondId?: string;

  @IsOptional()
  @IsString()
  panneauFacadeId?: string;

  // Configuration fond
  @IsEnum(TypeFond)
  typeFond: TypeFond;

  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(15)
  profondeurRainure?: number;

  // Configuration facade
  @IsEnum(TypeFacade)
  typeFacade: TypeFacade;

  @IsNumber()
  @Min(1)
  @Max(5)
  jeuFacade: number;

  // Charnieres
  @IsBoolean()
  avecFacade: boolean;

  @IsEnum(PositionCharniere)
  positionCharniere: PositionCharniere;

  @IsEnum(MarqueCharniere)
  marqueCharniere: MarqueCharniere;

  @IsEnum(TypeCharniere)
  typeCharniere: TypeCharniere;

  @IsNumber()
  angleCharniere: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(6)
  nombreCharnieres?: number;
}
