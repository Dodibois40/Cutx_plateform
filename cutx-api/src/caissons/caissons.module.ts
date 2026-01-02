// caissons/caissons.module.ts
import { Module } from '@nestjs/common';
import { CaissonsController } from './caissons.controller';
import { CaissonsService } from './caissons.service';

@Module({
  controllers: [CaissonsController],
  providers: [CaissonsService],
  exports: [CaissonsService],
})
export class CaissonsModule {}
