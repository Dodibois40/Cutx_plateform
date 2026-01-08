import { Module } from '@nestjs/common';
import { CataloguesController } from './catalogues.controller';
import { CataloguesService } from './catalogues.service';
import { PanelImportService } from './services/panel-import.service';

@Module({
  controllers: [CataloguesController],
  providers: [CataloguesService, PanelImportService],
  exports: [CataloguesService, PanelImportService],
})
export class CataloguesModule {}
