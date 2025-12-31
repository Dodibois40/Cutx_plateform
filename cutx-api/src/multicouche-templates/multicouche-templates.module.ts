import { Module } from '@nestjs/common';
import { MulticoucheTemplatesController } from './multicouche-templates.controller';
import { MulticoucheTemplatesService } from './multicouche-templates.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [MulticoucheTemplatesController],
  providers: [MulticoucheTemplatesService],
  exports: [MulticoucheTemplatesService],
})
export class MulticoucheTemplatesModule {}
