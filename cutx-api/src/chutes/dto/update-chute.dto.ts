import { PartialType } from '@nestjs/mapped-types';
import { CreateChuteDto } from './create-chute.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ChuteOfferingStatus } from '@prisma/client';

export class UpdateChuteDto extends PartialType(CreateChuteDto) {
  @IsOptional()
  @IsEnum(ChuteOfferingStatus)
  status?: ChuteOfferingStatus;
}
