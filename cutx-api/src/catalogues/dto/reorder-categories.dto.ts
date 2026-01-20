import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryReorderItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @Min(0)
  sortOrder: number;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

export class ReorderCategoriesDto {
  @IsArray()
  @ArrayMaxSize(500) // Limite pour éviter DoS
  @ValidateNested({ each: true })
  @Type(() => CategoryReorderItemDto)
  updates: CategoryReorderItemDto[];
}
