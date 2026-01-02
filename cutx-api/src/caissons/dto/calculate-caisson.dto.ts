// caissons/dto/calculate-caisson.dto.ts
import {
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { TypeFond, TypeFacade } from './create-caisson.dto';

/**
 * DTO pour calculer les dimensions des panneaux d'un caisson
 * Ne necessite pas de panneau selectionne, juste les dimensions
 */
export class CalculateCaissonDto {
  // Dimensions globales
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

  // Configuration fond
  @IsEnum(TypeFond)
  typeFond: TypeFond;

  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(15)
  profondeurRainure?: number;

  // Configuration facade
  @IsBoolean()
  avecFacade: boolean;

  @IsOptional()
  @IsEnum(TypeFacade)
  typeFacade?: TypeFacade;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  jeuFacade?: number;
}

/**
 * Reponse du calcul
 */
export class PanneauCalculeResponse {
  nom: string;
  type: string;
  longueur: number;
  largeur: number;
  epaisseur: number;
  quantite: number;
  surfaceM2: number;
  chants: {
    A: boolean;
    B: boolean;
    C: boolean;
    D: boolean;
  };
  metresLineairesChants: number;
}

export class CalculateCaissonResponse {
  panneaux: PanneauCalculeResponse[];
  surfaceTotaleM2: number;
  metresLineairesTotaux: number;
  nombrePanneaux: number;
  nombreCharnieres: number;
}
