import { Module } from '@nestjs/common';
import { OptimizationController } from './optimization.controller';
import { OptimizationService } from './optimization.service';
import { OptimizationShareService } from './optimization-share.service';

@Module({
  controllers: [OptimizationController],
  providers: [OptimizationService, OptimizationShareService],
  exports: [OptimizationService, OptimizationShareService],
})
export class OptimizationModule {}
