import { Module } from '@nestjs/common';
import { PanelsReviewController } from './panels-review.controller';
import { PanelsReviewService } from './panels-review.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [PanelsReviewController],
  providers: [PanelsReviewService],
  exports: [PanelsReviewService],
})
export class PanelsReviewModule {}
