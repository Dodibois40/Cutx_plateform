import { Module } from '@nestjs/common';
import { ChutesController } from './chutes.controller';
import { ChutesService } from './chutes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChutesController],
  providers: [ChutesService],
  exports: [ChutesService],
})
export class ChutesModule {}
