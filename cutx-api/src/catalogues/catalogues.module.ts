import { Module, forwardRef } from '@nestjs/common';
import { CataloguesController } from './catalogues.controller';
import { CataloguesService } from './catalogues.service';
import { PanelImportService } from './services/panel-import.service';
import {
  SearchService,
  AutocompleteService,
  FacetsService,
  FiltersService,
  ViewTrackingService,
  SmartSearchService,
} from './services';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [CataloguesController],
  providers: [
    CataloguesService,
    PanelImportService,
    SearchService,
    AutocompleteService,
    FacetsService,
    FiltersService,
    ViewTrackingService,
    SmartSearchService,
  ],
  exports: [CataloguesService, PanelImportService],
})
export class CataloguesModule {}
