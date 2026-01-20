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
import { OptimizationModule } from './optimization/optimization.module';
import { PanelsReviewModule } from './panels-review/panels-review.module';
import { PanelsModule } from './panels/panels.module';
import { TubeModule } from './tube/tube.module';
import { R2StorageModule } from './r2-storage/r2-storage.module';
import { ChutesModule } from './chutes/chutes.module';

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
    OptimizationModule,
    PanelsReviewModule,
    PanelsModule,
    TubeModule,
    R2StorageModule,
    ChutesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
