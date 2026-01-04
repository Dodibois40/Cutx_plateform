import { Module } from '@nestjs/common';
import { UsinagesController } from './usinages.controller';
import { UsinagesService } from './usinages.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [UsinagesController],
  providers: [UsinagesService],
  exports: [UsinagesService],
})
export class UsinagesModule {}
