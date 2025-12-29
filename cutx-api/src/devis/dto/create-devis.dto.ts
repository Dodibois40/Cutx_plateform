import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDevisLineDto {
  @IsString()
  panelReference: string;

  @IsString()
  panelName: string;

  @IsNumber()
  @Min(1)
  thickness: number;

  @IsNumber()
  @Min(1)
  length: number;

  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  chantHaut?: string;

  @IsOptional()
  @IsString()
  chantBas?: string;

  @IsOptional()
  @IsString()
  chantGauche?: string;

  @IsOptional()
  @IsString()
  chantDroit?: string;

  @IsNumber()
  @Min(0)
  unitPriceHT: number;

  @IsNumber()
  @Min(0)
  totalHT: number;

  @IsOptional()
  @IsString()
  panelId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class CreateDevisDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  clientAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tvaRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDevisLineDto)
  lines?: CreateDevisLineDto[];
}
