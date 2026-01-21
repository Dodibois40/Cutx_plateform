import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  Min,
  ValidateIf,
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
  @ValidateIf((o) => o.parentId !== null)
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
