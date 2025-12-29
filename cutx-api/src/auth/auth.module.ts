import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';

@Module({
  imports: [ConfigModule],
  providers: [ClerkAuthGuard],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
