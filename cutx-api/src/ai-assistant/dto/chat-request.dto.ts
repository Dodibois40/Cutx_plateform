import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class ClassifyQueryDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}

export class GenerateConfigDto {
  @IsNotEmpty()
  recommendation: {
    panels: Array<{
      role: string;
      productType: string;
      criteria: {
        keywords: string[];
        thickness?: number;
        hydro?: boolean;
      };
      quantity?: number;
    }>;
    debits: Array<{
      panelRole: string;
      reference: string;
      longueur: number;
      largeur: number;
      quantity: number;
      chants: { A: boolean; B: boolean; C: boolean; D: boolean };
    }>;
  };

  @IsOptional()
  @IsString()
  conversationId?: string;
}
