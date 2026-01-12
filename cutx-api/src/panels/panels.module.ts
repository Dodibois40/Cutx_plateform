import { Module } from '@nestjs/common';
import { PanelsController } from './panels.controller';
import { PanelsService } from './panels.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PanelsController],
  providers: [PanelsService],
  exports: [PanelsService],
})
export class PanelsModule {}
