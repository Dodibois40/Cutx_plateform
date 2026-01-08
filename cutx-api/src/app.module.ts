import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
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
import { UsinagesModule } from './usinages/usinages.module';
import { AIAssistantModule } from './ai-assistant/ai-assistant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Cache global avec TTL de 5 minutes par défaut
    CacheModule.register({
      isGlobal: true,
      ttl: 300000, // 5 minutes en millisecondes
      max: 100, // Maximum 100 entrées en cache
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
    UsinagesModule,
    AIAssistantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
