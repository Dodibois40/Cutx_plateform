import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateMulticoucheTemplateDto {
  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  modeCollage: 'fournisseur' | 'client';

  @IsArray()
  couches: CoucheDto[];

  @IsNumber()
  epaisseurTotale: number;

  @IsNumber()
  prixEstimeM2: number;
}

export class CoucheDto {
  @IsString()
  id: string;

  @IsNumber()
  ordre: number;

  @IsString()
  type: string;

  @IsString()
  materiau: string;

  @IsNumber()
  epaisseur: number;

  @IsOptional()
  @IsString()
  sensDuFil?: string;

  @IsOptional()
  @IsString()
  panneauId?: string | null;

  @IsOptional()
  @IsString()
  panneauNom?: string | null;

  @IsOptional()
  @IsString()
  panneauReference?: string | null;

  @IsOptional()
  @IsString()
  panneauImageUrl?: string | null;

  @IsNumber()
  prixPanneauM2: number;
}
