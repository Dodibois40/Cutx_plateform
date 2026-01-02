import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CataloguesModule } from './catalogues/catalogues.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CutxImportModule } from './cutx-import/cutx-import.module';
import { DevisModule } from './devis/devis.module';
import { MulticoucheTemplatesModule } from './multicouche-templates/multicouche-templates.module';
import { CaissonsModule } from './caissons/caissons.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CataloguesModule,
    WebhooksModule,
    CutxImportModule,
    DevisModule,
    MulticoucheTemplatesModule,
    CaissonsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
