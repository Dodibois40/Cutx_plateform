import { Module } from '@nestjs/common';
import { TubeController } from './tube.controller';
import { TubeService } from './tube.service';

@Module({
  controllers: [TubeController],
  providers: [TubeService],
  exports: [TubeService],
})
export class TubeModule {}
