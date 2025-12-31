import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import type { CoucheDto } from './create-template.dto';

export class UpdateMulticoucheTemplateDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  modeCollage?: 'fournisseur' | 'client';

  @IsOptional()
  @IsArray()
  couches?: CoucheDto[];

  @IsOptional()
  @IsNumber()
  epaisseurTotale?: number;

  @IsOptional()
  @IsNumber()
  prixEstimeM2?: number;
}
