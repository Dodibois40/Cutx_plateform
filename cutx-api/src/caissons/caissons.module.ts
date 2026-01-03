// caissons/caissons.module.ts
import { Module } from '@nestjs/common';
import { CaissonsController } from './caissons.controller';
import { CaissonsService } from './caissons.service';
import { System32Service } from './system32.service';
import { ExportDxfService } from './export-dxf.service';

@Module({
  controllers: [CaissonsController],
  providers: [CaissonsService, System32Service, ExportDxfService],
  exports: [CaissonsService, System32Service, ExportDxfService],
})
export class CaissonsModule {}
